/**
 * @jest-environment node
 */
/**
 * Ids temporários de registros criados offline (correção do F2).
 *
 * Registros criados no aparelho recebem ids **negativos**; o servidor só
 * gera ids positivos. Assim a troca do id temporário pelo id do servidor
 * nunca colide com outro registro local que ainda não foi enviado.
 * Registros pendentes de versões antigas do app (ids temporários positivos)
 * são renumerados uma vez, no initializeLocalDb.
 */
import {
  cleanupDuplicateBoxesLocal,
  initializeLocalDb,
  insertApiaryLocal,
  insertBoxLocal,
  insertManejoLocal,
  insertReviewReportLocal,
  updateRecordSyncStatus,
} from '../../src/services/localDbService';
import { queryMemory, resetMemoryDatabase } from '../helpers/sqliteMemory';

// Hoisted pelo babel-jest para antes dos imports.
jest.mock('expo-sqlite', () => jest.requireActual('../helpers/sqliteMemory').expoSqliteMock);

const NOW = '2026-06-01T12:00:00.000Z';

const newApiary = (name: string) => insertApiaryLocal({ name, location: 'Teresina', box_count: 1, description: '' });
const newBox = (apiaryId: number, name: string) => insertBoxLocal({ apiary_id: apiaryId, name, position: 1 });
const recordFields = (apiaryId: number, boxId: number) => ({
  caixa_id: boxId, caixa_name: 'Caixa', apiary_id: apiaryId, apiary_name: 'Apiário', checked_options: '[]', observacoes: '', indicacoes: '',
});

/** Insere uma linha como versões antigas do app faziam: id temporário positivo. */
function insertLegacy(table: string, row: Record<string, unknown>) {
  const columns = Object.keys(row);
  queryMemory(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, Object.values(row));
}
const legacyApiary = (id: number, name: string, synced = 0, isNew = 1) =>
  insertLegacy('apiaries', { id, name, location: 'Teresina', box_count: 1, description: '', created_at: NOW, updated_at: NOW, synced, is_new: isNew });
const legacyBox = (id: number, apiaryId: number, name: string, synced = 0, isNew = 1) =>
  insertLegacy('boxes', { id, apiary_id: apiaryId, name, position: 1, created_at: NOW, updated_at: NOW, synced, is_new: isNew });
const legacyRecord = (table: 'review_reports' | 'manejos', id: number, apiaryId: number, boxId: number, extra: Record<string, unknown> = {}) =>
  insertLegacy(table, { id, caixa_id: boxId, caixa_name: 'Caixa', apiary_id: apiaryId, apiary_name: 'Apiário', checked_options: '[]', observacoes: '', indicacoes: '', created_at: NOW, synced: 0, is_new: 1, ...extra });

const rows = <T>(sql: string) => queryMemory<T>(sql);
const boxOwner = (name: string) => queryMemory<{ apiary_id: number }>('SELECT apiary_id FROM boxes WHERE name = ?', [name])[0]?.apiary_id;
const apiaryIdByName = (name: string) => queryMemory<{ id: number }>('SELECT id FROM apiaries WHERE name = ?', [name])[0]?.id;

beforeEach(async () => {
  resetMemoryDatabase();
  await initializeLocalDb();
});

describe('registros criados offline recebem ids negativos', () => {
  it('apiários: cada novo id é negativo e diferente dos anteriores', async () => {
    const first = await newApiary('A');
    const second = await newApiary('B');

    expect(first).toBeLessThan(0);
    expect(second).toBeLessThan(first);
  });

  it('continua negativo mesmo com registros do servidor (ids positivos) no aparelho', async () => {
    legacyApiary(50, 'Do servidor', 1, 0);

    expect(await newApiary('Novo')).toBeLessThan(0);
  });

  it('caixas, revisões e manejos também', async () => {
    const apiaryId = await newApiary('A');
    const boxId = await newBox(apiaryId, 'Caixa 01');
    const reviewId = await insertReviewReportLocal(recordFields(apiaryId, boxId));
    const manejoId = await insertManejoLocal(recordFields(apiaryId, boxId));

    expect([boxId, reviewId, manejoId].every((id) => id < 0)).toBe(true);
    expect(rows('SELECT apiary_id FROM boxes')).toEqual([{ apiary_id: apiaryId }]);
  });
});

describe('F2: a troca pelo id do servidor não mistura registros locais', () => {
  it('o apiário que recebe um id do servidor não engole outro apiário pendente', async () => {
    const apiaryA = await newApiary('Apiário A');
    const apiaryB = await newApiary('Apiário B');
    await newBox(apiaryA, 'Caixa do A');
    await newBox(apiaryB, 'Caixa do B');

    // Qualquer id positivo que o servidor devolva é seguro, inclusive o "mesmo número" de outro registro local.
    await updateRecordSyncStatus('apiaries', apiaryA, Math.abs(apiaryB), true);

    expect(apiaryIdByName('Apiário A')).toBe(Math.abs(apiaryB));
    expect(apiaryIdByName('Apiário B')).toBe(apiaryB);
    expect(boxOwner('Caixa do A')).toBe(Math.abs(apiaryB));
    expect(boxOwner('Caixa do B')).toBe(apiaryB);
  });
});

describe('migração de registros pendentes de versões antigas (ids temporários positivos)', () => {
  it('renumera para ids negativos e re-aponta os filhos', async () => {
    legacyApiary(1, 'Apiário A');
    legacyBox(10, 1, 'Caixa do A');
    legacyRecord('review_reports', 20, 1, 10);
    legacyRecord('manejos', 30, 1, 10, { revisao_id: 20 });

    await initializeLocalDb();

    const apiaryId = apiaryIdByName('Apiário A');
    expect(apiaryId).toBeLessThan(0);
    const [box] = rows<{ id: number; apiary_id: number }>('SELECT id, apiary_id FROM boxes');
    expect(box.id).toBeLessThan(0);
    expect(box.apiary_id).toBe(apiaryId);
    const [review] = rows<{ id: number; apiary_id: number; caixa_id: number }>('SELECT id, apiary_id, caixa_id FROM review_reports');
    expect(review).toEqual({ id: expect.any(Number), apiary_id: apiaryId, caixa_id: box.id });
    expect(review.id).toBeLessThan(0);
    expect(rows('SELECT apiary_id, caixa_id, revisao_id FROM manejos')).toEqual([{ apiary_id: apiaryId, caixa_id: box.id, revisao_id: review.id }]);
  });

  it('não mexe em registros que já estão no servidor nem nos filhos deles', async () => {
    legacyApiary(50, 'Do servidor', 1, 0);
    legacyBox(60, 50, 'Caixa do servidor', 1, 0);

    await initializeLocalDb();

    expect(rows('SELECT id, name FROM apiaries')).toEqual([{ id: 50, name: 'Do servidor' }]);
    expect(rows('SELECT id, apiary_id FROM boxes')).toEqual([{ id: 60, apiary_id: 50 }]);
  });

  it('caixa nova pendente dentro de apiário que já está no servidor mantém o apiário', async () => {
    legacyApiary(50, 'Do servidor', 1, 0);
    legacyBox(3, 50, 'Caixa nova');

    await initializeLocalDb();

    const [box] = rows<{ id: number; apiary_id: number }>('SELECT id, apiary_id FROM boxes');
    expect(box.id).toBeLessThan(0);
    expect(box.apiary_id).toBe(50);
  });

  it('rodar de novo não muda nada', async () => {
    legacyApiary(1, 'Apiário A');
    legacyBox(10, 1, 'Caixa do A');
    await initializeLocalDb();
    const after = JSON.stringify([rows('SELECT * FROM apiaries'), rows('SELECT * FROM boxes')]);

    await initializeLocalDb();

    expect(JSON.stringify([rows('SELECT * FROM apiaries'), rows('SELECT * FROM boxes')])).toBe(after);
  });

  it('depois da migração, o cenário do F2 com dados antigos não perde nada', async () => {
    legacyApiary(1, 'Apiário A');
    legacyApiary(2, 'Apiário B');
    legacyBox(10, 1, 'Caixa do A');
    legacyBox(11, 2, 'Caixa do B');
    await initializeLocalDb();
    const apiaryA = apiaryIdByName('Apiário A');

    // O servidor devolve id 2 para o apiário A (o número que o B tinha antes da migração).
    await updateRecordSyncStatus('apiaries', apiaryA, 2, true);

    expect(apiaryIdByName('Apiário A')).toBe(2);
    expect(apiaryIdByName('Apiário B')).toBeLessThan(0);
    expect(boxOwner('Caixa do A')).toBe(2);
    expect(boxOwner('Caixa do B')).toBe(apiaryIdByName('Apiário B'));
  });
});

describe('limpeza de caixas duplicadas', () => {
  it('mantém a caixa que já está no servidor e leva as anotações da cópia local para ela', async () => {
    legacyApiary(50, 'Do servidor', 1, 0);
    legacyBox(5, 50, 'Caixa 01', 1, 0);
    const localCopy = await newBox(50, 'caixa 01 ');
    const reviewId = await insertReviewReportLocal(recordFields(50, localCopy));

    await cleanupDuplicateBoxesLocal();

    expect(rows('SELECT id FROM boxes')).toEqual([{ id: 5 }]);
    expect(queryMemory('SELECT caixa_id FROM review_reports WHERE id = ?', [reviewId])).toEqual([{ caixa_id: 5 }]);
  });

  it('entre caixas só locais, mantém a mais antiga (a primeira criada)', async () => {
    const apiaryId = await newApiary('A');
    const first = await newBox(apiaryId, 'Caixa 01');
    await newBox(apiaryId, 'Caixa 01');

    await cleanupDuplicateBoxesLocal();

    expect(rows('SELECT id FROM boxes')).toEqual([{ id: first }]);
  });
});
