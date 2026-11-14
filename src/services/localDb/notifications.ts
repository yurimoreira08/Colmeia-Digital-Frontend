/**
 * Notificações no SQLite local.
 */
import { Platform } from 'react-native';
import { getIsoTimestamp, getLocalDb } from './database';

export async function insertNotificationLocal(notif: { title: string; subtitle: string; created_at?: string; read?: number; synced?: number; is_new?: number }): Promise<number> {
  const db = await getLocalDb();
  const now = getIsoTimestamp();
  const res = await db.runAsync(
    `INSERT INTO notifications (title, subtitle, created_at, read, synced, is_new)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [notif.title, notif.subtitle, notif.created_at || now, notif.read ?? 0, notif.synced ?? 0, notif.is_new ?? 1]
  );
  return res.lastInsertRowId;
}

export async function markNotificationReadLocal(id: number): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE notifications SET read = 1, synced = 0 WHERE id = ?;', [id]);
}

export async function markAllNotificationsReadLocal(): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync('UPDATE notifications SET read = 1, synced = 0;');
}

export async function listNotificationsLocal(limit = 50): Promise<any[]> {
  const db = await getLocalDb();
  return db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?;', [limit]);
}

export async function getLocalNotifications(limit = 50): Promise<any[]> {
  return listNotificationsLocal(limit);
}

export async function saveLocalNotification(params: { title: string; subtitle: string }): Promise<any> {
  const now = getIsoTimestamp();
  const id = await insertNotificationLocal({
    title: params.title,
    subtitle: params.subtitle,
    created_at: now,
    read: 0,
    synced: 0,
    is_new: 1,
  });
  return { id, title: params.title, subtitle: params.subtitle, created_at: now, read: 0 };
}

export async function markLocalNotificationRead(id: number): Promise<void> {
  return markNotificationReadLocal(id);
}

export async function markAllLocalNotificationsRead(): Promise<void> {
  return markAllNotificationsReadLocal();
}

export async function getLocalUnreadNotificationsCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const db = await getLocalDb();
  const res = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM notifications WHERE read = 0;');
  return res?.count ?? 0;
}

export async function replaceNotificationsLocal(notifs: any[]): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    const remoteIds = notifs.map((n) => n.id).filter(Boolean);
    if (remoteIds.length > 0) {
      const placeholders = remoteIds.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM notifications WHERE synced = 1 AND is_new = 0 AND id NOT IN (${placeholders});`,
        remoteIds
      );
    } else {
      await db.runAsync('DELETE FROM notifications WHERE synced = 1 AND is_new = 0;');
    }

    for (const n of notifs) {
      const existing = await db.getFirstAsync<{ synced: number }>(
        'SELECT synced FROM notifications WHERE id = ?;',
        [n.id]
      );
      if (existing && existing.synced === 0) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO notifications (id, title, subtitle, created_at, read, synced, is_new)
         VALUES (?, ?, ?, ?, ?, 1, 0)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           subtitle = excluded.subtitle,
           read = excluded.read,
           synced = 1
         WHERE notifications.synced = 1;`,
        [n.id, n.title, n.subtitle, n.createdAt, n.read ? 1 : 0]
      );
    }
  });
}
