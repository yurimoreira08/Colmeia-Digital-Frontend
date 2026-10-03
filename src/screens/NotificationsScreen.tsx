import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { listRecentNotifications, markAllNotificationsRead, type NotificationRecord } from '../services/notificationsService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  async function loadNotifications(mounted = true): Promise<void> {
    try {
      const data = await listRecentNotifications();
      if (mounted) {
        setNotifications(data);
      }
      await markAllNotificationsRead();
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let mounted = true;

    loadNotifications(mounted);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();

    return () => {
      mounted = false;
    };
  }, [fadeAnim]);

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Notificações"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => undefined}
      />

      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />
        {loading ? <ActivityIndicator size="small" color={colors.accent} style={styles.loader} /> : null}

        {!loading && notifications.length === 0 ? (
          <Animated.View style={[styles.emptyCard, { opacity: fadeAnim }]}>
            <Ionicons
              name="notifications-off-outline"
              size={24}
              color={colors.textMuted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>Nenhuma notificação ainda</Text>
            <Text style={styles.emptySubtitle}>As notificações do sistema aparecerão aqui.</Text>
          </Animated.View>
        ) : null}

        {notifications.map((item, index) => (
          <Animated.View
            key={String(item.id)}
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10 + index * 2, 0],
                  }),
                },
              ],
            }}
          >
            <View style={styles.notificationCard}>
              <Text style={styles.title}>• {item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingTop: 18,
      paddingHorizontal: 18,
      paddingBottom: 18,
      gap: 12,
      overflow: 'hidden',
    },
    glowOne: {
      position: 'absolute',
      top: 36,
      right: -34,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.glowA,
      opacity: 0.2,
    },
    glowTwo: {
      position: 'absolute',
      bottom: 120,
      left: -38,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.glowB,
      opacity: 0.16,
    },
    loader: {
      marginVertical: 12,
    },
    notificationCard: {
      minHeight: 100,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    emptyCard: {
      minHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    emptyIcon: {
      marginBottom: 6,
    },
    emptyTitle: {
      fontSize: 17,
      lineHeight: 24,
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    emptySubtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    title: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
  });
}
