/**
 * Revisões no SQLite local.
 */
import { generateClientUuid, getIsoTimestamp, getLocalDb } from './database';
import { recordOfflineDeletion } from './syncState';

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
    `INSERT INTO review_reports (id, client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, checked_options, observacoes, indicacoes, created_at, archived, synced, is_new)
     VALUES ((SELECT MIN(COALESCE(MIN(id), 0), 0) - 1 FROM review_reports), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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

      const existing = await db.getFirstAsync<{ synced: number }>(
        'SELECT synced FROM review_reports WHERE id = ?;',
        [r.id]
      );
      if (existing && existing.synced === 0) {
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
           is_new = 0
         WHERE review_reports.synced = 1;`,
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
