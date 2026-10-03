import { Platform } from 'react-native';

const getReleaseBackendUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url || url.trim() === '') {
    const errorMsg = '[Colmeia Digital] EXPO_PUBLIC_API_URL não está configurada para build de produção / release.';
    console.error(errorMsg);
    // Em produção, não fazemos fallback silencioso para localhost.
    // Retornamos string vazia para que as requisições de rede falhem explicitamente com erro de conexão claro.
    return '';
  }
  return url.trim();
};

const getLocalBackendUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default;
    
    // 1. Tenta obter hostUri do expoConfig (Expo Go mais comum)
    let hostUri = Constants.expoConfig?.hostUri;
    
    // 2. Tenta obter debuggerHost das propriedades extras (Expo Go moderno)
    if (!hostUri && Constants.manifest2?.extra?.expoGoLaunchMetadata?.manifest) {
      hostUri = Constants.manifest2.extra.expoGoLaunchMetadata.manifest.debuggerHost;
    }
    
    // 3. Tenta obter do manifesto clássico
    if (!hostUri && Constants.manifest) {
      hostUri = (Constants.manifest as any).debuggerHost;
    }

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:4000`;
    }
  } catch {
    // Ignora falhas se o pacote Constants não estiver disponível
  }

  // Fallbacks para emuladores
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000'; // IP padrão do host no emulador Android
  }
  return 'http://localhost:4000'; // iOS Simulator / Web
};

// Se for modo de Desenvolvimento (__DEV__ === true), usa o IP local dinâmico ou env.
// Se for Produção (__DEV__ === false), exige EXPO_PUBLIC_API_URL configurada.
export const BACKEND_BASE_URL = __DEV__ ? getLocalBackendUrl() : getReleaseBackendUrl();