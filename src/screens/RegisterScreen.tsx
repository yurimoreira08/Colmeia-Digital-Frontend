import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { register } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 580,
        useNativeDriver: true,
      }),
    ]).start();
  }, [formAnim, logoAnim]);

  function onPressInPrimary(): void {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 25,
      bounciness: 0,
    }).start();
  }

  function onPressOutPrimary(): void {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 0,
    }).start();
  }

  async function handleRegister(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      await register({ name, email, password });
      navigation.replace('Home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao realizar cadastro.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          <Animated.View
            style={[
              styles.logoWrap,
              {
                opacity: logoAnim,
                transform: [
                  {
                    translateY: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-18, 0],
                    }),
                  },
                  {
                    scale: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={require('../../assets/applogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandHeader}>COLMEIA DIGITAL</Text>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Preencha os dados do apicultor / técnico</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formArea,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-24, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Nome completo..."
              placeholderTextColor={colors.textMuted}
            />

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="E-mail de acesso..."
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Senha de acesso..."
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                style={[styles.visibilityButton, !secureText ? styles.visibilityButtonActive : null]}
                onPress={() => setSecureText((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={secureText ? 'Mostrar senha' : 'Ocultar senha'}
              >
                <Ionicons
                  name={secureText ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={secureText ? colors.accent : colors.buttonText}
                />
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={styles.primaryButton}
                onPress={handleRegister}
                disabled={loading}
                onPressIn={onPressInPrimary}
                onPressOut={onPressOutPrimary}
              >
                <Text style={styles.primaryButtonText}>{loading ? 'Cadastrando...' : 'Cadastre-se'}</Text>
              </Pressable>
            </Animated.View>

            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Já possui uma conta? Entrar</Text>
            </Pressable>

            <Pressable
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ForgotPassword', { initialEmail: email })}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 24,
      overflow: 'hidden',
    },
    glowTop: {
      position: 'absolute',
      top: -58,
      right: -38,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: colors.glowA,
      opacity: 0.35,
    },
    glowBottom: {
      position: 'absolute',
      bottom: 90,
      left: -55,
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: colors.glowB,
      opacity: 0.15,
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: 14,
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: 8,
    },
    brandHeader: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accent,
      letterSpacing: 2,
      marginBottom: 4,
    },
    title: {
      fontSize: 24,
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    subtitle: {
      marginTop: 2,
      fontSize: 13,
      color: colors.textMuted,
    },
    formArea: {
      width: '100%',
      gap: 12,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    input: {
      width: '100%',
      height: 54,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 16,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    passwordRow: {
      width: '100%',
      height: 54,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 16,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    visibilityButton: {
      marginRight: 8,
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    visibilityButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.buttonText,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
      marginTop: -2,
      fontWeight: '500',
    },
    primaryButton: {
      alignSelf: 'center',
      width: '100%',
      height: 54,
      marginTop: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.buttonBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
    backButton: {
      alignSelf: 'center',
      marginTop: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    backButtonText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    forgotPasswordButton: {
      alignSelf: 'center',
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    forgotPasswordText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
