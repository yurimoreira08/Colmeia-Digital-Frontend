/**
 * Schema do SQLite local, migrações idempotentes (rodam a cada abertura do app) e limpezas de manutenção.
 * Mudou o schema? Acrescente a migração aqui: os usuários já têm dados no aparelho.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { getLocalDb } from './database';

export async function initializeLocalDb(): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getLocalDb();

  // Foreign keys OFF para permitir remapeamento seguro de IDs temporários locais para IDs definitivos do servidor durante sync
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS apiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      box_count INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0,
      role TEXT DEFAULT 'owner'
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apiary_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0,
      FOREIGN KEY (apiary_id) REFERENCES apiaries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT,
      caixa_id INTEGER NOT NULL,
      caixa_name TEXT NOT NULL,
      apiary_id INTEGER,
      apiary_name TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'apiario',
      checked_options TEXT NOT NULL,
      observacoes TEXT NOT NULL,
      indicacoes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      archived INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS manejos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_uuid TEXT,
      caixa_id INTEGER NOT NULL,
      caixa_name TEXT NOT NULL,
      apiary_id INTEGER,
      apiary_name TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'apiario',
      revisao_id INTEGER,
      checked_options TEXT NOT NULL,
      observacoes TEXT NOT NULL,
      indicacoes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      photo_uri TEXT,
      archived INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 1,
      is_new INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_review_reports_client_uuid ON review_reports(client_uuid) WHERE client_uuid IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_manejos_client_uuid ON manejos(client_uuid) WHERE client_uuid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS offline_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_boxes_apiary_id_archived ON boxes (apiary_id, archived);
    CREATE INDEX IF NOT EXISTS idx_review_reports_apiary_caixa ON review_reports (apiary_id, caixa_id);
    CREATE INDEX IF NOT EXISTS idx_review_reports_created_at ON review_reports (created_at);
    CREATE INDEX IF NOT EXISTS idx_manejos_apiary_caixa ON manejos (apiary_id, caixa_id);
    CREATE INDEX IF NOT EXISTS idx_manejos_created_at ON manejos (created_at);
  `);

  try {
    await db.execAsync('ALTER TABLE review_reports ADD COLUMN client_uuid TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE manejos ADD COLUMN client_uuid TEXT;');
  } catch {}
  try {
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_review_reports_client_uuid ON review_reports (client_uuid);');
  } catch {}
  try {
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_manejos_client_uuid ON manejos (client_uuid);');
  } catch {}

  // updatedAt do servidor de cada registro: vai como baseUpdatedAt no POST /sync (detecção de conflito, F3).
  for (const table of ['apiaries', 'boxes', 'review_reports', 'manejos']) {
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN server_updated_at TEXT;`);
    } catch {
      // A coluna já existe.
    }
  }

  await renumberLegacyPendingIds(db);

  // Limpa caixas duplicadas residuais
  await cleanupDuplicateBoxesLocal();
}

/**
 * Ids de registros criados no aparelho.
 *
 * Registros criados offline recebem ids **negativos** (o próximo é sempre
 * menor que o menor id da tabela), e o servidor só gera ids positivos. Assim,
 * quando o sync troca o id temporário pelo id do servidor, ele nunca colide
 * com outro registro local ainda não enviado. Esse era o bug F2: o apiário
 * criado offline sumia e a caixa dele ia parar em outro apiário.
 * O cálculo fica dentro do próprio INSERT para ser atômico.
 */
const NEXT_LOCAL_ID_SQL = (table: string) => `SELECT MIN(COALESCE(MIN(id), 0), 0) - 1 AS id FROM ${table}`;

/** Tabelas com ids temporários e as colunas dos filhos que apontam para elas, na ordem de renumeração. */
const LOCAL_ID_REFERENCES: { table: string; children: { table: string; column: string }[] }[] = [
  { table: 'apiaries', children: [{ table: 'boxes', column: 'apiary_id' }, { table: 'review_reports', column: 'apiary_id' }, { table: 'manejos', column: 'apiary_id' }] },
  { table: 'boxes', children: [{ table: 'review_reports', column: 'caixa_id' }, { table: 'manejos', column: 'caixa_id' }] },
  { table: 'review_reports', children: [{ table: 'manejos', column: 'revisao_id' }] },
  { table: 'manejos', children: [] },
];

/**
 * Migração local de uma vez: versões antigas do app criavam registros
 * pendentes com ids temporários positivos, que podem colidir com ids do
 * servidor. Renumera esses registros (`is_new = 1` e `id > 0`) para ids
 * negativos e re-aponta os filhos.
 *
 * Só filhos também pendentes são re-apontados: um registro que ainda não foi
 * enviado não pode ter filho que já está no servidor, e assim filhos de um
 * registro do servidor com o mesmo número nunca são tocados.
 * Idempotente: na segunda vez não encontra mais ids positivos pendentes.
 */
async function renumberLegacyPendingIds(db: SQLite.SQLiteDatabase): Promise<void> {
  const hasLegacy = await db.getFirstAsync<{ count: number }>(
    `SELECT (SELECT COUNT(*) FROM apiaries WHERE is_new = 1 AND id > 0)
          + (SELECT COUNT(*) FROM boxes WHERE is_new = 1 AND id > 0)
          + (SELECT COUNT(*) FROM review_reports WHERE is_new = 1 AND id > 0)
          + (SELECT COUNT(*) FROM manejos WHERE is_new = 1 AND id > 0) AS count;`,
  );
  if (!hasLegacy?.count) return;

  await db.withTransactionAsync(async () => {
    for (const { table, children } of LOCAL_ID_REFERENCES) {
      const pending = await db.getAllAsync<{ id: number }>(`SELECT id FROM ${table} WHERE is_new = 1 AND id > 0 ORDER BY id;`);
      for (const { id: oldId } of pending) {
        const next = await db.getFirstAsync<{ id: number }>(`${NEXT_LOCAL_ID_SQL(table)};`);
        const newId = next?.id ?? -1;
        for (const child of children) {
          await db.runAsync(`UPDATE ${child.table} SET ${child.column} = ? WHERE ${child.column} = ? AND is_new = 1;`, [newId, oldId]);
        }
        await db.runAsync(`UPDATE ${table} SET id = ? WHERE id = ?;`, [newId, oldId]);
      }
    }
  });
}

/**
 * Prioridade da caixa que fica quando há duplicadas (mesmo apiário e mesmo
 * nome): primeiro a que já está no servidor (id positivo, a mais antiga),
 * depois a local mais antiga (ids locais são negativos e decrescentes, então
 * -1 é a primeira criada). Menor valor = maior prioridade.
 */
function boxKeepRank(alias: string): string {
  return `(CASE WHEN ${alias}.id > 0 THEN ${alias}.id ELSE 1000000000000 - ${alias}.id END)`;
}

/** `candidate` é uma caixa ativa com o mesmo apiário e o mesmo nome (sem diferenciar maiúsculas/espaços) de `other`. */
function sameActiveBox(candidate: string, other: string): string {
  return `${candidate}.apiary_id = ${other}.apiary_id
    AND LOWER(TRIM(${candidate}.name)) = LOWER(TRIM(${other}.name))
    AND ${candidate}.archived = 0`;
}

/** Re-aponta registros de `table` que estão numa caixa duplicada para a caixa que fica. */
function repointToKeptBoxSql(table: 'review_reports' | 'manejos'): string {
  return `
    UPDATE ${table}
    SET caixa_id = (
      SELECT keep.id FROM boxes keep
      JOIN boxes current ON current.id = ${table}.caixa_id
      WHERE ${sameActiveBox('keep', 'current')}
      ORDER BY ${boxKeepRank('keep')}
      LIMIT 1
    )
    WHERE EXISTS (
      SELECT 1 FROM boxes current
      JOIN boxes better ON ${sameActiveBox('better', 'current')}
      WHERE current.id = ${table}.caixa_id
        AND ${boxKeepRank('better')} < ${boxKeepRank('current')}
    );`;
}

/**
 * Junta caixas duplicadas no aparelho: revisões e manejos passam para a caixa
 * que fica (ver boxKeepRank) e as cópias ativas são apagadas.
 */
export async function cleanupDuplicateBoxesLocal(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const db = await getLocalDb();
    await db.execAsync(`
      ${repointToKeptBoxSql('review_reports')}
      ${repointToKeptBoxSql('manejos')}

      DELETE FROM boxes
      WHERE archived = 0
        AND EXISTS (
          SELECT 1 FROM boxes better
          WHERE ${sameActiveBox('better', 'boxes')}
            AND ${boxKeepRank('better')} < ${boxKeepRank('boxes')}
        );
    `);
  } catch (err) {
    console.warn('[cleanupDuplicateBoxesLocal] Erro ao limpar caixas duplicadas:', err);
  }
}
