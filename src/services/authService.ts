import { apiRequest, checkServerConnection, updateCachedUserId, updateCachedToken } from './apiClient';
import { initializeLocalDb, getLocalConfigValue, setLocalConfigValue } from './localDbService';
import { secureSet, secureDelete } from './secureStorage';
import type { User } from '../types/auth';

export type AuthResponse = User & { token?: string };

export async function bootstrapAuth(): Promise<void> {
  try {
    // Inicializar o banco SQLite local offline
    await initializeLocalDb();

    // Disparar sincronização inicial se online
    const isOnline = await checkServerConnection();
    if (isOnline) {
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
}): Promise<User> {
  const result = await apiRequest<AuthResponse>('/auth/register', 'POST', params);
  if (result.token) {
    await secureSet('auth_token', result.token);
    updateCachedToken(result.token);
  }
  await setLocalConfigValue('currentUser', JSON.stringify(result));
  updateCachedUserId(String(result.id));
  return result;
}

export async function login(params: {
  email: string;
  password: string;
}): Promise<User> {
  const result = await apiRequest<AuthResponse>('/auth/login', 'POST', params);
  if (result.token) {
    await secureSet('auth_token', result.token);
    updateCachedToken(result.token);
  }
  await setLocalConfigValue('currentUser', JSON.stringify(result));
  updateCachedUserId(String(result.id));
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
    // Remover token e dados do usuário do Secure Store e SQLite
    await secureDelete('auth_token');
    await secureDelete('currentUser');
    await setLocalConfigValue('currentUser', '');
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

export async function getAcceptedTermsVersion(): Promise<string | null> {
  return getLocalConfigValue('terms_accepted_version');
}

export async function setAcceptedTermsVersion(version: string = 'v1'): Promise<void> {
  await setLocalConfigValue('terms_accepted_version', version);
}

export async function acceptTermsRemote(version: string = 'v1'): Promise<void> {
  await setAcceptedTermsVersion(version);
  try {
    const isOnline = await checkServerConnection();
    if (isOnline) {
      await apiRequest('/auth/terms', 'POST', { version });
    }
  } catch (error) {
    console.warn('[authService] Failed to sync terms acceptance with backend:', error);
  }
}
