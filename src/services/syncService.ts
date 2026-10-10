import { apiRequest, checkServerConnection } from './apiClient';
import { uploadImageToServer } from './storageService';
import {
  getLocalDb,
  getUnsyncedRecords,
  getUnsyncedCount,
  updateRecordSyncStatus,
  getLocalConfigValue,
  setLocalConfigValue,
  forceAllRecordsUnsynced,
  clearLocalDatabase,
  hasUnsyncedRecords,
  replaceApiariesLocal,
  replaceBoxesLocal,
  replaceReviewReportsLocal,
  replaceManejosLocal,
  replaceNotificationsLocal,
} from './localDbService';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  unsyncedCount: number;
  lastError: string | null;
}

let isSyncing = false;
let syncingStartedAt: number | null = null;
let lastSyncTime: string | null = null;
let lastError: string | null = null;
const MAX_SYNC_TIMEOUT_MS = 5 * 60 * 1000;

type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();

function notifyListeners(): void {
  void getUnsyncedCount().then((unsyncedCount) => {
    const status: SyncStatus = {
      isSyncing,
      lastSyncTime,
      unsyncedCount,
      lastError,
    };
    listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.warn('[Sync] Listener error:', err);
      }
    });
  });
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  notifyListeners();
  return () => {
    listeners.delete(listener);
  };
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const unsyncedCount = await getUnsyncedCount();
  return {
    isSyncing,
    lastSyncTime,
    unsyncedCount,
    lastError,
  };
}

function checkAndResetSyncLock(): void {
  if (isSyncing && syncingStartedAt && Date.now() - syncingStartedAt > MAX_SYNC_TIMEOUT_MS) {
    console.warn('[Sync] Sync lock travado por mais de 5 minutos. Resetando...');
    isSyncing = false;
    syncingStartedAt = null;
  }
}

export async function isAppOnline(): Promise<boolean> {
  return checkServerConnection();
}

function isAuthError(err: any): boolean {
  return err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Não autorizado');
}

function isForbiddenError(err: any): boolean {
  return err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Forbidden');
}

function isNotFoundError(err: any): boolean {
  return err?.status === 404 || err?.message?.includes('404') || err?.message?.includes('não encontrado');
}

export async function syncOfflineData(): Promise<void> {
  checkAndResetSyncLock();
  if (isSyncing) return;

  const online = await isAppOnline();
  if (!online) {
    console.log('[Sync] Dispositivo offline. Sincronização adiada.');
    return;
  }

  isSyncing = true;
  syncingStartedAt = Date.now();
  lastError = null;
  notifyListeners();

  console.log('[Sync] Iniciando sincronização do Colmeia Digital...');
  const syncErrors: string[] = [];

  try {
    const db = await getLocalDb();

    // 0. MULTI-TENANCY & DETECÇÃO DE USUÁRIO
    const currentUserStr = await getLocalConfigValue('currentUser');
    let currentUserId: number | null = null;
    if (currentUserStr) {
      try {
        const user = JSON.parse(currentUserStr);
        currentUserId = user?.id ? Number(user.id) : null;
      } catch {}
    }

    const lastSyncedUserIdStr = await getLocalConfigValue('last_synced_user_id');
    const lastSyncedUserId = lastSyncedUserIdStr ? Number(lastSyncedUserIdStr) : null;

    if (currentUserId && lastSyncedUserId && currentUserId !== lastSyncedUserId) {
      const hasPending = await hasUnsyncedRecords();
      if (hasPending) {
        console.warn('[Sync] Troca de usuário com dados pendentes. Mantendo dados para sync.');
      } else {
        console.log('[Sync] Novo usuário autenticado. Resetando cache local...');
        await clearLocalDatabase();
        await setLocalConfigValue('multitenancy_migrated', 'false');
      }
    }

    if (currentUserId) {
      await setLocalConfigValue('last_synced_user_id', String(currentUserId));
    }

    const migrated = await getLocalConfigValue('multitenancy_migrated');
    if (migrated !== 'true') {
      try {
        const remoteApiaries = await apiRequest('/apiaries', 'GET');
        const localApiaries = await db.getAllAsync('SELECT id FROM apiaries;');

        if (Array.isArray(remoteApiaries) && remoteApiaries.length === 0 && localApiaries.length > 0) {
          console.log('[Sync] Conta sem dados na nuvem, preservando locais para upload...');
          await forceAllRecordsUnsynced();
        }
        await setLocalConfigValue('multitenancy_migrated', 'true');
      } catch (err) {
        if (isAuthError(err)) {
          console.warn('[Sync] Sessão expirada durante checagem multi-tenant. Abortando sync.');
          return;
        }
        console.error('[Sync] Falha na migração multi-tenant:', err);
      }
    }

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
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn('[Sync] Não autorizado (401). Pausando sincronização.');
          lastError = 'Sessão expirada. Faça login novamente.';
          return;
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
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn('[Sync] 401 ao enviar apiários. Pausando sync.');
          lastError = 'Sessão expirada.';
          return;
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
          } else {
            await db.runAsync('UPDATE boxes SET synced = 1, is_new = 0 WHERE id = ?;', [b.id]);
          }
        } else {
          await apiRequest(`/boxes/${b.id}/rename`, 'PUT', { name: b.name });
          if (b.archived) {
            await apiRequest(`/boxes/${b.id}/archive`, 'POST');
          } else {
            await apiRequest(`/boxes/${b.id}/unarchive`, 'POST');
          }
          await updateRecordSyncStatus('boxes', b.id, b.id, false);
        }
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn('[Sync] 401 ao enviar caixas. Pausando sync.');
          lastError = 'Sessão expirada.';
          return;
        }
        if (isForbiddenError(err)) {
          await db.runAsync('UPDATE boxes SET synced = 1, is_new = 0 WHERE id = ?;', [b.id]);
        } else {
          syncErrors.push(`Caixa "${b.name}": ${err.message || err}`);
        }
      }
    }

    // 4. PUSH - REVIEWS (INSPEÇÕES)
    const unsyncedRevisions = await getUnsyncedRecords('review_reports');
    for (const r of unsyncedRevisions) {
      if (r.apiary_id && failedApiaryLocalIds.has(r.apiary_id)) {
        continue;
      }
      try {
        let checkedOptions: string[] = [];
        try {
          checkedOptions = JSON.parse(r.checked_options);
        } catch {
          checkedOptions = [];
        }

        const payload = {
          id: r.is_new ? undefined : r.id,
          clientUuid: r.client_uuid,
          caixaId: r.caixa_id,
          caixaName: r.caixa_name,
          apiaryId: r.apiary_id,
          apiaryName: r.apiary_name,
          tipo: 'apiario',
          checkedOptions,
          observacoes: r.observacoes,
          indicacoes: r.indicacoes,
        };

        if (r.is_new) {
          const res = await apiRequest('/revisions', 'POST', payload);
          await updateRecordSyncStatus('review_reports', r.id, res?.id || r.id, true);
        } else {
          await apiRequest(`/revisions/${r.id}`, 'PUT', payload);
          if (r.archived) {
            await apiRequest(`/revisions/${r.id}/archive`, 'POST');
          } else {
            await apiRequest(`/revisions/${r.id}/unarchive`, 'POST');
          }
          await updateRecordSyncStatus('review_reports', r.id, r.id, false);
        }
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn('[Sync] 401 ao enviar inspeções. Pausando sync.');
          lastError = 'Sessão expirada.';
          return;
        }
        if (isForbiddenError(err)) {
          await db.runAsync('UPDATE review_reports SET synced = 1, is_new = 0 WHERE id = ?;', [r.id]);
        } else {
          syncErrors.push(`Inspeção: ${err.message || err}`);
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
        let checkedOptions: string[] = [];
        try {
          checkedOptions = JSON.parse(m.checked_options);
        } catch {
          checkedOptions = [];
        }

        // Se houver foto local, faz o upload para o Supabase Storage
        let photoUriToSend = m.photo_uri;
        if (photoUriToSend && !photoUriToSend.startsWith('http://') && !photoUriToSend.startsWith('https://')) {
          try {
            const uploadedUrl = await uploadImageToServer(photoUriToSend, 'manejos');
            if (uploadedUrl) {
              photoUriToSend = uploadedUrl;
              await db.runAsync('UPDATE manejos SET photo_uri = ? WHERE id = ?;', [uploadedUrl, m.id]);
            }
          } catch (uploadErr) {
            console.warn('[Sync] Falha no upload da foto do manejo para o Supabase Storage (mantendo envio de dados):', uploadErr);
          }
        }

        const payload = {
          id: m.is_new ? undefined : m.id,
          clientUuid: m.client_uuid,
          caixaId: m.caixa_id,
          caixaName: m.caixa_name,
          apiaryId: m.apiary_id,
          apiaryName: m.apiary_name,
          tipo: 'apiario',
          revisaoId: m.revisao_id,
          checkedOptions,
          observacoes: m.observacoes,
          indicacoes: m.indicacoes,
          photoUri: photoUriToSend,
        };

        if (m.is_new) {
          const res = await apiRequest('/manejos', 'POST', payload);
          await updateRecordSyncStatus('manejos', m.id, res?.id || m.id, true);
        } else {
          await apiRequest(`/manejos/${m.id}`, 'PUT', payload);
          if (m.archived) {
            await apiRequest(`/manejos/${m.id}/archive`, 'POST');
          } else {
            await apiRequest(`/manejos/${m.id}/unarchive`, 'POST');
          }
          await updateRecordSyncStatus('manejos', m.id, m.id, false);
        }
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn('[Sync] 401 ao enviar manejos. Pausando sync.');
          lastError = 'Sessão expirada.';
          return;
        }
        if (isForbiddenError(err)) {
          await db.runAsync('UPDATE manejos SET synced = 1, is_new = 0 WHERE id = ?;', [m.id]);
        } else {
          syncErrors.push(`Manejo: ${err.message || err}`);
        }
      }
    }

    // 6. PUSH - NOTIFICAÇÕES (LEITURA)
    const unsyncedNotifs = await getUnsyncedRecords('notifications');
    for (const n of unsyncedNotifs) {
      try {
        if (n.read) {
          await apiRequest(`/notifications/${n.id}/read`, 'PUT');
        }
        await updateRecordSyncStatus('notifications', n.id, n.id, false);
      } catch (err: any) {
        if (isAuthError(err)) {
          return;
        }
        if (isForbiddenError(err) || isNotFoundError(err)) {
          await updateRecordSyncStatus('notifications', n.id, n.id, false);
        }
      }
    }

    // 7. PULL (DOWNLOAD) NÃO DESTRUTIVO DA NUVEM
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

    if (Array.isArray(remoteApiaries)) await replaceApiariesLocal(remoteApiaries);
    if (Array.isArray(remoteBoxes)) await replaceBoxesLocal(remoteBoxes);
    if (Array.isArray(remoteRevisions)) await replaceReviewReportsLocal(remoteRevisions);
    if (Array.isArray(remoteManejos)) await replaceManejosLocal(remoteManejos);
    if (Array.isArray(remoteNotifs)) await replaceNotificationsLocal(remoteNotifs);

    lastSyncTime = new Date().toISOString();
    console.log('[Sync] Sincronização do Colmeia Digital concluída com sucesso!');
  } catch (err: any) {
    console.error('[Sync] Falha durante a sincronização:', err);
    lastError = err?.message || 'Erro durante a sincronização.';
  } finally {
    isSyncing = false;
    syncingStartedAt = null;
    notifyListeners();
  }
}

export function triggerSyncBackground(): void {
  void syncOfflineData().catch((err) => {
    console.warn('[Sync] Background sync trigger error:', err);
  });
}
