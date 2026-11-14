/**
 * @jest-environment node
 */
/**
 * Sync em lote (F3): envio pelo POST /sync, download incremental pelo
 * GET /sync/changes e volta ao sync antigo quando o servidor não tem as rotas.
 *
 * SQLite real em memória; o servidor é simulado por um mapa de rotas.
 */
import {
  initializeLocalDb,
  insertApiaryLocal,
  insertBoxLocal,
  insertManejoLocal,
  insertReviewReportLocal,
  recordOfflineDeletion,
  setLocalConfigValue,
  updateReviewReportLocal,
} from '../../src/services/localDbService';
import { syncOfflineData } from '../../src/services/syncService';
import { queryMemory, resetMemoryDatabase } from '../helpers/sqliteMemory';

jest.mock('expo-sqlite', () => jest.requireActual('../helpers/sqliteMemory').expoSqliteMock);

type Handler = (body: any, endpoint: string) => any;
let mockRoutes: Record<string, Handler> = {};
const mockCalls: { route: string; body: any }[] = [];

jest.mock('../../src/services/apiClient', () => ({
  checkServerConnection: jest.fn(async () => true),
  getCachedToken: jest.fn(async () => 'token'),
  apiRequest: jest.fn(async (endpoint: string, method: string, body?: any) => {
    const route = `${method} ${endpoint.split('?')[0]}`;
    mockCalls.push({ route: `${method} ${endpoint}`, body });
    const handler = mockRoutes[route];
    if (!handler) {
      const error: any = new Error(`Erro HTTP 404 em ${route}`);
      error.status = 404;
      throw error;
    }
    return handler(body, endpoint);
  }),
}));
jest.mock('../../src/services/storageService', () => ({
  uploadImageToServer: jest.fn(async () => 'https://storage.example/foto.jpg'),
}));

const T0 = '2026-06-01T12:00:00.000Z';
const T1 = '2026-06-02T12:00:00.000Z';
const emptyChanges = (extra: Record<string, unknown> = {}) => ({
  serverTime: T1, full: false, apiaries: [], boxes: [], revisions: [], manejos: [], notifications: [], deletions: [], ...extra,
});
const fields = (apiaryId: number, boxId: number) => ({
  caixa_id: boxId, caixa_name: 'Caixa 01', apiary_id: apiaryId, apiary_name: 'Sede', checked_options: '[]', observacoes: '', indicacoes: '',
});
const calls = (prefix: string) => mockCalls.filter((c) => c.route.startsWith(prefix));
const rows = <T>(sql: string) => queryMemory<T>(sql);

/** Resposta do POST /sync que aceita tudo, dando ids do servidor a partir de `firstId`. */
function acceptAll(firstId: number) {
  let next = firstId;
  return (body: any) => {
    const ok = (items: any[]) => items.map((item) => ({ localId: item.localId, status: item.id ? 'updated' : 'created', id: item.id ?? next++ }));
    return {
      serverTime: T1,
      deletions: body.deletions.map((d: any) => ({ ...d, status: 'deleted' })),
      apiaries: ok(body.apiaries),
      boxes: ok(body.boxes),
      revisions: ok(body.revisions),
      manejos: ok(body.manejos),
    };
  };
}

beforeEach(async () => {
  resetMemoryDatabase();
  mockCalls.length = 0;
  mockRoutes = {};
  await initializeLocalDb();
  await setLocalConfigValue('currentUser', JSON.stringify({ id: 1 }));
  await setLocalConfigValue('last_synced_user_id', '1');
});

describe('envio em lote', () => {
  it('apiário, caixa, revisão e manejo criados offline vão numa requisição só, com os ids ligados', async () => {
    const apiaryId = await insertApiaryLocal({ name: 'Sede', location: 'Teresina', box_count: 1, description: '' });
    const boxId = await insertBoxLocal({ apiary_id: apiaryId, name: 'Caixa 01', position: 1 });
    const revisionId = await insertReviewReportLocal(fields(apiaryId, boxId));
    await insertManejoLocal({ ...fields(apiaryId, boxId), revisao_id: revisionId, checked_options: '[{"id":"alimentacao","obs":"","ind":""}]' });
    await setLocalConfigValue('sync_since', T0);
    mockRoutes['POST /sync'] = acceptAll(10);
    mockRoutes['GET /sync/changes'] = () => emptyChanges();

    const result = await syncOfflineData();

    expect(result.errors).toEqual([]);
    expect(calls('POST')).toHaveLength(1);
    const [{ body }] = calls('POST /sync');
    expect(body.boxes[0]).toMatchObject({ localId: boxId, apiaryId });
    expect(body.manejos[0]).toMatchObject({ caixaId: boxId, revisaoId: revisionId });
    expect(rows('SELECT id, synced FROM apiaries')).toEqual([{ id: 10, synced: 1 }]);
    expect(rows('SELECT id, apiary_id FROM boxes')).toEqual([{ id: 11, apiary_id: 10 }]);
    expect(rows('SELECT caixa_id, revisao_id, synced FROM manejos')).toEqual([{ caixa_id: 11, revisao_id: 12, synced: 1 }]);
    expect(result.pendingCount).toBe(0);
  });

  it('manda o updatedAt do servidor como baseUpdatedAt ao enviar uma alteração', async () => {
    mockRoutes['GET /sync/changes'] = () => emptyChanges({
      full: true,
      apiaries: [{ id: 10, name: 'Sede', location: 'T', boxCount: 1, description: '', createdAt: T0, updatedAt: T0 }],
      boxes: [{ id: 100, apiaryId: 10, name: 'Caixa 01', position: 1, createdAt: T0, updatedAt: T0, archived: false }],
      revisions: [{ id: 300, caixaId: 100, apiaryId: 10, caixaName: 'Caixa 01', apiaryName: 'Sede', checkedOptions: [], observacoes: '', indicacoes: '', createdAt: T0, updatedAt: T0 }],
    });
    await syncOfflineData();
    await updateReviewReportLocal(300, { observacoes: 'Mel escuro' });
    mockRoutes['POST /sync'] = acceptAll(1);

    await syncOfflineData();

    expect(calls('POST /sync')[0].body.revisions).toEqual([
      expect.objectContaining({ localId: 300, id: 300, observacoes: 'Mel escuro', baseUpdatedAt: T0 }),
    ]);
  });

  it('conflito: fica a versão do servidor e o apicultor é avisado', async () => {
    mockRoutes['GET /sync/changes'] = () => emptyChanges({
      full: true,
      revisions: [{ id: 300, caixaId: 100, apiaryId: 10, caixaName: 'Caixa 01', apiaryName: 'Sede', checkedOptions: [], observacoes: '', indicacoes: '', createdAt: T0, updatedAt: T0 }],
    });
    await syncOfflineData();
    await updateReviewReportLocal(300, { observacoes: 'Daqui' });
    mockRoutes['POST /sync'] = () => ({
      serverTime: T1, deletions: [], apiaries: [], boxes: [], manejos: [],
      revisions: [{ localId: 300, status: 'conflict', id: 300, server: { id: 300, caixaId: 100, apiaryId: 10, caixaName: 'Caixa 01', apiaryName: 'Sede', checkedOptions: [], observacoes: 'Do outro aparelho', indicacoes: '', createdAt: T0, updatedAt: T1 } }],
    });
    mockRoutes['GET /sync/changes'] = () => emptyChanges();

    const result = await syncOfflineData();

    expect(rows('SELECT observacoes, synced, server_updated_at FROM review_reports')).toEqual([{ observacoes: 'Do outro aparelho', synced: 1, server_updated_at: T1 }]);
    expect(rows<{ title: string }>('SELECT title FROM notifications').map((n) => n.title)).toEqual(['Alteração não aplicada']);
    expect(result.pendingCount).toBe(0);
  });

  it('recusado sai da fila e o próximo download é completo', async () => {
    await setLocalConfigValue('sync_since', T0);
    await insertApiaryLocal({ name: 'X', location: 'Y', box_count: 1, description: '' });
    mockRoutes['POST /sync'] = (body) => ({
      serverTime: T1, deletions: [], boxes: [], revisions: [], manejos: [],
      apiaries: [{ localId: body.apiaries[0].localId, status: 'rejected', message: 'Informe o nome do apiário.' }],
    });
    mockRoutes['GET /sync/changes'] = () => emptyChanges({ full: true });

    const result = await syncOfflineData();

    expect(result.errors).toEqual(['Informe o nome do apiário.']);
    expect(calls('GET /sync/changes').map((c) => c.route)).toEqual(['GET /sync/changes']);
    expect(rows('SELECT * FROM apiaries')).toEqual([]);
  });

  it('a foto local sobe antes e o lote leva só a URL', async () => {
    const apiaryId = await insertApiaryLocal({ name: 'Sede', location: 'T', box_count: 1, description: '' });
    const boxId = await insertBoxLocal({ apiary_id: apiaryId, name: 'Caixa 01', position: 1 });
    await insertManejoLocal({ ...fields(apiaryId, boxId), photo_uri: 'file:///foto.jpg' });
    mockRoutes['POST /sync'] = acceptAll(10);
    mockRoutes['GET /sync/changes'] = () => emptyChanges();

    await syncOfflineData();

    expect(calls('POST /sync')[0].body.manejos[0].photoUri).toBe('https://storage.example/foto.jpg');
  });

  it('exclusão feita offline vai no lote e sai da fila', async () => {
    await recordOfflineDeletion('boxes', 100);
    mockRoutes['POST /sync'] = acceptAll(1);
    mockRoutes['GET /sync/changes'] = () => emptyChanges();

    await syncOfflineData();

    expect(calls('POST /sync')[0].body.deletions).toEqual([{ entity: 'boxes', id: 100 }]);
    expect(rows('SELECT * FROM offline_deletions')).toEqual([]);
  });
});

describe('download incremental', () => {
  it('o primeiro é completo; os seguintes mandam o since e aplicam as exclusões com os filhos', async () => {
    mockRoutes['GET /sync/changes'] = () => emptyChanges({
      full: true,
      serverTime: T0,
      apiaries: [{ id: 10, name: 'Sede', location: 'T', boxCount: 2, description: '', createdAt: T0, updatedAt: T0 }],
      boxes: [
        { id: 100, apiaryId: 10, name: 'Caixa 01', position: 1, createdAt: T0, updatedAt: T0, archived: false },
        { id: 101, apiaryId: 10, name: 'Caixa 02', position: 2, createdAt: T0, updatedAt: T0, archived: false },
      ],
      revisions: [{ id: 300, caixaId: 100, apiaryId: 10, caixaName: 'Caixa 01', apiaryName: 'Sede', checkedOptions: [], observacoes: '', indicacoes: '', createdAt: T0, updatedAt: T0 }],
    });
    await syncOfflineData();
    mockRoutes['GET /sync/changes'] = () => emptyChanges({
      boxes: [{ id: 101, apiaryId: 10, name: 'Caixa renomeada', position: 2, createdAt: T0, updatedAt: T1, archived: false }],
      deletions: [{ entity: 'boxes', id: 100 }],
    });

    await syncOfflineData();

    expect(calls('GET /sync/changes').map((c) => c.route)).toEqual(['GET /sync/changes', `GET /sync/changes?since=${encodeURIComponent(T0)}`]);
    // O que não veio no incremental continua (o apiário); a caixa excluída some com a revisão dela.
    expect(rows('SELECT id FROM apiaries')).toEqual([{ id: 10 }]);
    expect(rows('SELECT id, name FROM boxes')).toEqual([{ id: 101, name: 'Caixa renomeada' }]);
    expect(rows('SELECT * FROM review_reports')).toEqual([]);
    expect(rows("SELECT value FROM app_config WHERE key = 'sync_since'")).toEqual([{ value: T1 }]);
  });

  it('limpar o banco local (logout ou troca de usuário) volta ao download completo', async () => {
    await setLocalConfigValue('sync_since', T0);
    await setLocalConfigValue('currentUser', JSON.stringify({ id: 2 }));
    mockRoutes['GET /sync/changes'] = () => emptyChanges({ full: true });

    await syncOfflineData();

    expect(calls('GET /sync/changes').map((c) => c.route)).toEqual(['GET /sync/changes']);
  });
});

describe('servidor sem as rotas novas', () => {
  it('usa o envio por registro e as listagens completas', async () => {
    await insertApiaryLocal({ name: 'Sede', location: 'T', box_count: 1, description: '' });
    mockRoutes['POST /apiaries'] = () => ({ id: 10 });
    for (const route of ['GET /apiaries', 'GET /boxes', 'GET /revisions', 'GET /manejos', 'GET /notifications']) mockRoutes[route] = () => [];

    const result = await syncOfflineData();

    expect(result.errors).toEqual([]);
    expect(calls('POST').map((c) => c.route)).toEqual(['POST /sync', 'POST /apiaries']);
    expect(calls('GET').map((c) => c.route.split('?')[0])).toEqual(['GET /sync/changes', 'GET /apiaries', 'GET /boxes', 'GET /revisions', 'GET /manejos', 'GET /notifications']);
  });
});
