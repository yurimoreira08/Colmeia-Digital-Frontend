import { BACKEND_BASE_URL } from '../config/variables';
import { getLocalConfigValue, setLocalConfigValue } from './localDbService';
import { secureGet } from './secureStorage';

let activeBackendUrl = BACKEND_BASE_URL;
let loadedUrl = false;

async function getBackendUrl(): Promise<string> {
  if (!loadedUrl) {
    try {
      const saved = await getLocalConfigValue('custom_backend_url');
      if (saved) {
        activeBackendUrl = saved;
      }
    } catch {
      // Ignora erro se o banco ainda não estiver inicializado
    }
    loadedUrl = true;
  }
  return activeBackendUrl;
}

export async function setCustomBackendUrl(url: string): Promise<void> {
  try {
    await setLocalConfigValue('custom_backend_url', url);
    activeBackendUrl = url;
    loadedUrl = true;
  } catch (err) {
    console.error('Falha ao salvar URL personalizada do backend:', err);
  }
}

export async function getActiveBackendUrl(): Promise<string> {
  return getBackendUrl();
}

let cachedUserId: string | null = null;
let isUserIdCached = false;
let cachedToken: string | null = null;
let isTokenCached = false;

export async function getCachedUserId(): Promise<string | null> {
  if (isUserIdCached) {
    return cachedUserId;
  }
  try {
    const cachedUserStr = await getLocalConfigValue('currentUser');
    if (cachedUserStr) {
      const user = JSON.parse(cachedUserStr);
      if (user && user.id) {
        cachedUserId = String(user.id);
      }
    } else {
      cachedUserId = null;
    }
    isUserIdCached = true;
  } catch (err) {
    console.warn('[apiClient] Falha ao ler ID do usuário do SQLite (banco ocupado?), tentando novamente na próxima requisição:', err);
  }
  return cachedUserId;
}

export function updateCachedUserId(userId: string | null) {
  cachedUserId = userId;
  isUserIdCached = true;
}

export async function getCachedToken(): Promise<string | null> {
  if (isTokenCached) {
    return cachedToken;
  }
  try {
    const token = await secureGet('auth_token');
    cachedToken = token;
    isTokenCached = true;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export function updateCachedToken(token: string | null) {
  cachedToken = token;
  isTokenCached = true;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = await getCachedToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const userId = await getCachedUserId();
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  return headers;
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): Promise<T> {
  const baseUrl = await getBackendUrl();
  const cleanBaseUrl = baseUrl.trim().replace(/\/api\/v1\/?$/, '');
  const url = `${cleanBaseUrl}/api/v1${endpoint}`;
  const headers = await getAuthHeaders();

  const options: RequestInit = {
    method,
    headers,
    credentials: 'omit', // evita problemas de CORS com cookies nativos
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    let data: any = null;
    try {
      data = await response.json();
      if (data && data.message) {
        errorMessage = data.message;
      }
    } catch {
      // Ignore parse failure
    }
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return {} as T;
}

export async function checkServerConnection(overrideUrl?: string): Promise<boolean> {
  try {
    const baseUrl = overrideUrl || await getBackendUrl();
    const cleanBaseUrl = baseUrl.trim().replace(/\/api\/v1\/?$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${cleanBaseUrl}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

