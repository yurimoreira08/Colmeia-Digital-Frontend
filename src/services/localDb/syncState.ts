/**
 * Estado do sync no aparelho: pendências (synced = 0), troca do id local pelo do servidor e exclusões feitas offline.
 */
import { Platform } from 'react-native';
import { getLocalDb } from './database';

export async function hasUnsyncedRecords(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const db = await getLocalDb();

  const tables = ['apiaries', 'boxes', 'review_reports', 'manejos', 'notifications'];
  for (const table of tables) {
    const unsynced = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} WHERE synced = 0;`);
    if (unsynced && unsynced.count > 0) return true;
  }

  const deletions = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_deletions;');
  return Boolean(deletions && deletions.count > 0);
}

export async function getUnsyncedCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const db = await getLocalDb();
  let total = 0;

  const tables = ['apiaries', 'boxes', 'review_reports', 'manejos', 'notifications'];
  for (const table of tables) {
    const res = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} WHERE synced = 0;`);
    if (res) total += res.count;
  }

  const deletions = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM offline_deletions;');
  if (deletions) total += deletions.count;

  return total;
}

export async function getUnsyncedRecords(tableName: string): Promise<any[]> {
  const db = await getLocalDb();
  return db.getAllAsync(`SELECT * FROM ${tableName} WHERE synced = 0;`);
}

export async function updateRecordSyncStatus(
  tableName: string,
  localId: number,
  serverId: number,
  isNew: boolean
): Promise<void> {
  const db = await getLocalDb();
  if (isNew && localId !== serverId) {
    await db.withTransactionAsync(async () => {
      // 1. Re-aponta os filhos da chave estrangeira de localId para serverId
      if (tableName === 'apiaries') {
        await db.runAsync('UPDATE boxes SET apiary_id = ? WHERE apiary_id = ?;', [serverId, localId]);
        await db.runAsync('UPDATE review_reports SET apiary_id = ? WHERE apiary_id = ?;', [serverId, localId]);
        await db.runAsync('UPDATE manejos SET apiary_id = ? WHERE apiary_id = ?;', [serverId, localId]);
      } else if (tableName === 'boxes') {
        await db.runAsync('UPDATE review_reports SET caixa_id = ? WHERE caixa_id = ?;', [serverId, localId]);
        await db.runAsync('UPDATE manejos SET caixa_id = ? WHERE caixa_id = ?;', [serverId, localId]);
      } else if (tableName === 'review_reports') {
        await db.runAsync('UPDATE manejos SET revisao_id = ? WHERE revisao_id = ?;', [serverId, localId]);
      }

      // 2. Verifica se o serverId já existe localmente (ex: baixado por um PULL anterior)
      const existingServerRow = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM ${tableName} WHERE id = ?;`,
        [serverId]
      );

      if (existingServerRow) {
        // Se já existe uma linha com o serverId, remove a linha temporária localId e marca serverId como sincronizada
        await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?;`, [localId]);
        await db.runAsync(`UPDATE ${tableName} SET synced = 1, is_new = 0 WHERE id = ?;`, [serverId]);
      } else {
        // Se não existe, atualiza a chave primária de localId para serverId
        await db.runAsync(`UPDATE ${tableName} SET id = ?, synced = 1, is_new = 0 WHERE id = ?;`, [serverId, localId]);
      }
    });
  } else {
    await db.runAsync(`UPDATE ${tableName} SET synced = 1, is_new = 0 WHERE id = ?;`, [localId]);
  }
}

export async function forceAllRecordsUnsynced(): Promise<void> {
  const db = await getLocalDb();
  const tables = ['apiaries', 'boxes', 'review_reports', 'manejos', 'notifications'];
  for (const table of tables) {
    await db.runAsync(`UPDATE ${table} SET synced = 0, is_new = 1;`);
  }
}

export async function clearLocalDatabase(): Promise<void> {
  const db = await getLocalDb();
  const tables = ['apiaries', 'boxes', 'review_reports', 'manejos', 'notifications', 'offline_deletions'];
  for (const table of tables) {
    await db.runAsync(`DELETE FROM ${table};`);
  }
}

export async function clearOfflineDeletions(): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('DELETE FROM offline_deletions;');
}

// Gestão de deleções offline
export async function recordOfflineDeletion(tableName: string, recordId: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getLocalDb();
  await db.runAsync('INSERT INTO offline_deletions (table_name, record_id) VALUES (?, ?);', [tableName, recordId]);
}

export async function getPendingDeletions(): Promise<Array<{ id: number; table_name: string; record_id: number }>> {
  if (Platform.OS === 'web') return [];
  const db = await getLocalDb();
  return db.getAllAsync<{ id: number; table_name: string; record_id: number }>('SELECT * FROM offline_deletions;');
}

export async function removePendingDeletion(id: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getLocalDb();
  await db.runAsync('DELETE FROM offline_deletions WHERE id = ?;', [id]);
}
