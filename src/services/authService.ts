import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, checkServerConnection, updateCachedUserId, updateCachedToken, getCachedToken } from './apiClient';
import { initializeLocalDb, getLocalConfigValue, setLocalConfigValue, clearLocalDatabase, hasUnsyncedRecords } from './localDbService';
import { clearSessionStore } from './sessionStore';
import { secureSet, secureDelete } from './secureStorage';
import type { User } from '../types/auth';

export type AuthResponse = User & { token?: string };

async function handleUserSessionSwitch(newUserId: number): Promise<void> {
  const previousUserStr = await getLocalConfigValue('currentUser');
  let previousUserId: number | null = null;
  if (previousUserStr) {
    try {
      const prev = JSON.parse(previousUserStr);
      if (prev?.id) previousUserId = Number(prev.id);
    } catch {}
  }

  // ISOLAMENTO ESTREITO DE MULTI-TENANCY:
  // Se for um usuário DIFERENTE ou uma nova sessão limpa:
  // NUNCA permita que a nova conta herde ou sincronize dados deixados pela conta anterior.
  // Limpa o banco local SQLite atômica e imediatamente.
  if (!previousUserId || previousUserId !== newUserId) {
    console.log('[authService] Nova conta ou troca de usuário detectada. Limpando dados locais para isolamento estrito.');
    await clearLocalDatabase();
    clearSessionStore();
  }
}

export async function bootstrapAuth(): Promise<void> {
  try {
    // Inicializar o banco SQLite local offline
    await initializeLocalDb();

    // Só dispara sincronização se estiver online E houver token válido autenticado
    const isOnline = await checkServerConnection();
    const token = await getCachedToken();
    if (isOnline && token) {
      const { syncOfflineData } = await import('./syncService');
      void syncOfflineData();
    }
  } catch (error) {
    console.error('[bootstrapAuth] Initialization/Connection check failed:', error);
  }
}

export async function register(params: {
  name: string;
  email: string;
  password: string;
  termsAcceptedVersion?: string;
}): Promise<User> {
  const result = await apiRequest<AuthResponse>('/auth/register', 'POST', {
    ...params,
    termsAcceptedVersion: params.termsAcceptedVersion || TERMS_CURRENT_VERSION,
  });
  await handleUserSessionSwitch(result.id);
  if (result.token) {
    await secureSet('auth_token', result.token);
    updateCachedToken(result.token);
  }
  await setLocalConfigValue('currentUser', JSON.stringify(result));
  updateCachedUserId(String(result.id));
  await markTermsAccepted(TERMS_CURRENT_VERSION);
  return result;
}

export async function login(params: {
  email: string;
  password: string;
}): Promise<User> {
  const result = await apiRequest<AuthResponse>('/auth/login', 'POST', params);
  await handleUserSessionSwitch(result.id);
  if (result.token) {
    await secureSet('auth_token', result.token);
    updateCachedToken(result.token);
  }
  await setLocalConfigValue('currentUser', JSON.stringify(result));
  updateCachedUserId(String(result.id));

  // Se o usuário já aceitou os termos no aparelho mas o backend ainda não registrou:
  const acceptedLocally = await isTermsAccepted();
  const backendVersion = result.terms_version || result.termsAcceptedVersion;
  if (acceptedLocally && (!result.terms_accepted_at || backendVersion !== TERMS_CURRENT_VERSION)) {
    try {
      await apiRequest('/auth/accept-terms', 'PATCH', { version: TERMS_CURRENT_VERSION });
    } catch (e) {
      console.warn('[authService] Sincronização de termos pós-login:', e);
    }
  }

  // Se o backend já possuía os termos aceitos (ex: login em novo aparelho):
  if (result.terms_accepted_at && backendVersion === TERMS_CURRENT_VERSION) {
    await markTermsAccepted(TERMS_CURRENT_VERSION);
  }

  return result;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const isOnline = await checkServerConnection();
    if (isOnline) {
      const user = await apiRequest<User>('/auth/me', 'GET');
      await setLocalConfigValue('currentUser', JSON.stringify(user));
      updateCachedUserId(String(user.id));
      return user;
    }
  } catch (error) {
    console.log('[authService] Falha ao consultar o servidor, usando login em cache.');
  }

  // Fallback para login offline
  try {
    const cachedUserStr = await getLocalConfigValue('currentUser');
    if (cachedUserStr) {
      const user = JSON.parse(cachedUserStr) as User;
      updateCachedUserId(String(user.id));
      return user;
    }
  } catch {
    // Ignorar falhas de leitura
  }
  return null;
}

export async function logout(): Promise<void> {
  try {
    const isOnline = await checkServerConnection();
    if (isOnline) {
      await apiRequest('/auth/logout', 'POST').catch(() => {});
    }
  } catch (error) {
    console.warn('[authService] Failed to notify logout to backend:', error);
  } finally {
    // 1. Limpar o banco SQLite local e cache de sessão ao sair para garantir isolamento
    await clearLocalDatabase();
    clearSessionStore();
    // 2. Remover token e dados do usuário do Secure Store e SQLite
    await secureDelete('auth_token');
    await secureDelete('currentUser');
    await setLocalConfigValue('currentUser', '');
    await setLocalConfigValue('last_synced_user_id', '');
    updateCachedUserId(null);
    updateCachedToken(null);
  }
}

export async function updateProfile(params: {
  name: string;
  email: string;
  photo?: string | null;
}): Promise<User> {
  const user = await apiRequest<User>('/auth/profile', 'PUT', params);
  await setLocalConfigValue('currentUser', JSON.stringify(user));
  updateCachedUserId(String(user.id));
  return user;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/auth/forgot-password', 'POST', { email });
}

export async function resetPassword(params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/auth/reset-password', 'POST', params);
}

export const TERMS_CURRENT_VERSION = 'v1';
export const TERMS_STORAGE_KEY = `termo_aceito_${TERMS_CURRENT_VERSION}`;

export async function isTermsAccepted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TERMS_STORAGE_KEY);
    if (val === 'true') return true;
  } catch (err) {
    console.warn('[authService] Erro ao consultar AsyncStorage para termos:', err);
  }

  // Fallback para SQLite local
  const localVal = await getLocalConfigValue(TERMS_STORAGE_KEY);
  if (localVal === 'true') return true;

  const legacyVer = await getLocalConfigValue('terms_accepted_version');
  return legacyVer === TERMS_CURRENT_VERSION;
}

export async function getAcceptedTermsVersion(): Promise<string | null> {
  const isAccepted = await isTermsAccepted();
  if (isAccepted) return TERMS_CURRENT_VERSION;
  return getLocalConfigValue('terms_accepted_version');
}

export async function markTermsAccepted(version: string = TERMS_CURRENT_VERSION): Promise<void> {
  const key = `termo_aceito_${version}`;
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch (err) {
    console.warn('[authService] Erro ao gravar AsyncStorage:', err);
  }
  await setLocalConfigValue(key, 'true');
  await setLocalConfigValue('terms_accepted_version', version);
}

export async function setAcceptedTermsVersion(version: string = TERMS_CURRENT_VERSION): Promise<void> {
  await markTermsAccepted(version);
}

export async function acceptTermsRemote(version: string = TERMS_CURRENT_VERSION): Promise<void> {
  await markTermsAccepted(version);
  try {
    const isOnline = await checkServerConnection();
    if (isOnline) {
      await apiRequest('/auth/accept-terms', 'PATCH', { version });
    }
  } catch (error) {
    console.warn('[authService] Falha ao sincronizar aceite dos termos com o backend:', error);
  }
}
