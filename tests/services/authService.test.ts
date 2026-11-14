/**
 * Garante que o usuário gravado no SQLite (texto puro, entra no backup do
 * Android) nunca contém o token de sessão nem o hash da senha, e que dados
 * gravados por versões antigas do app são limpos no boot.
 *
 * Os jest.mock abaixo são içados pelo babel-jest para antes dos imports.
 */
import { checkServerConnection } from '../../src/services/apiClient';
import * as authService from '../../src/services/authService';

// SQLite local (`app_config`) simulado como um mapa em memória.
const mockLocalConfig = new Map<string, string>();
// SecureStore simulado separadamente, para conferir onde cada dado foi parar.
const mockSecureStore = new Map<string, string>();
const mockApiRequest = jest.fn();

jest.mock('../../src/services/localDbService', () => ({
  initializeLocalDb: jest.fn(async () => undefined),
  getLocalConfigValue: jest.fn(async (key: string) => mockLocalConfig.get(key) ?? null),
  setLocalConfigValue: jest.fn(async (key: string, value: string) => {
    mockLocalConfig.set(key, value);
  }),
  clearLocalDatabase: jest.fn(async () => undefined),
  hasUnsyncedRecords: jest.fn(async () => false),
}));

jest.mock('../../src/services/secureStorage', () => ({
  secureSet: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
    return true;
  }),
  secureGet: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  secureDelete: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

jest.mock('../../src/services/apiClient', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  checkServerConnection: jest.fn(async () => false),
  getCachedToken: jest.fn(async () => null),
  updateCachedToken: jest.fn(),
  updateCachedUserId: jest.fn(),
}));

jest.mock('../../src/services/sessionStore', () => ({ clearSessionStore: jest.fn() }));

const SESSION_TOKEN = 'token-de-sessao-secreto';
const PASSWORD_HASH = '$2a$10$hashDaSenhaQueNuncaDeveriaChegarAoApp';

/** Resposta de login/registro como versões antigas do backend enviavam (com hash). */
const legacyAuthResponse = {
  id: 7,
  name: 'Apicultor Teste',
  email: 'teste@example.com',
  passwordHash: PASSWORD_HASH,
  terms_accepted_at: '2026-01-01T00:00:00.000Z',
  terms_version: 'v1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  token: SESSION_TOKEN,
};

function storedUser(): Record<string, unknown> {
  const raw = mockLocalConfig.get('currentUser');
  if (!raw) throw new Error('currentUser não foi gravado no SQLite');
  return JSON.parse(raw);
}

function expectNoSecretsInSqlite(): void {
  const everything = JSON.stringify([...mockLocalConfig.entries()]);
  expect(everything).not.toContain(SESSION_TOKEN);
  expect(everything).not.toContain(PASSWORD_HASH);
}

beforeEach(() => {
  // O authService loga a troca de usuário; não interessa à saída dos testes.
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  mockLocalConfig.clear();
  mockSecureStore.clear();
  mockApiRequest.mockReset();
  jest.mocked(checkServerConnection).mockResolvedValue(false);
});

describe('login', () => {
  it('guarda o token só no SecureStore e o usuário no SQLite sem token nem hash', async () => {
    mockApiRequest.mockResolvedValue({ ...legacyAuthResponse });

    await authService.login({ email: 'teste@example.com', password: 'qualquer' });

    expect(mockSecureStore.get('auth_token')).toBe(SESSION_TOKEN);
    expect(storedUser()).toMatchObject({ id: 7, name: 'Apicultor Teste', email: 'teste@example.com' });
    expectNoSecretsInSqlite();
  });

  it('não devolve o hash da senha para as telas', async () => {
    mockApiRequest.mockResolvedValue({ ...legacyAuthResponse });

    const user = await authService.login({ email: 'teste@example.com', password: 'qualquer' });

    expect(JSON.stringify(user)).not.toContain(PASSWORD_HASH);
  });
});

describe('register', () => {
  it('guarda o usuário no SQLite sem token nem hash', async () => {
    mockApiRequest.mockResolvedValue({ ...legacyAuthResponse });

    await authService.register({ name: 'Apicultor Teste', email: 'teste@example.com', password: 'qualquer' });

    expect(mockSecureStore.get('auth_token')).toBe(SESSION_TOKEN);
    expect(storedUser()).toMatchObject({ id: 7 });
    expectNoSecretsInSqlite();
  });
});

describe('getCurrentUser (online)', () => {
  it('atualiza o cache local sem o hash da senha', async () => {
    jest.mocked(checkServerConnection).mockResolvedValue(true);
    const { token: _token, ...meResponse } = legacyAuthResponse;
    mockApiRequest.mockResolvedValue(meResponse);

    await authService.getCurrentUser();

    expect(storedUser()).toMatchObject({ id: 7 });
    expectNoSecretsInSqlite();
  });
});

describe('updateProfile', () => {
  it('atualiza o cache local sem o hash da senha', async () => {
    const { token: _token, ...profileResponse } = legacyAuthResponse;
    mockApiRequest.mockResolvedValue({ ...profileResponse, name: 'Nome Novo' });

    await authService.updateProfile({ name: 'Nome Novo', email: 'teste@example.com' });

    expect(storedUser()).toMatchObject({ name: 'Nome Novo' });
    expectNoSecretsInSqlite();
  });
});

describe('bootstrapAuth limpa dados sensíveis de versões antigas', () => {
  it('remove token e hash do currentUser já gravado, mantendo os dados de exibição', async () => {
    mockLocalConfig.set('currentUser', JSON.stringify(legacyAuthResponse));

    await authService.bootstrapAuth();

    expect(storedUser()).toMatchObject({ id: 7, name: 'Apicultor Teste', email: 'teste@example.com' });
    expectNoSecretsInSqlite();
  });

  it('não altera um currentUser que já está limpo', async () => {
    const { token: _token, passwordHash: _hash, ...cleanUser } = legacyAuthResponse;
    const original = JSON.stringify(cleanUser);
    mockLocalConfig.set('currentUser', original);

    await authService.bootstrapAuth();

    expect(mockLocalConfig.get('currentUser')).toBe(original);
  });

  it('descarta um currentUser corrompido', async () => {
    mockLocalConfig.set('currentUser', `{"token":"${SESSION_TOKEN}", corrompido`);

    await authService.bootstrapAuth();

    expect(mockLocalConfig.get('currentUser')).toBe('');
  });
});
