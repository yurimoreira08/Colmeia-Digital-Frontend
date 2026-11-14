/**
 * Aplica no SQLite local os dados baixados do servidor, preservando o que ainda não foi enviado.
 */
import { getLocalDb } from './database';

/**
 * @param options.incremental os dados são só o que mudou (GET /sync/changes):
 *   não apaga os registros que não vieram. No download completo, o que está
 *   sincronizado no aparelho e não veio do servidor é apagado.
 *
 * `server_updated_at` guarda o updatedAt do servidor: volta como
 * baseUpdatedAt no POST /sync, para detectar conflito.
 */
export async function applyRemoteDataPull(
  data: {
    apiaries?: any[];
    boxes?: any[];
    revisions?: any[];
    manejos?: any[];
    notifications?: any[];
  },
  options: { incremental?: boolean } = {},
): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    // 1. Apiários
    if (Array.isArray(data.apiaries)) {
      const apiaries = data.apiaries;
      if (!options.incremental) {
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
      }

      for (const a of apiaries) {
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

        const existing = await db.getFirstAsync<{ synced: number }>('SELECT synced FROM apiaries WHERE id = ?;', [a.id]);
        if (existing && existing.synced === 0) continue;

        await db.runAsync(
          `INSERT INTO apiaries (id, name, location, box_count, description, created_at, updated_at, synced, is_new, role, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             location = excluded.location,
             box_count = excluded.box_count,
             description = excluded.description,
             updated_at = excluded.updated_at,
             synced = 1,
             role = excluded.role,
             server_updated_at = excluded.server_updated_at
           WHERE apiaries.synced = 1;`,
          [a.id, a.name, a.location, a.boxCount, a.description, a.createdAt, a.updatedAt, a.role || 'owner', a.updatedAt || null]
        );
      }
    }

    // 2. Caixas
    if (Array.isArray(data.boxes)) {
      const boxes = data.boxes;
      if (!options.incremental) {
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
      }

      for (const b of boxes) {
        const localDuplicateBox = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM boxes WHERE synced = 0 AND apiary_id = ? AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR position = ?);',
          [b.apiaryId, b.name, b.position]
        );
        if (localDuplicateBox && localDuplicateBox.id !== b.id) {
          await db.runAsync('UPDATE review_reports SET caixa_id = ? WHERE caixa_id = ?;', [b.id, localDuplicateBox.id]);
          await db.runAsync('UPDATE manejos SET caixa_id = ? WHERE caixa_id = ?;', [b.id, localDuplicateBox.id]);
          await db.runAsync('DELETE FROM boxes WHERE id = ?;', [localDuplicateBox.id]);
        }

        const existing = await db.getFirstAsync<{ synced: number }>('SELECT synced FROM boxes WHERE id = ?;', [b.id]);
        if (existing && existing.synced === 0) continue;

        await db.runAsync(
          `INSERT INTO boxes (id, apiary_id, name, position, created_at, updated_at, archived, synced, is_new, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
           ON CONFLICT(id) DO UPDATE SET
             apiary_id = excluded.apiary_id,
             name = excluded.name,
             position = excluded.position,
             archived = excluded.archived,
             updated_at = excluded.updated_at,
             server_updated_at = excluded.server_updated_at,
             synced = 1
           WHERE boxes.synced = 1;`,
          [b.id, b.apiaryId, b.name, b.position, b.createdAt, b.updatedAt, b.archived ? 1 : 0, b.updatedAt || null]
        );
      }
    }

    // 3. Revisões
    if (Array.isArray(data.revisions)) {
      const reports = data.revisions;
      if (!options.incremental) {
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

        const existing = await db.getFirstAsync<{ synced: number }>('SELECT synced FROM review_reports WHERE id = ?;', [r.id]);
        if (existing && existing.synced === 0) continue;

        await db.runAsync(
          `INSERT INTO review_reports (id, client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, checked_options, observacoes, indicacoes, created_at, archived, synced, is_new, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
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
             server_updated_at = excluded.server_updated_at,
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
            r.updatedAt || null,
          ]
        );
      }
    }

    // 4. Manejos
    if (Array.isArray(data.manejos)) {
      const manejos = data.manejos;
      if (!options.incremental) {
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

        const existing = await db.getFirstAsync<{ synced: number }>('SELECT synced FROM manejos WHERE id = ?;', [m.id]);
        if (existing && existing.synced === 0) continue;

        await db.runAsync(
          `INSERT INTO manejos (id, client_uuid, caixa_id, caixa_name, apiary_id, apiary_name, tipo, revisao_id, checked_options, observacoes, indicacoes, photo_uri, created_at, archived, synced, is_new, server_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
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
             server_updated_at = excluded.server_updated_at,
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
            m.updatedAt || null,
          ]
        );
      }
    }

    // 5. Notificações
    if (Array.isArray(data.notifications)) {
      const notifs = data.notifications;
      const remoteIds = notifs.map((n) => n.id).filter(Boolean);
      if (remoteIds.length > 0) {
        const placeholders = remoteIds.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM notifications WHERE synced = 1 AND is_new = 0 AND id NOT IN (${placeholders});`,
          remoteIds
        );
      } else {
        await db.runAsync('DELETE FROM notifications WHERE synced = 1 AND is_new = 0;');
      }

      for (const n of notifs) {
        const existing = await db.getFirstAsync<{ synced: number }>('SELECT synced FROM notifications WHERE id = ?;', [n.id]);
        if (existing && existing.synced === 0) continue;

        await db.runAsync(
          `INSERT INTO notifications (id, title, subtitle, created_at, read, synced, is_new)
           VALUES (?, ?, ?, ?, ?, 1, 0)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             subtitle = excluded.subtitle,
             read = excluded.read,
             synced = 1
           WHERE notifications.synced = 1;`,
          [n.id, n.title, n.subtitle, n.createdAt, n.read ? 1 : 0]
        );
      }
    }
  });
}

type RemoteDeletion = { entity: string; id: number };

/** Filhos apagados junto, na ordem: o servidor registra só o pai (apiário ou caixa). */
const DELETION_CASCADE: Record<string, string[]> = {
  apiaries: ['DELETE FROM manejos WHERE apiary_id = ?;', 'DELETE FROM review_reports WHERE apiary_id = ?;', 'DELETE FROM boxes WHERE apiary_id = ?;'],
  boxes: ['DELETE FROM manejos WHERE caixa_id = ?;', 'DELETE FROM review_reports WHERE caixa_id = ?;'],
  // Como no servidor: o manejo fica e só perde o vínculo com a revisão.
  review_reports: ['UPDATE manejos SET revisao_id = NULL WHERE revisao_id = ?;'],
  manejos: [],
};

/**
 * Apaga do aparelho o que foi excluído no servidor (lista `deletions` do
 * GET /sync/changes), com os filhos. Alterações pendentes nesses registros
 * também somem: o registro não existe mais no servidor.
 */
export async function applyRemoteDeletions(deletions: RemoteDeletion[]): Promise<void> {
  if (deletions.length === 0) return;
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    for (const { entity, id } of deletions) {
      const cascade = DELETION_CASCADE[entity];
      if (!cascade) continue;
      for (const sql of cascade) await db.runAsync(sql, [id]);
      await db.runAsync(`DELETE FROM ${entity} WHERE id = ?;`, [id]);
      await db.runAsync('DELETE FROM offline_deletions WHERE table_name = ? AND record_id = ?;', [entity, id]);
    }
  });
}
