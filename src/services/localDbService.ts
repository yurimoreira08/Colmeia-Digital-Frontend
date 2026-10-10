import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'colmeia_digital_offline.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getIsoTimestamp(): string {
  return new Date().toISOString();
}

export async function getLocalDb(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite não é suportado na plataforma Web.');
  }
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function initializeLocalDb(): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getLocalDb();

  // Foreign keys OFF para permitir remapeamento seguro de IDs temporários locais para IDs definitivos do servidor durante sync
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS apiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      box_count INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0,
      role TEXT DEFAULT 'owner'
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apiary_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0,
      FOREIGN KEY (apiary_id) REFERENCES apiaries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT,
      caixa_id INTEGER NOT NULL,
      caixa_name TEXT NOT NULL,
      apiary_id INTEGER,
      apiary_name TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'apiario',
      checked_options TEXT NOT NULL,
      observacoes TEXT NOT NULL,
      indicacoes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS manejos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT,
      caixa_id INTEGER NOT NULL,
      caixa_name TEXT NOT NULL,
      apiary_id INTEGER,
      apiary_name TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'apiario',
      revisao_id INTEGER,
      checked_options TEXT NOT NULL,
      observacoes TEXT NOT NULL,
      indicacoes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      photo_uri TEXT,
      archived INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_boxes_apiary_id_archived ON boxes (apiary_id, archived);
    CREATE INDEX IF NOT EXISTS idx_review_reports_apiary_caixa ON review_reports (apiary_id, caixa_id);
    CREATE INDEX IF NOT EXISTS idx_review_reports_created_at ON review_reports (created_at);
    CREATE INDEX IF NOT EXISTS idx_manejos_apiary_caixa ON manejos (apiary_id, caixa_id);
    CREATE INDEX IF NOT EXISTS idx_manejos_created_at ON manejos (created_at);
  `);

  try {
    await db.execAsync('ALTER TABLE review_reports ADD COLUMN client_uuid TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE manejos ADD COLUMN client_uuid TEXT;');
  } catch {}
  try {
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_review_reports_client_uuid ON review_reports (client_uuid);');
  } catch {}
  try {
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_manejos_client_uuid ON manejos (client_uuid);');
  } catch {}

  // Limpa caixas duplicadas residuais
  await cleanupDuplicateBoxesLocal();
}

export async function cleanupDuplicateBoxesLocal(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const db = await getLocalDb();
    // Re-aponta anotações de caixas duplicadas para a caixa principal (menor ID)
    await db.execAsync(`
      UPDATE review_reports 
      SET caixa_id = (
        SELECT MIN(b2.id) 
        FROM boxes b2 
        JOIN boxes b1 ON b1.id = review_reports.caixa_id 
        WHERE b2.apiary_id = b1.apiary_id 
          AND LOWER(TRIM(b2.name)) = LOWER(TRIM(b1.name)) 
          AND b2.archived = 0
      )
      WHERE EXISTS (
        SELECT 1 
        FROM boxes b1 
        JOIN boxes b2 ON b2.apiary_id = b1.apiary_id 
          AND LOWER(TRIM(b2.name)) = LOWER(TRIM(b1.name)) 
          AND b2.id < b1.id 
          AND b2.archived = 0
        WHERE b1.id = review_reports.caixa_id
      );

      UPDATE manejos 
      SET caixa_id = (
        SELECT MIN(b2.id) 
        FROM boxes b2 
        JOIN boxes b1 ON b1.id = manejos.caixa_id 
        WHERE b2.apiary_id = b1.apiary_id 
          AND LOWER(TRIM(b2.name)) = LOWER(TRIM(b1.name)) 
          AND b2.archived = 0
      )
      WHERE EXISTS (
        SELECT 1 
        FROM boxes b1 
        JOIN boxes b2 ON b2.apiary_id = b1.apiary_id 
          AND LOWER(TRIM(b2.name)) = LOWER(TRIM(b1.name)) 
          AND b2.id < b1.id 
          AND b2.archived = 0
        WHERE b1.id = manejos.caixa_id
      );

      DELETE FROM boxes 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM boxes 
        WHERE archived = 0 
        GROUP BY apiary_id, LOWER(TRIM(name))
      ) 
      AND archived = 0;
    `);
  } catch (err) {
    console.warn('[cleanupDuplicateBoxesLocal] Erro ao limpar caixas duplicadas:', err);
  }
}

// Configs locais
export async function getLocalConfigValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(`config_${key}`);
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_config WHERE key = ?;', [key]);
  return row ? row.value : null;
}

export async function setLocalConfigValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(`config_${key}`, value);
    return;
  }
  const db = await getLocalDb();
  await db.runAsync(
    'INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    [key, value]
  );
}

// Verificação de sincronização pendente
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

// --- APIARIES ---
export async function insertApiaryLocal(apiary: {
  name: string;
  location: string;
  box_count: number;
  description: string;
  created_at?: string;
  updated_at?: string;
  synced?: number;
  is_new?: number;
  role?: string;
}): Promise<number> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  const res = await db.runAsync(
    `INSERT INTO apiaries (name, location, box_count, description, created_at, updated_at, synced, is_new, role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      apiary.name,
      apiary.location,
      apiary.box_count,
      apiary.description,
      apiary.created_at || now,
      apiary.updated_at || now,
      apiary.synced ?? 0,
      apiary.is_new ?? 1,
      apiary.role || 'owner',
    ]
  );
  return res.lastInsertRowId;
}

export async function updateApiaryLocal(id: number, apiary: {
  name: string;
  location: string;
  box_count: number;
  description: string;
  updated_at?: string;
  synced?: number;
}): Promise<void> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  await db.runAsync(
    `UPDATE apiaries
     SET name = ?, location = ?, box_count = ?, description = ?, updated_at = ?, synced = ?
     WHERE id = ?;`,
    [apiary.name, apiary.location, apiary.box_count, apiary.description, apiary.updated_at || now, apiary.synced ?? 0, id]
  );
}

export async function deleteApiaryLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ is_new: number; synced: number }>('SELECT is_new, synced FROM apiaries WHERE id = ?;', [id]);
  if (row && row.is_new === 0) {
    await recordOfflineDeletion('apiaries', id);
  }
  await db.runAsync('DELETE FROM boxes WHERE apiary_id = ?;', [id]);
  await db.runAsync('DELETE FROM review_reports WHERE apiary_id = ?;', [id]);
  await db.runAsync('DELETE FROM manejos WHERE apiary_id = ?;', [id]);
  await db.runAsync('DELETE FROM apiaries WHERE id = ?;', [id]);
}

export async function listApiariesLocal(): Promise<any[]> {
  const db = await getLocalDb();
  return db.getAllAsync(`
    SELECT a.*, 
      COALESCE((SELECT COUNT(*) FROM boxes b WHERE b.apiary_id = a.id AND b.archived = 0), 0) as actual_box_count 
    FROM apiaries a 
    ORDER BY a.updated_at DESC;
  `);
}

export async function getApiaryLocal(id: number): Promise<any | null> {
  const db = await getLocalDb();
  return db.getFirstAsync(`
    SELECT a.*, 
      COALESCE((SELECT COUNT(*) FROM boxes b WHERE b.apiary_id = a.id AND b.archived = 0), 0) as actual_box_count 
    FROM apiaries a 
    WHERE a.id = ?;
  `, [id]);
}

export async function getLocalApiaries(): Promise<any[]> {
  return listApiariesLocal();
}

export async function getLocalApiaryById(id: number): Promise<any | null> {
  return getApiaryLocal(id);
}

export async function saveLocalApiary(params: {
  id?: number;
  name: string;
  location: string;
  boxCount: number;
  description: string;
}): Promise<any> {
  const now = getIsoTimestamp();
  if (params.id) {
    await updateApiaryLocal(params.id, {
      name: params.name,
      location: params.location,
      box_count: params.boxCount,
      description: params.description,
      updated_at: now,
      synced: 0,
    });
    return getApiaryLocal(params.id);
  } else {
    const insertId = await insertApiaryLocal({
      name: params.name,
      location: params.location,
      box_count: params.boxCount,
      description: params.description,
      created_at: now,
      updated_at: now,
      synced: 0,
      is_new: 1,
    });
    return getApiaryLocal(insertId);
  }
}

export async function deleteLocalApiary(id: number): Promise<void> {
  return deleteApiaryLocal(id);
}

export async function replaceApiariesLocal(apiaries: any[]): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    const remoteIds = apiaries.map((a) => a.id).filter(Boolean);
    if (remoteIds.length > 0) {
      const placeholders = remoteIds.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM apiaries WHERE synced = 1 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM apiaries WHERE synced = 1;');
    }

    for (const a of apiaries) {
      // Reconciliação: se existir registro não sincronizado localmente com o mesmo nome
      const localDuplicate = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM apiaries WHERE synced = 0 AND LOWER(TRIM(name)) = LOWER(TRIM(?));',
        [a.name]
      );
      if (localDuplicate && localDuplicate.id !== a.id) {
        await db.runAsync('UPDATE boxes SET apiary_id = ? WHERE apiary_id = ?;', [a.id, localDuplicate.id]);
        await db.runAsync('UPDATE review_reports SET apiary_id = ? WHERE apiary_id = ?;', [a.id, localDuplicate.id]);
        await db.runAsync('UPDATE manejos SET apiary_id = ? WHERE apiary_id = ?;', [a.id, localDuplicate.id]);
        await db.runAsync('DELETE FROM apiaries WHERE id = ?;', [localDuplicate.id]);
      }

      const existing = await db.getFirstAsync<{ synced: number }>(
        'SELECT synced FROM apiaries WHERE id = ?;',
        [a.id]
      );
      if (existing && existing.synced === 0) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO apiaries (id, name, location, box_count, description, created_at, updated_at, synced, is_new, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           location = excluded.location,
           box_count = excluded.box_count,
           description = excluded.description,
           updated_at = excluded.updated_at,
           synced = 1,
           role = excluded.role;`,
        [a.id, a.name, a.location, a.boxCount, a.description, a.createdAt, a.updatedAt, a.role || 'owner']
      );
    }
  });
}

// --- BOXES ---
export async function insertBoxLocal(box: {
  apiary_id: number;
  name: string;
  position: number;
  created_at?: string;
  updated_at?: string;
  archived?: number;
  synced?: number;
  is_new?: number;
}): Promise<number> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  const res = await db.runAsync(
    `INSERT INTO boxes (apiary_id, name, position, created_at, updated_at, archived, synced, is_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      box.apiary_id,
      box.name,
      box.position,
      box.created_at || now,
      box.updated_at || now,
      box.archived ?? 0,
      box.synced ?? 0,
      box.is_new ?? 1,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateBoxLocal(id: number, box: { name?: string; position?: number; archived?: number; synced?: number }): Promise<void> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  await db.runAsync(
    `UPDATE boxes
     SET name = COALESCE(?, name),
         position = COALESCE(?, position),
         archived = COALESCE(?, archived),
         updated_at = ?,
         synced = ?
     WHERE id = ?;`,
    [box.name ?? null, box.position ?? null, box.archived ?? null, now, box.synced ?? 0, id]
  );
}

export async function renameBoxLocal(id: number, name: string): Promise<void> {
  return updateBoxLocal(id, { name, synced: 0 });
}

export async function archiveBoxLocal(id: number): Promise<void> {
  return updateBoxLocal(id, { archived: 1, synced: 0 });
}

export async function unarchiveBoxLocal(id: number): Promise<void> {
  return updateBoxLocal(id, { archived: 0, synced: 0 });
}

export async function deleteBoxLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ is_new: number; synced: number }>('SELECT is_new, synced FROM boxes WHERE id = ?;', [id]);
  if (row && row.is_new === 0) {
    await recordOfflineDeletion('boxes', id);
  }
  await db.runAsync('DELETE FROM review_reports WHERE caixa_id = ?;', [id]);
  await db.runAsync('DELETE FROM manejos WHERE caixa_id = ?;', [id]);
  await db.runAsync('DELETE FROM boxes WHERE id = ?;', [id]);
}

export async function listBoxesLocal(params?: { apiaryId?: number; search?: string; includeArchived?: boolean; showAll?: boolean }): Promise<any[]> {
  const db = await getLocalDb();
  let query = `
    SELECT b.*, a.name as apiary_name, a.role as apiary_role 
    FROM boxes b 
    LEFT JOIN apiaries a ON b.apiary_id = a.id 
    WHERE 1=1
  `;
  const args: any[] = [];

  if (params?.apiaryId !== undefined) {
    query += ' AND b.apiary_id = ?';
    args.push(params.apiaryId);
  }

  if (params?.showAll) {
    // Show all
  } else if (!params?.includeArchived) {
    query += ' AND b.archived = 0';
  }

  if (params?.search && params.search.trim().length > 0) {
    query += ' AND b.name LIKE ?';
    args.push(`%${params.search.trim()}%`);
  }

  query += ' ORDER BY b.position ASC;';
  return db.getAllAsync(query, args);
}

export async function getBoxLocal(id: number): Promise<any | null> {
  const db = await getLocalDb();
  return db.getFirstAsync(`
    SELECT b.*, a.name as apiary_name, a.role as apiary_role 
    FROM boxes b 
    LEFT JOIN apiaries a ON b.apiary_id = a.id 
    WHERE b.id = ?;
  `, [id]);
}

export async function getLocalBoxes(params?: { apiaryId?: number; search?: string; includeArchived?: boolean; showAll?: boolean }): Promise<any[]> {
  return listBoxesLocal(params);
}

export async function getLocalBoxById(id: number): Promise<any | null> {
  return getBoxLocal(id);
}

export async function saveLocalBox(params: {
  id?: number;
  apiaryId: number;
  name: string;
  position: number;
  archived?: number;
}): Promise<any> {
  const now = getIsoTimestamp();
  if (params.id) {
    await updateBoxLocal(params.id, {
      name: params.name,
      position: params.position,
      archived: params.archived ?? 0,
      synced: 0,
    });
    return getBoxLocal(params.id);
  } else {
    const insertId = await insertBoxLocal({
      apiary_id: params.apiaryId,
      name: params.name,
      position: params.position,
      created_at: now,
      updated_at: now,
      archived: params.archived ?? 0,
      synced: 0,
      is_new: 1,
    });
    return getBoxLocal(insertId);
  }
}

export async function deleteLocalBox(id: number): Promise<void> {
  return deleteBoxLocal(id);
}

export async function setBoxArchivedLocal(boxId: number, archived: boolean): Promise<void> {
  await updateBoxLocal(boxId, { archived: archived ? 1 : 0, synced: 0 });
}

export async function replaceBoxesLocal(boxes: any[]): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    const remoteIds = boxes.map((b) => b.id).filter(Boolean);
    if (remoteIds.length > 0) {
      const placeholders = remoteIds.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM boxes WHERE synced = 1 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM boxes WHERE synced = 1;');
    }

    for (const b of boxes) {
      // Reconciliação: se existir caixa não sincronizada localmente com o mesmo apiary_id e mesmo nome/posição
      const localDuplicateBox = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM boxes WHERE synced = 0 AND apiary_id = ? AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR position = ?);',
        [b.apiaryId, b.name, b.position]
      );
      if (localDuplicateBox && localDuplicateBox.id !== b.id) {
        await db.runAsync('UPDATE review_reports SET caixa_id = ? WHERE caixa_id = ?;', [b.id, localDuplicateBox.id]);
        await db.runAsync('UPDATE manejos SET caixa_id = ? WHERE caixa_id = ?;', [b.id, localDuplicateBox.id]);
        await db.runAsync('DELETE FROM boxes WHERE id = ?;', [localDuplicateBox.id]);
      }

      const existing = await db.getFirstAsync<{ synced: number }>(
        'SELECT synced FROM boxes WHERE id = ?;',
        [b.id]
      );
      if (existing && existing.synced === 0) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO boxes (id, apiary_id, name, position, created_at, updated_at, archived, synced, is_new)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
         ON CONFLICT(id) DO UPDATE SET
           apiary_id = excluded.apiary_id,
           name = excluded.name,
           position = excluded.position,
           archived = excluded.archived,
           updated_at = excluded.updated_at,
           synced = 1;`,
        [b.id, b.apiaryId, b.name, b.position, b.createdAt, b.updatedAt, b.archived ? 1 : 0]
      );
    }
  });
}

export function generateClientUuid(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
}

// --- REVIEW REPORTS (INSPECTIONS) ---
export async function insertReviewReportLocal(report: {
  client_uuid?: string;
  caixa_id: number;
  caixa_name: string;
  apiary_id: number | null;
  apiary_name: string;
  tipo?: string;
  checked_options: string;
  observacoes: string;
  indicacoes: string;
  created_at?: string;
  archived?: number;
  synced?: number;
  is_new?: number;
}): Promise<number> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  const uuid = report.client_uuid || generateClientUuid();
  const res = await db.runAsync(
    `INSERT INTO review_reports (client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, checked_options, observacoes, indicacoes, created_at, archived, synced, is_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      uuid,
      report.caixa_id,
      report.caixa_name,
      report.apiary_id,
      report.apiary_name,
      'apiario',
      report.checked_options,
      report.observacoes,
      report.indicacoes,
      report.created_at || now,
      report.archived ?? 0,
      report.synced ?? 0,
      report.is_new ?? 1,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateReviewReportLocal(id: number, data: { observacoes?: string; indicacoes?: string; checked_options?: string; synced?: number }): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync(
    `UPDATE review_reports
     SET observacoes = COALESCE(?, observacoes),
         indicacoes = COALESCE(?, indicacoes),
         checked_options = COALESCE(?, checked_options),
         synced = ?
     WHERE id = ?;`,
    [data.observacoes ?? null, data.indicacoes ?? null, data.checked_options ?? null, data.synced ?? 0, id]
  );
}

export async function archiveReviewReportLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE review_reports SET archived = 1, synced = 0 WHERE id = ?;', [id]);
}

export async function unarchiveReviewReportLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE review_reports SET archived = 0, synced = 0 WHERE id = ?;', [id]);
}

export async function deleteReviewReportLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ is_new: number; synced: number }>('SELECT is_new, synced FROM review_reports WHERE id = ?;', [id]);
  if (row && row.is_new === 0) {
    await recordOfflineDeletion('review_reports', id);
  }
  await db.runAsync('DELETE FROM review_reports WHERE id = ?;', [id]);
}

export async function listReviewReportsLocal(params?: {
  tipo?: 'apiario';
  apiaryId?: number;
  caixaId?: number;
  includeArchived?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<any[]> {
  const db = await getLocalDb();
  let query = 'SELECT * FROM review_reports WHERE 1=1';
  const args: any[] = [];

  if (params?.apiaryId !== undefined) {
    query += ' AND apiary_id = ?';
    args.push(params.apiaryId);
  }
  if (params?.caixaId !== undefined) {
    query += ' AND caixa_id = ?';
    args.push(params.caixaId);
  }
  if (!params?.includeArchived) {
    query += ' AND archived = 0';
  }
  if (params?.fromDate) {
    const fromDateOnly = params.fromDate.slice(0, 10);
    query += ' AND substr(created_at, 1, 10) >= ?';
    args.push(fromDateOnly);
  }
  if (params?.toDate) {
    const toDateOnly = params.toDate.slice(0, 10);
    query += ' AND substr(created_at, 1, 10) <= ?';
    args.push(toDateOnly);
  }

  query += ' ORDER BY created_at DESC;';
  const rows = await db.getAllAsync<any>(query, args);
  return rows.map((r) => {
    let checked: any = [];
    try {
      checked = JSON.parse(r.checked_options);
    } catch {
      checked = [];
    }
    return {
      id: r.id,
      clientUuid: r.client_uuid || undefined,
      caixaId: r.caixa_id,
      caixaName: r.caixa_name,
      apiaryId: r.apiary_id,
      apiaryName: r.apiary_name,
      tipo: r.tipo,
      checkedOptions: checked,
      observacoes: r.observacoes,
      indicacoes: r.indicacoes,
      createdAt: r.created_at,
      archived: !!r.archived,
      synced: !!r.synced,
    };
  });
}

export async function getLocalRevisions(params?: {
  tipo?: 'apiario';
  apiaryId?: number;
  caixaId?: number;
  includeArchived?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<any[]> {
  return listReviewReportsLocal(params);
}

export async function saveLocalRevision(params: {
  id?: number;
  clientUuid?: string;
  caixaId: number;
  caixaName: string;
  apiaryId: number | null;
  apiaryName: string;
  tipo: 'apiario';
  checkedOptions: string[];
  observacoes: string;
  indicacoes: string;
}): Promise<void> {
  const now = getIsoTimestamp();
  if (params.id) {
    await updateReviewReportLocal(params.id, {
      observacoes: params.observacoes,
      indicacoes: params.indicacoes,
      checked_options: JSON.stringify(params.checkedOptions),
      synced: 0,
    });
  } else {
    await insertReviewReportLocal({
      client_uuid: params.clientUuid || generateClientUuid(),
      caixa_id: params.caixaId,
      caixa_name: params.caixaName,
      apiary_id: params.apiaryId,
      apiary_name: params.apiaryName,
      tipo: params.tipo,
      checked_options: JSON.stringify(params.checkedOptions),
      observacoes: params.observacoes,
      indicacoes: params.indicacoes,
      created_at: now,
      synced: 0,
      is_new: 1,
    });
  }
}

export async function deleteLocalRevision(id: number): Promise<void> {
  return deleteReviewReportLocal(id);
}

export async function setRevisionArchivedLocal(id: number, archived: boolean): Promise<void> {
  if (archived) {
    await archiveReviewReportLocal(id);
  } else {
    await unarchiveReviewReportLocal(id);
  }
}

export async function replaceReviewReportsLocal(reports: any[]): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    const remoteIds = reports.map((r) => r.id).filter(Boolean);
    if (remoteIds.length > 0) {
      const placeholders = remoteIds.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM review_reports WHERE synced = 1 AND is_new = 0 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM review_reports WHERE synced = 1 AND is_new = 0;');
    }

    for (const r of reports) {
      if (r.clientUuid) {
        const localByUuid = await db.getFirstAsync<{ id: number; synced: number }>(
          'SELECT id, synced FROM review_reports WHERE client_uuid = ?;',
          [r.clientUuid]
        );
        if (localByUuid && localByUuid.id !== r.id) {
          await db.runAsync('UPDATE review_reports SET id = ?, synced = 1, is_new = 0 WHERE id = ?;', [r.id, localByUuid.id]);
          await db.runAsync('UPDATE manejos SET revisao_id = ? WHERE revisao_id = ?;', [r.id, localByUuid.id]);
        }
      }

      const existing = await db.getFirstAsync<{ synced: number; is_new: number }>(
        'SELECT synced, is_new FROM review_reports WHERE id = ?;',
        [r.id]
      );
      if (existing && existing.synced === 0 && existing.is_new === 1) {
        continue;
      }

      await db.runAsync(
        `INSERT INTO review_reports (id, client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, checked_options, observacoes, indicacoes, created_at, archived, synced, is_new)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
         ON CONFLICT(id) DO UPDATE SET
           client_uuid = COALESCE(excluded.client_uuid, review_reports.client_uuid),
           caixa_id = excluded.caixa_id,
           caixa_name = excluded.caixa_name,
           apiary_id = excluded.apiary_id,
           apiary_name = excluded.apiary_name,
           checked_options = excluded.checked_options,
           observacoes = excluded.observacoes,
           indicacoes = excluded.indicacoes,
           archived = excluded.archived,
           synced = 1,
           is_new = 0;`,
        [
          r.id,
          r.clientUuid || null,
          r.caixaId,
          r.caixaName,
          r.apiaryId,
          r.apiaryName,
          'apiario',
          Array.isArray(r.checkedOptions) ? JSON.stringify(r.checkedOptions) : r.checkedOptions,
          r.observacoes || '',
          r.indicacoes || '',
          r.createdAt,
          r.archived ? 1 : 0,
        ]
      );
    }
  });
}

// --- MANEJOS ---
export async function insertManejoLocal(manejo: {
  client_uuid?: string;
  caixa_id: number;
  caixa_name: string;
  apiary_id: number | null;
  apiary_name: string;
  tipo?: string;
  revisao_id?: number | null;
  checked_options: string;
  observacoes: string;
  indicacoes: string;
  photo_uri?: string | null;
  created_at?: string;
  archived?: number;
  synced?: number;
  is_new?: number;
}): Promise<number> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  const uuid = manejo.client_uuid || generateClientUuid();
  const res = await db.runAsync(
    `INSERT INTO manejos (client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, revisao_id, checked_options, observacoes, indicacoes, photo_uri, created_at, archived, synced, is_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      uuid,
      manejo.caixa_id,
      manejo.caixa_name,
      manejo.apiary_id,
      manejo.apiary_name,
      'apiario',
      manejo.revisao_id || null,
      manejo.checked_options,
      manejo.observacoes,
      manejo.indicacoes,
      manejo.photo_uri || null,
      manejo.created_at || now,
      manejo.archived ?? 0,
      manejo.synced ?? 0,
      manejo.is_new ?? 1,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateManejoLocal(id: number, data: { observacoes?: string; indicacoes?: string; checked_options?: string; photo_uri?: string; synced?: number }): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync(
    `UPDATE manejos
     SET observacoes = COALESCE(?, observacoes),
         indicacoes = COALESCE(?, indicacoes),
         checked_options = COALESCE(?, checked_options),
         photo_uri = COALESCE(?, photo_uri),
         synced = ?
     WHERE id = ?;`,
    [data.observacoes ?? null, data.indicacoes ?? null, data.checked_options ?? null, data.photo_uri ?? null, data.synced ?? 0, id]
  );
}

export async function archiveManejoLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE manejos SET archived = 1, synced = 0 WHERE id = ?;', [id]);
}

export async function unarchiveManejoLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE manejos SET archived = 0, synced = 0 WHERE id = ?;', [id]);
}

export async function deleteManejoLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ is_new: number; synced: number }>('SELECT is_new, synced FROM manejos WHERE id = ?;', [id]);
  if (row && row.is_new === 0) {
    await recordOfflineDeletion('manejos', id);
  }
  await db.runAsync('DELETE FROM manejos WHERE id = ?;', [id]);
}

export async function listManejosLocal(params?: {
  tipo?: 'apiario';
  apiaryId?: number;
  caixaId?: number;
  includeArchived?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<any[]> {
  const db = await getLocalDb();
  let query = 'SELECT * FROM manejos WHERE 1=1';
  const args: any[] = [];

  if (params?.apiaryId !== undefined) {
    query += ' AND apiary_id = ?';
    args.push(params.apiaryId);
  }
  if (params?.caixaId !== undefined) {
    query += ' AND caixa_id = ?';
    args.push(params.caixaId);
  }
  if (!params?.includeArchived) {
    query += ' AND archived = 0';
  }
  if (params?.fromDate) {
    const fromDateOnly = params.fromDate.slice(0, 10);
    query += ' AND substr(created_at, 1, 10) >= ?';
    args.push(fromDateOnly);
  }
  if (params?.toDate) {
    const toDateOnly = params.toDate.slice(0, 10);
    query += ' AND substr(created_at, 1, 10) <= ?';
    args.push(toDateOnly);
  }

  query += ' ORDER BY created_at DESC;';
  const rows = await db.getAllAsync<any>(query, args);
  return rows.map((r) => {
    let checked: any = [];
    try {
      checked = JSON.parse(r.checked_options);
    } catch {
      checked = [];
    }
    return {
      id: r.id,
      clientUuid: r.client_uuid || undefined,
      caixaId: r.caixa_id,
      caixaName: r.caixa_name,
      apiaryId: r.apiary_id,
      apiaryName: r.apiary_name,
      tipo: r.tipo,
      revisaoId: r.revisao_id,
      checkedOptions: checked,
      observacoes: r.observacoes,
      indicacoes: r.indicacoes,
      photoUri: r.photo_uri,
      createdAt: r.created_at,
      archived: !!r.archived,
      synced: !!r.synced,
    };
  });
}

export async function getLocalManejos(params?: {
  tipo?: 'apiario';
  apiaryId?: number;
  caixaId?: number;
  includeArchived?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<any[]> {
  return listManejosLocal(params);
}

export async function saveLocalManejo(params: {
  id?: number;
  clientUuid?: string;
  caixaId: number;
  caixaName: string;
  apiaryId: number | null;
  apiaryName: string;
  tipo: 'apiario';
  revisaoId?: number;
  checkedOptions: any[];
  observacoes: string;
  indicacoes: string;
  photoUri?: string;
}): Promise<void> {
  const now = getIsoTimestamp();
  if (params.id) {
    await updateManejoLocal(params.id, {
      observacoes: params.observacoes,
      indicacoes: params.indicacoes,
      checked_options: JSON.stringify(params.checkedOptions),
      photo_uri: params.photoUri,
      synced: 0,
    });
  } else {
    await insertManejoLocal({
      client_uuid: params.clientUuid || generateClientUuid(),
      caixa_id: params.caixaId,
      caixa_name: params.caixaName,
      apiary_id: params.apiaryId,
      apiary_name: params.apiaryName,
      tipo: params.tipo,
      revisao_id: params.revisaoId,
      checked_options: JSON.stringify(params.checkedOptions),
      observacoes: params.observacoes,
      indicacoes: params.indicacoes,
      photo_uri: params.photoUri,
      created_at: now,
      synced: 0,
      is_new: 1,
    });
  }
}

export async function deleteLocalManejo(id: number): Promise<void> {
  return deleteManejoLocal(id);
}

export async function setManejoArchivedLocal(id: number, archived: boolean): Promise<void> {
  if (archived) {
    await archiveManejoLocal(id);
  } else {
    await unarchiveManejoLocal(id);
  }
}

export async function replaceManejosLocal(manejos: any[]): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    const remoteIds = manejos.map((m) => m.id).filter(Boolean);
    if (remoteIds.length > 0) {
      const placeholders = remoteIds.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM manejos WHERE synced = 1 AND is_new = 0 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM manejos WHERE synced = 1 AND is_new = 0;');
    }

    for (const m of manejos) {
      if (m.clientUuid) {
        const localByUuid = await db.getFirstAsync<{ id: number; synced: number }>(
          'SELECT id, synced FROM manejos WHERE client_uuid = ?;',
          [m.clientUuid]
        );
        if (localByUuid && localByUuid.id !== m.id) {
          await db.runAsync('UPDATE manejos SET id = ?, synced = 1, is_new = 0 WHERE id = ?;', [m.id, localByUuid.id]);
        }
      }

      const existing = await db.getFirstAsync<{ synced: number; is_new: number }>(
        'SELECT synced, is_new FROM manejos WHERE id = ?;',
        [m.id]
      );
      if (existing && existing.synced === 0 && existing.is_new === 1) {
        continue;
      }

      await db.runAsync(
        `INSERT INTO manejos (id, client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, revisao_id, checked_options, observacoes, indicacoes, photo_uri, created_at, archived, synced, is_new)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
         ON CONFLICT(id) DO UPDATE SET
           client_uuid = COALESCE(excluded.client_uuid, manejos.client_uuid),
           caixa_id = excluded.caixa_id,
           caixa_name = excluded.caixa_name,
           apiary_id = excluded.apiary_id,
           apiary_name = excluded.apiary_name,
           revisao_id = excluded.revisao_id,
           checked_options = excluded.checked_options,
           observacoes = excluded.observacoes,
           indicacoes = excluded.indicacoes,
           photo_uri = excluded.photo_uri,
           archived = excluded.archived,
           synced = 1,
           is_new = 0;`,
        [
          m.id,
          m.clientUuid || null,
          m.caixaId,
          m.caixaName,
          m.apiaryId,
          m.apiaryName,
          'apiario',
          m.revisaoId || null,
          Array.isArray(m.checkedOptions) ? JSON.stringify(m.checkedOptions) : m.checkedOptions,
          m.observacoes || '',
          m.indicacoes || '',
          m.photoUri || null,
          m.createdAt,
          m.archived ? 1 : 0,
        ]
      );
    }
  });
}

// --- NOTIFICATIONS ---
export async function insertNotificationLocal(notif: { title: string; subtitle: string; created_at?: string; read?: number; synced?: number; is_new?: number }): Promise<number> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  const res = await db.runAsync(
    `INSERT INTO notifications (title, subtitle, created_at, read, synced, is_new)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [notif.title, notif.subtitle, notif.created_at || now, notif.read ?? 0, notif.synced ?? 0, notif.is_new ?? 1]
  );
  return res.lastInsertRowId;
}

export async function markNotificationReadLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE notifications SET read = 1, synced = 0 WHERE id = ?;', [id]);
}

export async function markAllNotificationsReadLocal(): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE notifications SET read = 1, synced = 0;');
}

export async function listNotificationsLocal(limit = 50): Promise<any[]> {
  const db = await getLocalDb();
  return db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?;', [limit]);
}

export async function getLocalNotifications(limit = 50): Promise<any[]> {
  return listNotificationsLocal(limit);
}

export async function saveLocalNotification(params: { title: string; subtitle: string }): Promise<any> {
  const now = getIsoTimestamp();
  const id = await insertNotificationLocal({
    title: params.title,
    subtitle: params.subtitle,
    created_at: now,
    read: 0,
    synced: 0,
    is_new: 1,
  });
  return { id, title: params.title, subtitle: params.subtitle, created_at: now, read: 0 };
}

export async function markLocalNotificationRead(id: number): Promise<void> {
  return markNotificationReadLocal(id);
}

export async function markAllLocalNotificationsRead(): Promise<void> {
  return markAllNotificationsReadLocal();
}

export async function getLocalUnreadNotificationsCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const db = await getLocalDb();
  const res = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM notifications WHERE read = 0;');
  return res?.count ?? 0;
}

export async function replaceNotificationsLocal(notifs: any[]): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    const remoteIds = notifs.map((n) => n.id).filter(Boolean);
    if (remoteIds.length > 0) {
      const placeholders = remoteIds.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM notifications WHERE synced = 1 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM notifications WHERE synced = 1;');
    }

    for (const n of notifs) {
      const existing = await db.getFirstAsync<{ synced: number }>(
        'SELECT synced FROM notifications WHERE id = ?;',
        [n.id]
      );
      if (existing && existing.synced === 0) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO notifications (id, title, subtitle, created_at, read, synced, is_new)
         VALUES (?, ?, ?, ?, ?, 1, 0)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           subtitle = excluded.subtitle,
           read = excluded.read,
           synced = 1;`,
        [n.id, n.title, n.subtitle, n.createdAt, n.read ? 1 : 0]
      );
    }
  });
}
