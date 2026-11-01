import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { bootstrapAuth, getCurrentUser, isTermsAccepted } from '../services/authService';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function AppSplashScreen({ navigation }: Props) {
  const [error, setError] = useState<string | null>(null);
  const logoPulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    async function initializeApp(): Promise<void> {
      try {
        await bootstrapAuth();

        const termsAccepted = await isTermsAccepted();
        const currentUser = await getCurrentUser();

        if (!mounted) {
          return;
        }

        setTimeout(() => {
          if (!mounted) {
            return;
          }

          if (!termsAccepted) {
            navigation.replace('Terms');
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
          <Image source={require('../../assets/logo-colmeiadigital.jpeg')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Text style={styles.appTitle}>COLMEIA DIGITAL</Text>
        <Text style={styles.appSubtitle}>Sistema de Gestão e Monitoramento de Apiários</Text>
        <Text style={styles.versionBadge}>v2.0</Text>
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footerArea}>
        <Text style={styles.fromBoiles}>FROM BOILES</Text>
        <Text style={styles.brandText}>FAPEPI • 2026</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.primaryDark,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 170,
    height: 170,
    borderRadius: 30,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: PALETTE.lightSurface,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  versionBadge: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: PALETTE.vibrantAccent,
    backgroundColor: 'rgba(159, 209, 212, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  footerArea: {
    paddingBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fromBoiles: {
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE.secondaryDark,
    letterSpacing: 2.5,
  },
  brandText: {
    fontSize: 12,
    letterSpacing: 1,
    color: PALETTE.secondaryDark,
    fontWeight: '600',
  },
  errorText: {
    alignSelf: 'center',
    marginBottom: 12,
    color: PALETTE.danger,
    fontSize: 14,
    fontWeight: '500',
  },
});
