/**
 * SQLite em memória (better-sqlite3) com a mesma API do `expo-sqlite` que o
 * app usa: execAsync, runAsync, getFirstAsync, getAllAsync e
 * withTransactionAsync. Permite testar o banco local e o sync com SQL de
 * verdade, sem aparelho.
 *
 * Uso num teste (que precisa rodar no ambiente node do Jest):
 *   docblock `@jest-environment node` no topo do arquivo;
 *   jest.mock('expo-sqlite', () => jest.requireActual('../helpers/sqliteMemory').expoSqliteMock);
 *   beforeEach(() => resetMemoryDatabase());
 */
import BetterSqlite3 from 'better-sqlite3';

type Params = unknown[] | undefined;

let database: BetterSqlite3.Database | null = null;

function current(): BetterSqlite3.Database {
  if (!database) throw new Error('Banco em memória não iniciado: chame resetMemoryDatabase() no beforeEach.');
  return database;
}

/** better-sqlite3 só aceita boolean como 0/1. */
function bindable(params: Params): unknown[] {
  return (params ?? []).map((value) => (typeof value === 'boolean' ? Number(value) : value));
}

function rows<T>(sql: string, params?: Params): T[] {
  const statement = current().prepare(sql);
  if (statement.reader) return statement.all(...bindable(params)) as T[];
  statement.run(...bindable(params));
  return [];
}

/** Objeto com a API do SQLiteDatabase do expo-sqlite usada pelo app. */
const memoryDb = {
  async execAsync(sql: string): Promise<void> {
    current().exec(sql);
  },
  async runAsync(sql: string, params?: Params): Promise<{ lastInsertRowId: number; changes: number }> {
    const result = current().prepare(sql).run(...bindable(params));
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
  },
  async getFirstAsync<T>(sql: string, params?: Params): Promise<T | null> {
    return rows<T>(sql, params)[0] ?? null;
  },
  async getAllAsync<T>(sql: string, params?: Params): Promise<T[]> {
    return rows<T>(sql, params);
  },
  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    current().exec('BEGIN;');
    try {
      await task();
      current().exec('COMMIT;');
    } catch (error) {
      current().exec('ROLLBACK;');
      throw error;
    }
  },
};

/** Recria o banco vazio. Chame no beforeEach de cada teste. */
export function resetMemoryDatabase(): void {
  database?.close();
  database = new BetterSqlite3(':memory:');
}

/** Consulta ou comando direto, para montar cenários e fazer asserções. */
export function queryMemory<T = Record<string, unknown>>(sql: string, params?: Params): T[] {
  return rows<T>(sql, params);
}

/** Substituto do módulo `expo-sqlite`. */
export const expoSqliteMock = {
  openDatabaseAsync: async () => memoryDb,
};
