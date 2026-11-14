/**
 * Sync antigo, usado quando o servidor ainda não tem as rotas /sync
 * (servidor personalizado desatualizado): uma requisição por registro no
 * envio e as listagens completas no download.
 */
import { apiRequest } from '../apiClient';
import {
  applyRemoteDataPull,
  getLocalDb,
  getUnsyncedRecords,
  updateRecordSyncStatus,
} from '../localDbService';
import { uploadImageToServer } from '../storageService';
import { isAuthError, isForbiddenError, isNotFoundError, SyncAuthError, type PushOutcome } from './syncErrors';

/** Envia exclusões, apiários, caixas, revisões e manejos pendentes, um por requisição. */
export async function legacyPush(): Promise<PushOutcome> {
  const db = await getLocalDb();
  const syncErrors: string[] = [];
  let syncedCount = 0;

  // 1. PUSH - DELEÇÕES OFFLINE
  const deletions = await db.getAllAsync<{ id: number; table_name: string; record_id: number }>(
    'SELECT * FROM offline_deletions;'
  );
  const successfulDeletionIds: number[] = [];

  for (const del of deletions) {
    try {
      let endpoint = '';
      if (del.table_name === 'apiaries') endpoint = `/apiaries/${del.record_id}`;
      else if (del.table_name === 'boxes') endpoint = `/boxes/${del.record_id}`;
      else if (del.table_name === 'review_reports') endpoint = `/revisions/${del.record_id}`;
      else if (del.table_name === 'manejos') endpoint = `/manejos/${del.record_id}`;

      if (endpoint) {
        await apiRequest(endpoint, 'DELETE');
      }
      successfulDeletionIds.push(del.id);
      syncedCount++;
    } catch (err: any) {
      if (isAuthError(err)) {
        console.warn('[Sync] Não autorizado (401). Pausando sincronização.');
        throw new SyncAuthError('Sessão expirada. Faça login novamente.');
      }
      if (isForbiddenError(err) || isNotFoundError(err)) {
        // Descarte seguro: item já excluído ou sem permissão
        successfulDeletionIds.push(del.id);
      } else {
        console.warn(`[Sync] Falha ao excluir item ${del.record_id} de ${del.table_name}:`, err.message);
      }
    }
  }

  if (successfulDeletionIds.length > 0) {
    const placeholders = successfulDeletionIds.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM offline_deletions WHERE id IN (${placeholders});`, successfulDeletionIds);
  }

  // 2. PUSH - APIARIES
  const failedApiaryLocalIds = new Set<number>();
  const unsyncedApiaries = await getUnsyncedRecords('apiaries');

  for (const a of unsyncedApiaries) {
    try {
      const payload = {
        id: a.is_new ? undefined : a.id,
        name: a.name,
        location: a.location,
        boxCount: String(a.box_count),
        description: a.description,
      };
      const res = await apiRequest('/apiaries', 'POST', payload);
      if (res && res.id) {
        await updateRecordSyncStatus('apiaries', a.id, res.id, !!a.is_new);
      } else {
        await db.runAsync('UPDATE apiaries SET synced = 1, is_new = 0 WHERE id = ?;', [a.id]);
      }
      syncedCount++;
    } catch (err: any) {
      if (isAuthError(err)) {
        console.warn('[Sync] 401 ao enviar apiários. Pausando sync.');
        throw new SyncAuthError('Sessão expirada.');
      }
      if (isForbiddenError(err)) {
        await db.runAsync('UPDATE apiaries SET synced = 1, is_new = 0 WHERE id = ?;', [a.id]);
      } else {
        failedApiaryLocalIds.add(a.id);
        syncErrors.push(`Apiário "${a.name}": ${err.message || err}`);
      }
    }
  }

  // 3. PUSH - BOXES
  const unsyncedBoxes = await getUnsyncedRecords('boxes');
  for (const b of unsyncedBoxes) {
    if (b.apiary_id && failedApiaryLocalIds.has(b.apiary_id)) {
      continue;
    }
    try {
      // Garante leitura atualizada da chave estrangeira apiary_id caso tenha sido atualizada pelo sync
      const currentBox = await db.getFirstAsync<{ apiary_id: number }>('SELECT apiary_id FROM boxes WHERE id = ?;', [b.id]);
      const targetApiaryId = currentBox?.apiary_id ?? b.apiary_id;

      if (b.is_new) {
        const payload = {
          apiaryId: targetApiaryId,
          name: b.name,
          position: b.position,
        };
        const res = await apiRequest('/boxes', 'POST', payload);
        if (res && res.id) {
          await updateRecordSyncStatus('boxes', b.id, res.id, true);
          if (b.archived) {
            await apiRequest(`/boxes/${res.id}/archive`, 'POST');
          }
        } else {
          await db.runAsync('UPDATE boxes SET synced = 1, is_new = 0 WHERE id = ?;', [b.id]);
        }
        syncedCount++;
      } else {
        await apiRequest(`/boxes/${b.id}/rename`, 'PUT', { name: b.name });
        if (b.archived) {
          await apiRequest(`/boxes/${b.id}/archive`, 'POST');
        } else {
          await apiRequest(`/boxes/${b.id}/unarchive`, 'POST');
        }
        await updateRecordSyncStatus('boxes', b.id, b.id, false);
        syncedCount++;
      }
    } catch (err: any) {
      if (isAuthError(err)) {
        console.warn('[Sync] 401 ao enviar caixas. Pausando sync.');
        throw new SyncAuthError('Sessão expirada.');
      }
      if (isForbiddenError(err)) {
        await db.runAsync('UPDATE boxes SET synced = 1, is_new = 0 WHERE id = ?;', [b.id]);
      } else {
        syncErrors.push(`Caixa "${b.name}": ${err.message || err}`);
      }
    }
  }

  // 4. PUSH - REVIEWS (REVISÕES)
  const unsyncedRevisions = await getUnsyncedRecords('review_reports');
  for (const r of unsyncedRevisions) {
    if (r.apiary_id && failedApiaryLocalIds.has(r.apiary_id)) {
      continue;
    }
    try {
      // Re-consulta chaves estrangeiras atualizadas
      const freshRev = await db.getFirstAsync<{ caixa_id: number; apiary_id: number; caixa_name: string; apiary_name: string }>(
        'SELECT caixa_id, apiary_id, caixa_name, apiary_name FROM review_reports WHERE id = ?;',
        [r.id]
      );
      const targetCaixaId = freshRev?.caixa_id ?? r.caixa_id;
      const targetApiaryId = freshRev?.apiary_id ?? r.apiary_id;
      const targetCaixaName = freshRev?.caixa_name ?? r.caixa_name;
      const targetApiaryName = freshRev?.apiary_name ?? r.apiary_name;

      let checkedOptions: string[] = [];
      try {
        checkedOptions = JSON.parse(r.checked_options);
      } catch {
        checkedOptions = [];
      }

      const payload = {
        id: r.is_new ? undefined : r.id,
        clientUuid: r.client_uuid,
        caixaId: targetCaixaId,
        caixaName: targetCaixaName,
        apiaryId: targetApiaryId,
        apiaryName: targetApiaryName,
        tipo: 'apiario',
        checkedOptions,
        observacoes: r.observacoes,
        indicacoes: r.indicacoes,
      };

      if (r.is_new) {
        const res = await apiRequest('/revisions', 'POST', payload);
        if (r.archived && res?.id) {
          await apiRequest(`/revisions/${res.id}/archive`, 'POST');
        }
        await updateRecordSyncStatus('review_reports', r.id, res?.id || r.id, true);
        syncedCount++;
      } else {
        await apiRequest(`/revisions/${r.id}`, 'PUT', payload);
        if (r.archived) {
          await apiRequest(`/revisions/${r.id}/archive`, 'POST');
        } else {
          await apiRequest(`/revisions/${r.id}/unarchive`, 'POST');
        }
        await updateRecordSyncStatus('review_reports', r.id, r.id, false);
        syncedCount++;
      }
    } catch (err: any) {
      if (isAuthError(err)) {
        console.warn('[Sync] 401 ao enviar revisões. Pausando sync.');
        throw new SyncAuthError('Sessão expirada.');
      }
      if (isForbiddenError(err)) {
        await db.runAsync('UPDATE review_reports SET synced = 1, is_new = 0 WHERE id = ?;', [r.id]);
      } else {
        syncErrors.push(`Revisão: ${err.message || err}`);
      }
    }
  }

  // 5. PUSH - MANEJOS
  const unsyncedManejos = await getUnsyncedRecords('manejos');
  for (const m of unsyncedManejos) {
    if (m.apiary_id && failedApiaryLocalIds.has(m.apiary_id)) {
      continue;
    }
    try {
      // Re-consulta chaves estrangeiras atualizadas
      const freshManejo = await db.getFirstAsync<{ caixa_id: number; apiary_id: number; revisao_id: number | null; caixa_name: string; apiary_name: string }>(
        'SELECT caixa_id, apiary_id, revisao_id, caixa_name, apiary_name FROM manejos WHERE id = ?;',
        [m.id]
      );
      const targetCaixaId = freshManejo?.caixa_id ?? m.caixa_id;
      const targetApiaryId = freshManejo?.apiary_id ?? m.apiary_id;
      const targetRevisaoId = freshManejo?.revisao_id ?? m.revisao_id;
      const targetCaixaName = freshManejo?.caixa_name ?? m.caixa_name;
      const targetApiaryName = freshManejo?.apiary_name ?? m.apiary_name;

      let checkedOptions: string[] = [];
      try {
        checkedOptions = JSON.parse(m.checked_options);
      } catch {
        checkedOptions = [];
      }

      // Se houver foto local, faz o upload para o Supabase Storage com proteção de integridade
      let photoUriToSend = m.photo_uri;
      let photoUploadFailed = false;
      if (photoUriToSend && !photoUriToSend.startsWith('http://') && !photoUriToSend.startsWith('https://')) {
        try {
          const uploadedUrl = await uploadImageToServer(photoUriToSend, 'manejos');
          if (uploadedUrl) {
            photoUriToSend = uploadedUrl;
            await db.runAsync('UPDATE manejos SET photo_uri = ? WHERE id = ?;', [uploadedUrl, m.id]);
          } else {
            photoUploadFailed = true;
          }
        } catch (uploadErr) {
          console.warn('[Sync] Falha no upload da foto do manejo para o Supabase Storage:', uploadErr);
          photoUploadFailed = true;
        }
      }

      if (photoUploadFailed) {
        syncErrors.push(`Manejo da caixa "${targetCaixaName}": Falha ao subir foto para nuvem. O envio foi adiado para manter a integridade da foto.`);
        continue;
      }

      const payload = {
        id: m.is_new ? undefined : m.id,
        clientUuid: m.client_uuid,
        caixaId: targetCaixaId,
        caixaName: targetCaixaName,
        apiaryId: targetApiaryId,
        apiaryName: targetApiaryName,
        tipo: 'apiario',
        revisaoId: targetRevisaoId,
        checkedOptions,
        observacoes: m.observacoes,
        indicacoes: m.indicacoes,
        photoUri: photoUriToSend,
      };

      if (m.is_new) {
        const res = await apiRequest('/manejos', 'POST', payload);
        if (m.archived && res?.id) {
          await apiRequest(`/manejos/${res.id}/archive`, 'POST');
        }
        await updateRecordSyncStatus('manejos', m.id, res?.id || m.id, true);
        syncedCount++;
      } else {
        await apiRequest(`/manejos/${m.id}`, 'PUT', payload);
        if (m.archived) {
          await apiRequest(`/manejos/${m.id}/archive`, 'POST');
        } else {
          await apiRequest(`/manejos/${m.id}/unarchive`, 'POST');
        }
        await updateRecordSyncStatus('manejos', m.id, m.id, false);
        syncedCount++;
      }
    } catch (err: any) {
      if (isAuthError(err)) {
        console.warn('[Sync] 401 ao enviar manejos. Pausando sync.');
        throw new SyncAuthError('Sessão expirada.');
      }
      if (isForbiddenError(err)) {
        await db.runAsync('UPDATE manejos SET synced = 1, is_new = 0 WHERE id = ?;', [m.id]);
      } else {
        syncErrors.push(`Manejo: ${err.message || err}`);
      }
    }
  }

  return { syncedCount, errors: syncErrors, needsFullPull: false };
}

/** Envia ao servidor as notificações marcadas como lidas no aparelho. */
export async function pushNotificationReads(): Promise<number> {
  let syncedCount = 0;
  // 6. PUSH - NOTIFICAÇÕES (LEITURA)
  const unsyncedNotifs = await getUnsyncedRecords('notifications');
  for (const n of unsyncedNotifs) {
    try {
      if (n.read) {
        await apiRequest(`/notifications/${n.id}/read`, 'PUT');
      }
      await updateRecordSyncStatus('notifications', n.id, n.id, false);
      syncedCount++;
    } catch (err: any) {
      if (isAuthError(err)) {
        throw new SyncAuthError('Sessão expirada.');
      }
      if (isForbiddenError(err) || isNotFoundError(err)) {
        await updateRecordSyncStatus('notifications', n.id, n.id, false);
      }
    }
  }
  return syncedCount;
}

/** Baixa tudo pelas listagens e substitui o que já está sincronizado no aparelho. */
export async function legacyFullPull(): Promise<void> {
  // 7. PULL (DOWNLOAD) NÃO DESTRUTIVO E ATÔMICO DA NUVEM
  console.log('[Sync] Baixando dados atualizados do servidor...');
  const [
    remoteApiaries,
    remoteBoxes,
    remoteRevisions,
    remoteManejos,
    remoteNotifs,
  ] = await Promise.all([
    apiRequest('/apiaries', 'GET'),
    apiRequest('/boxes?includeArchived=true', 'GET'),
    apiRequest('/revisions?includeArchived=true', 'GET'),
    apiRequest('/manejos?includeArchived=true', 'GET'),
    apiRequest('/notifications', 'GET'),
  ]);

  await applyRemoteDataPull({
    apiaries: remoteApiaries,
    boxes: remoteBoxes,
    revisions: remoteRevisions,
    manejos: remoteManejos,
    notifications: remoteNotifs,
  });
}
