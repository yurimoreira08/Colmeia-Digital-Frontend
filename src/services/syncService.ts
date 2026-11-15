import { checkServerConnection, getCachedToken } from './apiClient';
import { handleSessionExpired } from './authService';
import { clearLocalDatabase, getLocalConfigValue, getUnsyncedCount, setLocalConfigValue } from './localDbService';
import { batchPush } from './sync/batchPush';
import { legacyPush, pushNotificationReads } from './sync/legacy';
import { pullChanges } from './sync/pull';
import { SyncAuthError } from './sync/syncErrors';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  unsyncedCount: number;
  lastError: string | null;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  pendingCount: number;
  errors: string[];
  lastSyncTime: string | null;
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

export async function syncOfflineData(): Promise<SyncResult> {
  checkAndResetSyncLock();
  if (isSyncing) {
    const pendingCount = await getUnsyncedCount();
    return {
      success: !lastError,
      syncedCount: 0,
      pendingCount,
      errors: lastError ? [lastError] : [],
      lastSyncTime,
    };
  }

  const online = await isAppOnline();
  if (!online) {
    console.log('[Sync] Dispositivo offline. Sincronização adiada.');
    // A mutação que pediu este sync criou uma pendência: o indicador do cabeçalho precisa saber.
    notifyListeners();
    const pendingCount = await getUnsyncedCount();
    return {
      success: true,
      syncedCount: 0,
      pendingCount,
      errors: [],
      lastSyncTime,
    };
  }

  // Só prossegue com a sincronização se houver token válido de autenticação
  const token = await getCachedToken();
  if (!token) {
    console.log('[Sync] Nenhum usuário autenticado com token válido. Sincronização cancelada.');
    notifyListeners();
    return {
      success: true,
      syncedCount: 0,
      pendingCount: 0,
      errors: ['No auth token'],
      lastSyncTime,
    };
  }

  isSyncing = true;
  syncingStartedAt = Date.now();
  lastError = null;
  notifyListeners();

  console.log('[Sync] Iniciando sincronização do Colmeia Digital...');
  const syncErrors: string[] = [];
  let syncedCount = 0;

  try {
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

    // ISOLAMENTO RIGOROSO DE MULTI-TENANCY:
    // Se houve troca de usuário, NUNCA empurre os dados pendentes do usuário anterior para o novo!
    // Limpa imediatamente o banco local para evitar vazamento ou contaminação entre contas.
    if (currentUserId && lastSyncedUserId && currentUserId !== lastSyncedUserId) {
      console.log('[Sync] Troca de usuário detectada durante sync. Resetando banco local para isolamento estrito...');
      await clearLocalDatabase();
    }

    if (currentUserId) {
      await setLocalConfigValue('last_synced_user_id', String(currentUserId));
    }

    // 1. Envio: em lote pelo POST /sync; servidor sem a rota usa o envio antigo.
    const pushed = (await batchPush()) ?? (await legacyPush());
    syncedCount += pushed.syncedCount;
    syncErrors.push(...pushed.errors);
    syncedCount += await pushNotificationReads();

    // 2. Download: só o que mudou desde o último sync (completo se houve recusas).
    console.log('[Sync] Baixando alterações do servidor...');
    await pullChanges({ forceFull: pushed.needsFullPull });

    lastSyncTime = new Date().toISOString();
    console.log('[Sync] Sincronização do Colmeia Digital concluída com sucesso!');
  } catch (err: any) {
    if (err instanceof SyncAuthError) {
      console.warn('[Sync] Sessão expirada (401): pedindo login de novo, sem apagar os registros do aparelho.');
      await handleSessionExpired();
    } else {
      console.error('[Sync] Falha durante a sincronização:', err);
    }
    lastError = err?.message || 'Erro durante a sincronização.';
    syncErrors.push(lastError!);
  } finally {
    isSyncing = false;
    syncingStartedAt = null;
    notifyListeners();
  }

  const pendingCount = await getUnsyncedCount();
  return {
    success: syncErrors.length === 0,
    syncedCount,
    pendingCount,
    errors: syncErrors,
    lastSyncTime,
  };
}

export function triggerSyncBackground(): void {
  void syncOfflineData().catch((err) => {
    console.warn('[Sync] Background sync trigger error:', err);
  });
}
