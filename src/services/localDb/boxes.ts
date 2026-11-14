/**
 * Caixas (colmeias) no SQLite local.
 */
import { getIsoTimestamp, getLocalDb } from './database';
import { recordOfflineDeletion } from './syncState';

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
    `INSERT INTO boxes (id, apiary_id, name, position, created_at, updated_at, archived, synced, is_new)
     VALUES ((SELECT MIN(COALESCE(MIN(id), 0), 0) - 1 FROM boxes), ?, ?, ?, ?, ?, ?, ?, ?);`,
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
        `DELETE FROM boxes WHERE synced = 1 AND is_new = 0 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM boxes WHERE synced = 1 AND is_new = 0;');
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
           synced = 1
         WHERE boxes.synced = 1;`,
        [b.id, b.apiaryId, b.name, b.position, b.createdAt, b.updatedAt, b.archived ? 1 : 0]
      );
    }
  });
}
