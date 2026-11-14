/**
 * Manejos no SQLite local.
 */
import { generateClientUuid, getIsoTimestamp, getLocalDb } from './database';
import { recordOfflineDeletion } from './syncState';

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
    `INSERT INTO manejos (id, client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, revisao_id, checked_options, observacoes, indicacoes, photo_uri, created_at, archived, synced, is_new)
     VALUES ((SELECT MIN(COALESCE(MIN(id), 0), 0) - 1 FROM manejos), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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

      const existing = await db.getFirstAsync<{ synced: number }>(
        'SELECT synced FROM manejos WHERE id = ?;',
        [m.id]
      );
      if (existing && existing.synced === 0) {
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
           is_new = 0
         WHERE manejos.synced = 1;`,
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
