/**
 * @jest-environment node
 */
/**
 * updateRecordSyncStatus: quando um registro criado offline chega ao servidor,
 * o id temporário local é trocado pelo id do servidor e os filhos (caixas,
 * revisões, manejos) passam a apontar para o id novo. Testado com SQLite de
 * verdade (better-sqlite3 em memória) e o schema real de initializeLocalDb.
 */
import { initializeLocalDb, updateRecordSyncStatus } from '../../src/services/localDbService';
import { queryMemory, resetMemoryDatabase } from '../helpers/sqliteMemory';

// Hoisted pelo babel-jest para antes dos imports.
jest.mock('expo-sqlite', () => jest.requireActual('../helpers/sqliteMemory').expoSqliteMock);


const NOW = '2026-06-01T12:00:00.000Z';

function insertApiary(id: number, name: string, flags = { synced: 0, is_new: 1 }) {
  queryMemory(
    'INSERT INTO apiaries (id, name, location, box_count, description, created_at, updated_at, synced, is_new) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)',
    [id, name, 'Teresina', '', NOW, NOW, flags.synced, flags.is_new],
  );
}

function insertBox(id: number, apiaryId: number, name: string) {
  queryMemory(
    'INSERT INTO boxes (id, apiary_id, name, position, created_at, updated_at, synced, is_new) VALUES (?, ?, ?, 1, ?, ?, 0, 1)',
    [id, apiaryId, name, NOW, NOW],
  );
}

function insertRecord(table: 'review_reports' | 'manejos', id: number, apiaryId: number, boxId: number, extra: Record<string, number | null> = {}) {
  const columns = ['id', 'caixa_id', 'caixa_name', 'apiary_id', 'apiary_name', 'checked_options', 'observacoes', 'indicacoes', 'created_at', 'synced', 'is_new', ...Object.keys(extra)];
  const values = [id, boxId, 'Caixa', apiaryId, 'Apiário', '[]', '', '', NOW, 0, 1, ...Object.values(extra)];
  queryMemory(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, values);
}

const ids = (sql: string) => queryMemory<{ id: number }>(sql).map((row) => row.id);

beforeEach(async () => {
  resetMemoryDatabase();
  await initializeLocalDb();
});

describe('apiário criado offline recebe o id do servidor', () => {
  it('troca o id e marca como sincronizado', async () => {
    insertApiary(1, 'Sede');

    await updateRecordSyncStatus('apiaries', 1, 50, true);

    expect(queryMemory('SELECT id, synced, is_new FROM apiaries')).toEqual([{ id: 50, synced: 1, is_new: 0 }]);
  });

  it('caixas, revisões e manejos passam a apontar para o id novo', async () => {
    insertApiary(1, 'Sede');
    insertBox(10, 1, 'Caixa 01');
    insertRecord('review_reports', 20, 1, 10);
    insertRecord('manejos', 30, 1, 10);

    await updateRecordSyncStatus('apiaries', 1, 50, true);

    expect(queryMemory('SELECT apiary_id FROM boxes')).toEqual([{ apiary_id: 50 }]);
    expect(queryMemory('SELECT apiary_id FROM review_reports')).toEqual([{ apiary_id: 50 }]);
    expect(queryMemory('SELECT apiary_id FROM manejos')).toEqual([{ apiary_id: 50 }]);
  });

  it('se o id do servidor já veio num pull anterior, descarta a cópia temporária', async () => {
    insertApiary(1, 'Sede');
    insertApiary(50, 'Sede', { synced: 1, is_new: 0 });
    insertBox(10, 1, 'Caixa 01');

    await updateRecordSyncStatus('apiaries', 1, 50, true);

    expect(ids('SELECT id FROM apiaries')).toEqual([50]);
    expect(queryMemory('SELECT apiary_id FROM boxes')).toEqual([{ apiary_id: 50 }]);
  });
});

describe('caixa e revisão criadas offline', () => {
  it('revisões e manejos da caixa passam a apontar para o id novo da caixa', async () => {
    insertApiary(50, 'Sede', { synced: 1, is_new: 0 });
    insertBox(10, 50, 'Caixa 01');
    insertRecord('review_reports', 20, 50, 10);
    insertRecord('manejos', 30, 50, 10);

    await updateRecordSyncStatus('boxes', 10, 700, true);

    expect(ids('SELECT id FROM boxes')).toEqual([700]);
    expect(queryMemory('SELECT caixa_id FROM review_reports')).toEqual([{ caixa_id: 700 }]);
    expect(queryMemory('SELECT caixa_id FROM manejos')).toEqual([{ caixa_id: 700 }]);
  });

  it('manejos ligados à revisão passam a apontar para o id novo da revisão', async () => {
    insertApiary(50, 'Sede', { synced: 1, is_new: 0 });
    insertBox(700, 50, 'Caixa 01');
    insertRecord('review_reports', 20, 50, 700);
    insertRecord('manejos', 30, 50, 700, { revisao_id: 20 });

    await updateRecordSyncStatus('review_reports', 20, 900, true);

    expect(ids('SELECT id FROM review_reports')).toEqual([900]);
    expect(queryMemory('SELECT revisao_id FROM manejos')).toEqual([{ revisao_id: 900 }]);
  });
});

describe('registro que já existia no servidor', () => {
  it('só marca como sincronizado, sem trocar o id', async () => {
    insertApiary(50, 'Sede', { synced: 0, is_new: 0 });

    await updateRecordSyncStatus('apiaries', 50, 50, false);

    expect(queryMemory('SELECT id, synced, is_new FROM apiaries')).toEqual([{ id: 50, synced: 1, is_new: 0 }]);
  });
});

// O bug F2 (colisão entre ids locais e do servidor) foi corrigido com ids locais
// negativos e a migração de registros antigos: ver tests/services/localIds.test.ts.
