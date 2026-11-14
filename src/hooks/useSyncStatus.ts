import { useEffect, useState } from 'react';
import { subscribeToSyncStatus, type SyncStatus } from '../services/syncService';

/**
 * Estado atual da sincronização (sincronizando, pendências, último erro).
 *
 * Fica inscrito no syncService enquanto o componente estiver montado e só lê
 * o estado: não dispara sync. Devolve `null` até a primeira leitura.
 */
export function useSyncStatus(): SyncStatus | null {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSyncStatus((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return status;
}
