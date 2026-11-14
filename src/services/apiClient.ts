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
    // O estado de conexão guardado era do servidor anterior.
    resetConnectionStatusCache();
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

export async function apiMultipartRequest<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const baseUrl = await getBackendUrl();
  const cleanBaseUrl = baseUrl.trim().replace(/\/api\/v1\/?$/, '');
  const url = `${cleanBaseUrl}/api/v1${endpoint}`;

  const headers: Record<string, string> = {};
  const token = await getCachedToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    let data: any = null;
    try {
      data = await response.json();
      if (data && data.message) {
        errorMessage = data.message;
      }
    } catch {
      // Ignore
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

/**
 * Tempo máximo esperando o /health. Curto de propósito: o app funciona
 * offline, então é melhor seguir sem rede do que travar a abertura. A
 * requisição continua acordando o Render no cold start, e a próxima
 * verificação já encontra o servidor de pé.
 */
const HEALTH_TIMEOUT_MS = 3_000;
/** Por quanto tempo um "online" é reaproveitado. */
const ONLINE_CACHE_MS = 30_000;
/** "Offline" vale por menos tempo, para o app perceber logo que a rede voltou. */
const OFFLINE_CACHE_MS = 10_000;

let cachedConnection: { isOnline: boolean; checkedAt: number } | null = null;
let connectionCheckInFlight: Promise<boolean> | null = null;

/** Esquece o estado de conexão guardado (usado em testes e ao trocar a URL do servidor). */
export function resetConnectionStatusCache(): void {
  cachedConnection = null;
  connectionCheckInFlight = null;
}

async function pingHealth(baseUrl: string): Promise<boolean> {
  const cleanBaseUrl = baseUrl.trim().replace(/\/api\/v1\/?$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${cleanBaseUrl}/api/v1/health`, { method: 'GET', signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Diz se o backend está acessível.
 *
 * Espera no máximo 3 s, reaproveita o resultado (30 s se online, 10 s se
 * offline) e junta chamadas simultâneas numa só requisição: login automático,
 * logout e sync chamam esta função em sequência na abertura do app.
 *
 * @param overrideUrl testa outro servidor; ignora e não altera o cache.
 */
export async function checkServerConnection(overrideUrl?: string): Promise<boolean> {
  if (overrideUrl) {
    return pingHealth(overrideUrl);
  }

  if (cachedConnection) {
    const maxAge = cachedConnection.isOnline ? ONLINE_CACHE_MS : OFFLINE_CACHE_MS;
    if (Date.now() - cachedConnection.checkedAt < maxAge) {
      return cachedConnection.isOnline;
    }
  }

  if (!connectionCheckInFlight) {
    connectionCheckInFlight = (async () => {
      try {
        const isOnline = await pingHealth(await getBackendUrl());
        cachedConnection = { isOnline, checkedAt: Date.now() };
        return isOnline;
      } finally {
        connectionCheckInFlight = null;
      }
    })();
  }
  return connectionCheckInFlight;
}

