import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { bootstrapAuth, getCurrentUser, getAcceptedTermsVersion } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function AppSplashScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [error, setError] = useState<string | null>(null);
  const logoPulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    async function initializeApp(): Promise<void> {
      try {
        await bootstrapAuth();

        const termsVersion = await getAcceptedTermsVersion();
        const currentUser = await getCurrentUser();

        if (!mounted) {
          return;
        }

        setTimeout(() => {
          if (!mounted) {
            return;
          }

          if (termsVersion !== 'v1') {
            navigation.replace('TermsOfUse');
            return;
          }

          if (currentUser) {
            navigation.replace('Home');
            return;
          }

          navigation.replace('Login');
        }, 900);
      } catch (err) {
        if (!mounted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Erro ao inicializar aplicativo.';
        setError(message);
      }
    }

    initializeApp();

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.05,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => {
      mounted = false;
    };
  }, [fadeIn, logoPulse, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centerArea, { opacity: fadeIn }]}> 
        <Animated.View style={{ transform: [{ scale: logoPulse }] }}>
          <Image source={require('../../assets/applogo.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Text style={styles.appTitle}>COLMEIA DIGITAL</Text>
        <Text style={styles.appSubtitle}>Sistema de Gestão e Monitoramento de Apiários</Text>
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footerArea}>
        <Text style={styles.brandText}>FAPEPI • 2026</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    logo: {
      width: 160,
      height: 160,
      marginBottom: 16,
    },
    appTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 1.5,
      textAlign: 'center',
    },
    appSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: 'center',
      fontWeight: '500',
    },
    footerArea: {
      paddingBottom: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandText: {
      fontSize: 14,
      letterSpacing: 1,
      color: colors.textMuted,
      fontWeight: '600',
    },
    errorText: {
      alignSelf: 'center',
      marginBottom: 12,
      color: colors.error,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}
