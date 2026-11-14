/**
 * Avisos de estado do sync para a interface (indicador do cabeçalho).
 *
 * Toda mutação local chama triggerSyncBackground. Sem rede, o sync é adiado,
 * mas o cabeçalho precisa saber que surgiu mais uma alteração pendente.
 */
import { subscribeToSyncStatus, syncOfflineData, type SyncStatus } from '../../src/services/syncService';

// Os jest.mock abaixo são içados pelo babel-jest para antes deste import.

let mockUnsynced = 0;
let mockOnline = false;
let mockToken: string | null = 'token';

jest.mock('../../src/services/apiClient', () => ({
  checkServerConnection: jest.fn(async () => mockOnline),
  getCachedToken: jest.fn(async () => mockToken),
  apiRequest: jest.fn(),
}));
jest.mock('../../src/services/storageService', () => ({ uploadImageToServer: jest.fn() }));
jest.mock('../../src/services/localDbService', () => ({
  getUnsyncedCount: jest.fn(async () => mockUnsynced),
}));

/** Espera o getUnsyncedCount assíncrono do aviso terminar. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function lastStatusAfter(action: () => Promise<unknown>): Promise<SyncStatus | undefined> {
  const received: SyncStatus[] = [];
  const unsubscribe = subscribeToSyncStatus((status) => received.push(status));
  await flush();
  received.length = 0;

  await action();
  await flush();
  unsubscribe();
  return received.at(-1);
}

beforeEach(() => {
  mockUnsynced = 0;
  mockOnline = false;
  mockToken = 'token';
});

it('sem rede, avisa a nova contagem de pendências', async () => {
  mockUnsynced = 2;

  const status = await lastStatusAfter(() => syncOfflineData());

  expect(status).toMatchObject({ isSyncing: false, unsyncedCount: 2 });
});

it('sem login, também avisa (o cabeçalho não fica com contagem velha)', async () => {
  mockOnline = true;
  mockToken = null;
  mockUnsynced = 1;

  const status = await lastStatusAfter(() => syncOfflineData());

  expect(status).toMatchObject({ isSyncing: false, unsyncedCount: 1 });
});
