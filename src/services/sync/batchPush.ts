/**
 * Envio em lote (F3): as pendências vão pelo POST /sync em poucas
 * requisições, em vez de uma (ou três) por registro.
 */
import { apiRequest } from '../apiClient';
import {
  applyRemoteDataPull,
  getLocalDb,
  getUnsyncedRecords,
  insertNotificationLocal,
  updateRecordSyncStatus,
} from '../localDbService';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadImageToServer } from '../storageService';
import { isAuthError, isRouteMissing, SyncAuthError, type PushOutcome } from './syncErrors';

/** Itens de cada tipo por requisição (o servidor aceita até 100). */
const CHUNK_SIZE = 50;
/** Limite de rodadas por sync, para nunca ficar em laço. */
const MAX_ROUNDS = 20;

type Table = 'apiaries' | 'boxes' | 'review_reports' | 'manejos';
type ItemStatus = 'created' | 'updated' | 'conflict' | 'rejected' | 'error';
type ItemResult = { localId: number; status: ItemStatus; id?: number; message?: string; server?: unknown };
type DeletionResult = { entity: Table; id: number; status: 'deleted' | 'rejected' | 'error'; message?: string };
type PushResponse = {
  deletions: DeletionResult[];
  apiaries: ItemResult[];
  boxes: ItemResult[];
  revisions: ItemResult[];
  manejos: ItemResult[];
};

/** Lista do lote → tabela do SQLite e chave do download. */
const LISTS: { list: 'apiaries' | 'boxes' | 'revisions' | 'manejos'; table: Table; label: string }[] = [
  { list: 'apiaries', table: 'apiaries', label: 'Um apiário' },
  { list: 'boxes', table: 'boxes', label: 'Uma caixa' },
  { list: 'revisions', table: 'review_reports', label: 'Uma revisão' },
  { list: 'manejos', table: 'manejos', label: 'Um manejo' },
];

const parseJson = (value: string, fallback: unknown) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const base = (row: any) => ({
  localId: row.id,
  id: row.is_new ? undefined : row.id,
  baseUpdatedAt: row.server_updated_at || undefined,
});

/** O pai está no servidor (id positivo) ou vai neste mesmo lote? */
const parentReady = (ref: number | null | undefined, inBatch: Set<number>) => ref == null || ref > 0 || inBatch.has(ref);

/** O arquivo local (file://) ainda existe? Falha ao consultar conta como existente (melhor esperar que perder a foto). */
async function localFileExists(uri: string): Promise<boolean> {
  try {
    return (await FileSystem.getInfoAsync(uri)).exists;
  } catch {
    return true;
  }
}

/**
 * Libera pendências que nunca poderiam subir porque o pai criado offline
 * (id negativo) não existe mais no aparelho. Sem isto ficariam na fila para
 * sempre e o sync nunca terminaria:
 * - manejo ligado a uma revisão que sumiu: perde só o vínculo (como no servidor);
 * - caixa, revisão ou manejo cujo apiário ou caixa sumiu: não tem onde ser
 *   gravado e sai do aparelho. Só acontece se o pai foi excluído aqui.
 */
async function releaseOrphans(): Promise<void> {
  const db = await getLocalDb();
  const missing = (column: string, parent: string) => `${column} < 0 AND NOT EXISTS (SELECT 1 FROM ${parent} p WHERE p.id = ${column})`;
  await db.runAsync(`UPDATE manejos SET revisao_id = NULL WHERE ${missing('manejos.revisao_id', 'review_reports')};`);
  for (const table of ['manejos', 'review_reports']) {
    await db.runAsync(
      `DELETE FROM ${table} WHERE synced = 0 AND (${missing(`${table}.caixa_id`, 'boxes')} OR ${missing(`${table}.apiary_id`, 'apiaries')});`,
    );
  }
  await db.runAsync(`DELETE FROM boxes WHERE synced = 0 AND ${missing('boxes.apiary_id', 'apiaries')};`);
}

/**
 * Monta uma rodada do lote com as pendências atuais. Filhos cujo pai
 * criado offline ainda não foi enviado ficam para a rodada seguinte, quando
 * o id do pai já terá sido trocado pelo do servidor.
 */
async function buildRound(errors: string[]) {
  const db = await getLocalDb();
  await releaseOrphans();
  const deletionRows = await db.getAllAsync<{ id: number; table_name: string; record_id: number }>(
    'SELECT * FROM offline_deletions ORDER BY id LIMIT 100;',
  );
  // Registro criado e excluído offline: nunca chegou ao servidor.
  const localOnly = deletionRows.filter((d) => d.record_id <= 0).map((d) => d.id);
  if (localOnly.length > 0) {
    await db.runAsync(`DELETE FROM offline_deletions WHERE id IN (${localOnly.map(() => '?').join(',')});`, localOnly);
  }
  const deletions = deletionRows.filter((d) => d.record_id > 0).map((d) => ({ rowId: d.id, entity: d.table_name as Table, id: d.record_id }));

  const apiaryRows = (await getUnsyncedRecords('apiaries')).slice(0, CHUNK_SIZE);
  const apiaryIds = new Set(apiaryRows.map((a) => a.id));
  const boxRows = (await getUnsyncedRecords('boxes')).filter((b) => parentReady(b.apiary_id, apiaryIds)).slice(0, CHUNK_SIZE);
  const boxIds = new Set(boxRows.map((b) => b.id));
  const recordReady = (r: any) => parentReady(r.caixa_id, boxIds) && parentReady(r.apiary_id, apiaryIds);
  const revisionRows = (await getUnsyncedRecords('review_reports')).filter(recordReady).slice(0, CHUNK_SIZE);
  const revisionIds = new Set(revisionRows.map((r) => r.id));
  const manejoCandidates = (await getUnsyncedRecords('manejos'))
    .filter((m) => recordReady(m) && parentReady(m.revisao_id, revisionIds))
    .slice(0, CHUNK_SIZE);

  // A foto sobe antes: no lote vai só a URL.
  const manejoRows: any[] = [];
  for (const m of manejoCandidates) {
    if (m.photo_uri && !/^https?:\/\//.test(m.photo_uri)) {
      let uploadedUrl: string | null = null;
      try {
        uploadedUrl = await uploadImageToServer(m.photo_uri, 'manejos');
      } catch (err) {
        if (isAuthError(err)) throw new SyncAuthError('Sessão expirada.');
        console.warn('[Sync] Falha no upload da foto do manejo:', err);
      }
      if (!uploadedUrl) {
        if (await localFileExists(m.photo_uri)) {
          // Falha de rede ou do servidor: espera o próximo sync para não perder a foto.
          errors.push(`Manejo da caixa "${m.caixa_name}": falha ao enviar a foto. O envio foi adiado para não perder a foto.`);
          continue;
        }
        // O arquivo não existe mais no aparelho: não há foto para enviar, e esperar
        // deixaria o manejo pendente para sempre. Sobe sem a foto.
        console.warn('[Sync] Foto do manejo não existe mais no aparelho; enviando o manejo sem ela.');
      }
      await db.runAsync('UPDATE manejos SET photo_uri = ? WHERE id = ?;', [uploadedUrl, m.id]);
      m.photo_uri = uploadedUrl;
    }
    manejoRows.push(m);
  }

  const payload = {
    deletions: deletions.map(({ entity, id }) => ({ entity, id })),
    apiaries: apiaryRows.map((a) => ({
      ...base(a),
      name: a.name,
      location: a.location,
      boxCount: String(a.box_count),
      description: a.description,
    })),
    boxes: boxRows.map((b) => ({ ...base(b), apiaryId: b.apiary_id, name: b.name, position: b.position, archived: !!b.archived })),
    revisions: revisionRows.map((r) => ({
      ...base(r),
      clientUuid: r.client_uuid,
      caixaId: r.caixa_id,
      apiaryId: r.apiary_id ?? null,
      caixaName: r.caixa_name,
      apiaryName: r.apiary_name,
      checkedOptions: parseJson(r.checked_options, []),
      observacoes: r.observacoes,
      indicacoes: r.indicacoes,
      archived: !!r.archived,
    })),
    manejos: manejoRows.map((m) => ({
      ...base(m),
      clientUuid: m.client_uuid,
      caixaId: m.caixa_id,
      apiaryId: m.apiary_id ?? null,
      revisaoId: m.revisao_id ?? undefined,
      caixaName: m.caixa_name,
      apiaryName: m.apiary_name,
      checkedOptions: parseJson(m.checked_options, []),
      observacoes: m.observacoes,
      indicacoes: m.indicacoes,
      photoUri: m.photo_uri || undefined,
      archived: !!m.archived,
    })),
  };
  const rowsByList = { apiaries: apiaryRows, boxes: boxRows, revisions: revisionRows, manejos: manejoRows };
  const isEmpty = deletions.length === 0 && LISTS.every(({ list }) => payload[list].length === 0);
  return { payload, deletions, rowsByList, isEmpty };
}

/**
 * Conflito: o registro mudou no servidor depois que o aparelho o baixou.
 * A versão do servidor prevalece no aparelho, e o apicultor é avisado por
 * uma notificação local.
 */
async function applyConflict(table: Table, list: string, label: string, localId: number, server: unknown): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync(`UPDATE ${table} SET synced = 1, is_new = 0 WHERE id = ?;`, [localId]);
  if (server) await applyRemoteDataPull({ [list]: [server] }, { incremental: true });
  await insertNotificationLocal({
    title: 'Alteração não aplicada',
    subtitle: `${label} foi alterado em outro aparelho antes desta alteração chegar. Mantivemos a versão mais recente.`,
    read: 0,
    synced: 1,
    is_new: 1,
  });
}

/**
 * Envia as pendências pelo POST /sync, em rodadas, até não sobrar nada que
 * possa ir agora.
 *
 * @returns `null` se o servidor não tem a rota ou recusou o formato do lote
 *   (422): quem chama usa o envio antigo, que isola o registro problemático.
 * @throws SyncAuthError se a sessão expirou.
 */
export async function batchPush(): Promise<PushOutcome | null> {
  const errors: string[] = [];
  let syncedCount = 0;
  let needsFullPull = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { payload, deletions, rowsByList, isEmpty } = await buildRound(errors);
    if (isEmpty) break;

    let response: PushResponse;
    try {
      response = await apiRequest<PushResponse>('/sync', 'POST', payload);
    } catch (err: any) {
      if (isAuthError(err)) throw new SyncAuthError('Sessão expirada. Faça login novamente.');
      if (round === 0 && (isRouteMissing(err) || err?.status === 422)) return null;
      throw err;
    }

    const db = await getLocalDb();
    let progressed = false;

    for (let i = 0; i < response.deletions.length; i++) {
      const result = response.deletions[i];
      if (result.status === 'error') {
        errors.push(result.message || 'Falha ao excluir um registro.');
        continue;
      }
      // Recusada (de outro usuário) também sai da fila, como no envio antigo.
      await db.runAsync('DELETE FROM offline_deletions WHERE id = ?;', [deletions[i].rowId]);
      syncedCount++;
      progressed = true;
    }

    for (const { list, table, label } of LISTS) {
      const isNewByLocalId = new Map(rowsByList[list].map((row: any) => [row.id, !!row.is_new]));
      for (const result of response[list] ?? []) {
        if (result.status === 'created' || result.status === 'updated') {
          await updateRecordSyncStatus(table, result.localId, result.id ?? result.localId, isNewByLocalId.get(result.localId) ?? result.localId < 0);
          syncedCount++;
          progressed = true;
        } else if (result.status === 'conflict') {
          await applyConflict(table, list, label, result.localId, result.server);
          progressed = true;
        } else if (result.status === 'rejected') {
          // Reenviar não resolve: sai da fila, e o próximo download completo limpa o aparelho.
          await db.runAsync(`UPDATE ${table} SET synced = 1, is_new = 0 WHERE id = ?;`, [result.localId]);
          errors.push(result.message || 'Registro recusado pelo servidor.');
          needsFullPull = true;
          progressed = true;
        } else {
          errors.push(result.message || 'Falha ao enviar um registro.');
        }
      }
    }

    if (!progressed) break;
  }

  return { syncedCount, errors, needsFullPull };
}
