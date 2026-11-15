import React, { useContext, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUnreadNotificationsCount } from '../services/notificationsService';
import { useAppTheme } from '../theme/ThemeContext';
import { useTestDataMode } from '../config/TestDataModeContext';
import { useVoiceCommand } from '../voice/VoiceCommandContext';

type AppHeaderProps = {
  title: string;
  showBack?: boolean;
  onPressBack?: () => void;
  onPressBell?: () => void;
  showNotificationIcon?: boolean;
  showMic?: boolean;
  rightElement?: React.ReactNode;
};

export function AppHeader({
  title,
  showBack = false,
  onPressBack,
  onPressBell,
  showNotificationIcon = false,
  showMic = false,
  rightElement,
}: AppHeaderProps) {
  const { colors } = useAppTheme();
  const { isTestDataEnabled } = useTestDataMode();
  const { isListening, toggleListening } = useVoiceCommand();
  const { top } = useSafeAreaInsets();
  const styles = createStyles(colors);
  
  const [unreadCount, setUnreadCount] = useState(0);
  // Lê o contexto direto em vez de useNavigation(), que lança erro fora de um
  // navigator: assim o header também funciona fora da navegação (fica undefined).
  const navigation = useContext(NavigationContext);

  useEffect(() => {
    let active = true;
    async function updateCount() {
      try {
        const count = await getUnreadNotificationsCount();
        if (active) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.warn('[AppHeader] Erro ao obter contagem de não lidas:', err);
      }
    }

    void updateCount();

    if (navigation) {
      const unsubscribe = navigation.addListener('focus', () => {
        void updateCount();
      });
      return () => {
        active = false;
        unsubscribe();
      };
    }
    return () => {
      active = false;
    };
  }, [navigation]);

  return (
    <View style={[styles.header, { paddingTop: top + 6 }]}>
      <View style={styles.leftArea}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
            onPress={onPressBack}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {/* Logo oficial sem fundo inline (28x28dp) à esquerda do título */}
        <Image
          source={require('../../assets/logo-colmeiadigital-semfundo.png')}
          style={styles.inlineLogo}
          resizeMode="contain"
        />

        <View style={styles.titleWrap}>
          <Text
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
          {isTestDataEnabled ? (
            <View style={styles.testBadge}>
              <Text style={styles.testBadgeText}>Ambiente de Teste</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.rightArea}>
        {showMic ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Parar comando de voz' : 'Iniciar comando de voz'}
            hitSlop={8}
            onPress={() => {
              void toggleListening();
            }}
            style={[styles.iconButton, isListening ? styles.iconButtonListening : null]}
          >
            <MaterialCommunityIcons
              name={isListening ? 'microphone' : 'microphone-outline'}
              size={22}
              color={isListening ? '#2C4251' : '#FFFFFF'}
            />
          </Pressable>
        ) : null}

        {showNotificationIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            hitSlop={8}
            onPress={onPressBell}
            style={styles.iconButton}
          >
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="bell-outline" size={24} color="#FFFFFF" />
              {unreadCount > 0 ? (
                <View style={styles.badge} />
              ) : null}
            </View>
          </Pressable>
        ) : null}
        
        {rightElement}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    header: {
      paddingBottom: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.headerBackground,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    inlineLogo: {
      width: 28,
      height: 28,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    iconButtonListening: {
      backgroundColor: '#9FD1D4',
    },
    rightArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    titleWrap: {
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: 2,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    testBadge: {
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    testBadgeText: {
      fontSize: 10,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    badge: {
      position: 'absolute',
      right: 0,
      top: 0,
      backgroundColor: '#DC2626',
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
}