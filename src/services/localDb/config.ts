/**
 * Configurações locais (tabela app_config; localStorage na web).
 */
import { Platform } from 'react-native';
import { getLocalDb } from './database';

export async function getLocalConfigValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(`config_${key}`);
  }
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_config WHERE key = ?;', [key]);
  return row ? row.value : null;
}

export async function setLocalConfigValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(`config_${key}`, value);
    return;
  }
  const db = await getLocalDb();
  await db.runAsync(
    'INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    [key, value]
  );
}
