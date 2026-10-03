import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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

import { resetPassword } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const email = route.params?.email || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
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
        duration: 550,
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

  async function handleResetPassword(): Promise<void> {
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      setError('O código de verificação deve conter 6 dígitos.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await resetPassword({
        email,
        code: trimmedCode,
        newPassword: newPassword.trim(),
      });

      Alert.alert(
        'Sucesso!',
        response.message || 'Senha alterada com sucesso. Faça login com sua nova senha.',
        [
          {
            text: 'Ir para o Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao redefinir a senha.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          {/* Botão de Voltar */}
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>

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
                ],
              },
            ]}
          >
            <Image source={require('../../assets/applogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandHeader}>NOVA SENHA</Text>
            <Text style={styles.title}>Redefinir Senha</Text>
            <Text style={styles.subtitle}>
              Código enviado para: <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
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
            {/* Campo de Código */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Código de 6 dígitos</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>

            {/* Campo Nova Senha */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nova Senha</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (error) setError(null);
                  }}
                  secureTextEntry={secureText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Mínimo 4 caracteres..."
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
                <Pressable
                  style={[styles.visibilityButton, !secureText ? styles.visibilityButtonActive : null]}
                  onPress={() => setSecureText((prev) => !prev)}
                >
                  <Ionicons
                    name={secureText ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={secureText ? colors.accent : colors.buttonText}
                  />
                </Pressable>
              </View>
            </View>

            {/* Campo Confirmar Nova Senha */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (error) setError(null);
                  }}
                  secureTextEntry={secureConfirmText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Repita a nova senha..."
                  placeholderTextColor={colors.textMuted}
                  editable={!loading}
                />
                <Pressable
                  style={[styles.visibilityButton, !secureConfirmText ? styles.visibilityButtonActive : null]}
                  onPress={() => setSecureConfirmText((prev) => !prev)}
                >
                  <Ionicons
                    name={secureConfirmText ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={secureConfirmText ? colors.accent : colors.buttonText}
                  />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={styles.primaryButton}
                onPress={handleResetPassword}
                disabled={loading}
                onPressIn={onPressInPrimary}
                onPressOut={onPressOutPrimary}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Salvando...' : 'Redefinir Senha'}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Dica de verificação de spam */}
            <View style={styles.spamTip}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.spamTipText}>
                Não recebeu o código? Verifique sua caixa de spam ou lixo eletrônico.
              </Text>
            </View>

            <Pressable
              style={styles.linkButton}
              onPress={() => navigation.navigate('ForgotPassword', { initialEmail: email })}
            >
              <Text style={styles.linkButtonText}>Reenviar código</Text>
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
      paddingTop: 16,
      paddingBottom: 90,
      overflow: 'hidden',
    },
    backButton: {
      alignSelf: 'flex-start',
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 10,
    },
    glowTop: {
      position: 'absolute',
      top: -60,
      right: -40,
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
      marginBottom: 16,
    },
    logo: {
      width: 90,
      height: 90,
      marginBottom: 6,
    },
    brandHeader: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.accent,
      letterSpacing: 2,
      marginBottom: 4,
    },
    title: {
      fontSize: 22,
      color: colors.textPrimary,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 12,
      lineHeight: 18,
    },
    emailHighlight: {
      fontWeight: '700',
      color: colors.accent,
    },
    formArea: {
      width: '100%',
      gap: 12,
      padding: 18,
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
    inputContainer: {
      width: '100%',
      gap: 6,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    input: {
      width: '100%',
      height: 52,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 16,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    codeInput: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 8,
      textAlign: 'center',
    },
    passwordRow: {
      width: '100%',
      height: 52,
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
      fontWeight: '500',
      textAlign: 'center',
    },
    primaryButton: {
      alignSelf: 'center',
      width: '100%',
      height: 52,
      marginTop: 4,
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
    linkButton: {
      alignSelf: 'center',
      paddingVertical: 6,
    },
    linkButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    spamTip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 2,
    },
    spamTipText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      flex: 1,
      lineHeight: 16,
    },
  });
}
