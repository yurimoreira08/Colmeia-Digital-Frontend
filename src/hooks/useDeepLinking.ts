import { useEffect } from 'react';
import { Linking } from 'react-native';

export function useDeepLinking(_navigationRef: any) {
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      // Deep linking handler pronto para futuras rotas do Colmeia Digital
    }

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, [_navigationRef]);
}
