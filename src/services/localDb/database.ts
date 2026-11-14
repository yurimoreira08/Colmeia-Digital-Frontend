/**
 * Abertura do banco SQLite local e utilitários compartilhados pelos módulos de localDb.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'colmeia_digital_offline.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getIsoTimestamp(): string {
  return new Date().toISOString();
}

export async function getLocalDb(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite não é suportado na plataforma Web.');
  }
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export function generateClientUuid(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
}
