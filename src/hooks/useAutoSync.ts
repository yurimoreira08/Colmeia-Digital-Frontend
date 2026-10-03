import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { checkServerConnection } from '../services/apiClient';
import { syncOfflineData } from '../services/syncService';
import { getLocalConfigValue } from '../services/localDbService';

export function useAutoSync() {
  const isSyncingRef = useRef(false);
  const wasOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAndSync(force = false) {
      if (isSyncingRef.current || !active) return;

      try {
        // Verifica se há usuário logado no SQLite local
        let currentUserStr = null;
        try {
          currentUserStr = await getLocalConfigValue('currentUser');
        } catch {
          // Ignora se o banco ainda não estiver inicializado (ex: tela de splash)
          return;
        }

        if (!currentUserStr) {
          return;
        }

        const isOnline = await checkServerConnection();

        if (isOnline) {
          // Sincroniza se a conexão acabou de voltar, ou se é uma sincronização periódica
          if (force || wasOnlineRef.current === false || wasOnlineRef.current === null) {
            console.log('[AutoSync] Conexão ativa/restabelecida. Sincronizando dados...');
            isSyncingRef.current = true;
            await syncOfflineData();
          } else {
            // Sincronização periódica em background
            isSyncingRef.current = true;
            await syncOfflineData();
          }
          wasOnlineRef.current = true;
        } else {
          wasOnlineRef.current = false;
        }
      } catch (err) {
        console.log('[AutoSync] Erro na sincronização automática:', err);
      } finally {
        isSyncingRef.current = false;
      }
    }

    // 1. Executa na inicialização
    void checkAndSync();

    // 2. Executa a cada 20 segundos
    const intervalId = setInterval(() => {
      void checkAndSync();
    }, 20000);

    // 3. Executa ao voltar para o aplicativo (foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void checkAndSync(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      active = false;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);
}
