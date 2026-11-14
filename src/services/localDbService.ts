/**
 * Banco SQLite local (offline-first).
 *
 * Ponto de entrada único: as telas, hooks e services importam daqui. A
 * implementação fica em `localDb/`, um arquivo por entidade.
 */
export { generateClientUuid, getLocalDb } from './localDb/database';
export * from './localDb/schema';
export * from './localDb/config';
export * from './localDb/syncState';
export * from './localDb/apiaries';
export * from './localDb/boxes';
export * from './localDb/reviewReports';
export * from './localDb/manejos';
export * from './localDb/notifications';
export * from './localDb/remotePull';
