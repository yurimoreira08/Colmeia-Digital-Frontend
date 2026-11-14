/**
 * Download do servidor (F3): só o que mudou desde o último sync.
 */
import { apiRequest } from '../apiClient';
import { applyRemoteDataPull, applyRemoteDeletions, getLocalConfigValue, setLocalConfigValue } from '../localDbService';
import { legacyFullPull } from './legacy';
import { isRouteMissing } from './syncErrors';

/** Chave do app_config com o `serverTime` do último download: vai como `since` no próximo. */
export const SYNC_SINCE_KEY = 'sync_since';

type SyncChangesResponse = {
  serverTime: string;
  full: boolean;
  apiaries: unknown[];
  boxes: unknown[];
  revisions: unknown[];
  manejos: unknown[];
  notifications: unknown[];
  deletions: { entity: string; id: number }[];
};

/** Esquece o último download: o próximo será completo (ex.: troca de usuário, recusas no envio). */
export async function resetSyncSince(): Promise<void> {
  await setLocalConfigValue(SYNC_SINCE_KEY, '');
}

/**
 * Baixa as alterações pelo GET /sync/changes e aplica no SQLite. Sem
 * `since` guardado (primeiro sync) ou com `forceFull`, baixa tudo e
 * substitui o que está sincronizado no aparelho.
 *
 * Servidor sem a rota (404): usa o download completo antigo.
 */
export async function pullChanges(options: { forceFull?: boolean } = {}): Promise<void> {
  const since = options.forceFull ? '' : (await getLocalConfigValue(SYNC_SINCE_KEY)) || '';

  let changes: SyncChangesResponse;
  try {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    changes = await apiRequest<SyncChangesResponse>(`/sync/changes${query}`, 'GET');
  } catch (err) {
    if (!isRouteMissing(err)) throw err;
    await legacyFullPull();
    return;
  }

  const incremental = !changes.full;
  await applyRemoteDataPull(
    {
      apiaries: changes.apiaries,
      boxes: changes.boxes,
      revisions: changes.revisions,
      manejos: changes.manejos,
      notifications: changes.notifications,
    },
    { incremental },
  );
  if (incremental) await applyRemoteDeletions(changes.deletions ?? []);

  // Só depois de aplicar: se algo falhar antes, o próximo sync pede o mesmo período.
  await setLocalConfigValue(SYNC_SINCE_KEY, changes.serverTime);
}
