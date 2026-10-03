import { 
  getLocalNotifications, 
  saveLocalNotification, 
  markLocalNotificationRead,
  markAllLocalNotificationsRead,
  getLocalUnreadNotificationsCount,
  getLocalConfigValue,
  setLocalConfigValue
} from './localDbService';
import { triggerSyncBackground } from './syncService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    // Check if we have already prompted the user for notifications
    const hasRequested = await getLocalConfigValue('has_requested_notifications');
    if (hasRequested === 'true') {
      return false;
    }

    // Request using the native system permission dialog (native OS design patterns)
    const { status } = await Notifications.requestPermissionsAsync();
    await setLocalConfigValue('has_requested_notifications', 'true');
    const finalStatus = status;

    if (finalStatus === 'granted' && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Geral',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7A',
        sound: 'default',
      });
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[Notifications] Falha ao obter permissões de notificação nativas:', err);
    return false;
  }
}

export async function triggerLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: Platform.OS === 'android' ? { channelId: 'default', seconds: 1 } : null,
    });
  } catch (err) {
    console.warn('[Notifications] Falha ao disparar notificação local:', err);
  }
}


export type NotificationRecord = {
  id: number;
  title: string;
  body?: string; // added to match body
  subtitle: string;
  createdAt: string;
  read: boolean;
};

export async function listRecentNotifications(limit = 50): Promise<NotificationRecord[]> {
  const rows = await getLocalNotifications(limit);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    createdAt: r.created_at,
    read: !!r.read,
  }));
}

export async function createNotification(params: {
  title: string;
  subtitle: string;
}): Promise<NotificationRecord> {
  const row = await saveLocalNotification({
    title: params.title.trim(),
    subtitle: params.subtitle.trim(),
  });

  try {
    await triggerLocalNotification(params.title, params.subtitle);
  } catch (err) {
    console.warn('[Notifications] Falha ao disparar notificação nativa para notificação criada:', err);
  }

  triggerSyncBackground();

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    createdAt: row.created_at,
    read: !!row.read,
  };
}

export async function markNotificationRead(id: number): Promise<void> {
  await markLocalNotificationRead(id);
  triggerSyncBackground();
}

export async function markAllNotificationsRead(): Promise<void> {
  await markAllLocalNotificationsRead();
  triggerSyncBackground();
}

export async function getUnreadNotificationsCount(): Promise<number> {
  return getLocalUnreadNotificationsCount();
}
