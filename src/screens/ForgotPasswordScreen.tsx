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

import { forgotPassword } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState(route.params?.initialEmail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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

  async function handleSendCode(): Promise<void> {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      const response = await forgotPassword(trimmed);
      setInfoMessage(response.message || 'Código enviado com sucesso!');

      // Pequeno delay para exibir mensagem antes da transição
      setTimeout(() => {
        navigation.navigate('ResetPassword', { email: trimmed });
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao solicitar recuperação.';
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
            <Text style={styles.brandHeader}>RECUPERAR ACESSO</Text>
            <Text style={styles.title}>Esqueceu sua senha?</Text>
            <Text style={styles.subtitle}>
              Digite seu e-mail para enviarmos um código de verificação de 6 dígitos.
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
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-mail cadastrado</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="exemplo@email.com"
                placeholderTextColor={colors.textMuted}
                editable={!loading}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={styles.primaryButton}
                onPress={handleSendCode}
                disabled={loading}
                onPressIn={onPressInPrimary}
                onPressOut={onPressOutPrimary}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Enviando código...' : 'Enviar Código'}
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
              onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}
            >
              <Text style={styles.linkButtonText}>Já possui um código? Digite aqui</Text>
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
      paddingBottom: 70,
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
      marginBottom: 20,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 8,
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
      marginTop: 6,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 12,
      lineHeight: 18,
    },
    formArea: {
      width: '100%',
      gap: 14,
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
    errorText: {
      color: colors.error,
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    infoText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    primaryButton: {
      alignSelf: 'center',
      width: '100%',
      height: 52,
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
