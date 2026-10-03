/**
 * Fix #9: Armazenamento seguro para dados sensíveis (tokens de autenticação).
 * 
 * Usa expo-secure-store (Keychain/iOS, Android Keystore) quando disponível.
 * Cai no SQLite como fallback para web ou quando o módulo não está presente.
 * 
 * NOTA: Para ativar expo-secure-store, instale-o com:
 *   npx expo install expo-secure-store
 */
import { Platform } from 'react-native';

// Lista de chaves consideradas sensíveis — usar Secure Store para elas
const SENSITIVE_KEYS = new Set(['currentUser', 'auth_token']);

let SecureStore: typeof import('expo-secure-store') | null = null;

// Carregamento dinâmico para não crashar se o módulo não estiver instalado
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch {
  console.warn('[secureStorage] expo-secure-store não instalado. Usando SQLite como fallback.');
}

const isSecureStoreAvailable = (): boolean => {
  return (
    SecureStore !== null &&
    Platform.OS !== 'web' &&
    typeof SecureStore.getItemAsync === 'function'
  );
};

/**
 * Salva um valor no Secure Store (chaves sensíveis) ou SQLite (demais).
 * Esta função é um wrapper — não chame diretamente, use setLocalConfigValue.
 */
export async function secureSet(key: string, value: string): Promise<boolean> {
  if (!SENSITIVE_KEYS.has(key)) return false;
  if (!isSecureStoreAvailable()) return false;

  try {
    await SecureStore!.setItemAsync(key, value, {
      keychainAccessible: SecureStore!.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (err) {
    console.warn(`[secureStorage] Falha ao salvar chave "${key}" no Secure Store:`, err);
    return false;
  }
}

/**
 * Lê um valor do Secure Store (chaves sensíveis) ou retorna null.
 * Esta função é um wrapper — não chame diretamente, use getLocalConfigValue.
 */
export async function secureGet(key: string): Promise<string | null> {
  if (!SENSITIVE_KEYS.has(key)) return null;
  if (!isSecureStoreAvailable()) return null;

  try {
    return await SecureStore!.getItemAsync(key);
  } catch (err) {
    console.warn(`[secureStorage] Falha ao ler chave "${key}" do Secure Store:`, err);
    return null;
  }
}

/**
 * Remove um valor do Secure Store (usado no logout).
 */
export async function secureDelete(key: string): Promise<void> {
  if (!SENSITIVE_KEYS.has(key)) return;
  if (!isSecureStoreAvailable()) return;

  try {
    await SecureStore!.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[secureStorage] Falha ao remover chave "${key}" do Secure Store:`, err);
  }
}
