/**
 * Apiários no SQLite local.
 */
import { getIsoTimestamp, getLocalDb } from './database';
import { recordOfflineDeletion } from './syncState';

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
    `INSERT INTO apiaries (id, name, location, box_count, description, created_at, updated_at, synced, is_new, role)
     VALUES ((SELECT MIN(COALESCE(MIN(id), 0), 0) - 1 FROM apiaries), ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
        `DELETE FROM apiaries WHERE synced = 1 AND is_new = 0 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM apiaries WHERE synced = 1 AND is_new = 0;');
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
           role = excluded.role
         WHERE apiaries.synced = 1;`,
        [a.id, a.name, a.location, a.boxCount, a.description, a.createdAt, a.updatedAt, a.role || 'owner']
      );
    }
  });
}
