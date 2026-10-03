import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppTheme } from '../theme/ThemeContext';
import { acceptTermsRemote, getCurrentUser } from '../services/authService';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfUse'>;

export function TermsOfUseScreen({ navigation }: Props) {
  const { colors, themeName } = useAppTheme();
  const styles = createStyles(colors, themeName);

  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    if (!accepted) {
      Alert.alert('Atenção', 'Você precisa ler e aceitar os Termos de Uso e a Política de Privacidade para prosseguir.');
      return;
    }

    setSubmitting(true);
    try {
      await acceptTermsRemote('v1');
      const user = await getCurrentUser();
      if (user) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    } catch (err: any) {
      console.warn('[TermsOfUseScreen] Erro ao registrar aceite:', err);
      navigation.replace('Login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 1. Header Fixo */}
      <View style={styles.headerBar}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="shield-checkmark" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Termos de Uso e Privacidade</Text>
          <Text style={styles.headerSubtitle}>Colmeia Digital • Versão 1.0</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionBadgeText}>v1.0</Text>
        </View>
      </View>

      {/* 2. Conteúdo Rolável dos Termos */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.introCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
          <Text style={styles.introText}>
            Por favor, leia atentamente como tratamos seus dados e os recursos do dispositivo antes de começar a utilizar o aplicativo.
          </Text>
        </View>

        {/* Seção 1: Sobre o App */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionNumberCircle, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.sectionNumberText, { color: colors.accent }]}>1</Text>
            </View>
            <Text style={styles.sectionHeading}>Sobre o Aplicativo</Text>
          </View>
          <Text style={styles.sectionBody}>
            O <Text style={styles.boldText}>Colmeia Digital</Text> é uma plataforma técnica desenvolvida para o gerenciamento de apiários, controle de caixas, registros de revisões periódicas, manejos e monitoramento de atividades apícolas no campo.
          </Text>
        </View>

        {/* Seção 2: Coleta de Dados e Permissões do Dispositivo */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionNumberCircle, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.sectionNumberText, { color: colors.accent }]}>2</Text>
            </View>
            <Text style={styles.sectionHeading}>Coleta de Dados e Permissões</Text>
          </View>

          <Text style={styles.sectionBody}>
            Para garantir o funcionamento completo das ferramentas no campo, o aplicativo solicita as seguintes permissões:
          </Text>

          {/* Destaque 1: Câmera e Fotos */}
          <View style={[styles.featureCallout, styles.featureCalloutCamera]}>
            <View style={styles.featureIconCircle}>
              <Ionicons name="camera" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.featureTitle, { color: '#059669' }]}>Câmera e Galeria de Fotos</Text>
              <Text style={styles.featureDescription}>
                Utilizado exclusivamente para que você anexe fotos de comprovação técnica dos manejos (quadros, caixas, rainhas) e foto de perfil. O app <Text style={styles.boldText}>não</Text> acessa outras fotos do seu dispositivo.
              </Text>
            </View>
          </View>

          {/* Destaque 2: Microfone e Voz */}
          <View style={[styles.featureCallout, styles.featureCalloutMic]}>
            <View style={styles.featureIconCircle}>
              <Ionicons name="mic" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.featureTitle, { color: '#D97706' }]}>Microfone e Comandos por Voz</Text>
              <Text style={styles.featureDescription}>
                Utilizado para o recurso de ditado e comandos de voz para operação com as mãos livres e uso de luvas no apiário. O microfone só é acionado sob demanda do usuário e <Text style={styles.boldText}>não</Text> realiza gravações em segundo plano.
              </Text>
            </View>
          </View>

          {/* Destaque 3: Sincronização Offline */}
          <View style={[styles.featureCallout, styles.featureCalloutSync]}>
            <View style={styles.featureIconCircle}>
              <Ionicons name="cloud-offline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.featureTitle, { color: '#2563EB' }]}>Armazenamento Offline e Sincronização</Text>
              <Text style={styles.featureDescription}>
                Seus dados ficam gravados com segurança no banco de dados local do seu aparelho para uso sem internet e são transmitidos de forma criptografada para a nuvem quando houver conexão.
              </Text>
            </View>
          </View>
        </View>

        {/* Seção 3: Compartilhamento e Privacidade */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionNumberCircle, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.sectionNumberText, { color: colors.accent }]}>3</Text>
            </View>
            <Text style={styles.sectionHeading}>Compartilhamento e Segurança</Text>
          </View>
          <Text style={styles.sectionBody}>
            Seus dados <Text style={styles.boldText}>não são vendidos ou repassados a terceiros</Text> para fins comerciais ou publicitários. Em apiários compartilhados, apenas membros expressamente autorizados pelo proprietário têm acesso às informações do respectivo apiário.
          </Text>
        </View>

        {/* Seção 4: Direitos do Usuário */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionNumberCircle, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.sectionNumberText, { color: colors.accent }]}>4</Text>
            </View>
            <Text style={styles.sectionHeading}>Seus Direitos e Exclusão</Text>
          </View>
          <Text style={styles.sectionBody}>
            Você tem total controle sobre seus dados e pode revogar permissões de sensores nas configurações do seu sistema operacional ou solicitar a exclusão definitiva da sua conta a qualquer momento.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 3. Rodapé Fixo com Checkbox e Botão Continuar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAccepted(!accepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkboxSquare, accepted ? styles.checkboxSquareActive : null]}>
            {accepted ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.checkboxLabel}>
            Li e concordo com os <Text style={styles.boldText}>Termos de Uso</Text> e a <Text style={styles.boldText}>Política de Privacidade</Text>.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.continueButton, !accepted || submitting ? styles.continueButtonDisabled : null]}
          onPress={handleContinue}
          disabled={!accepted || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: any, themeName: string) {
  const isDark = themeName === 'obsidian-dark';

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.3,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    versionBadge: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    versionBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.accent,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 14,
    },
    introCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    introText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionNumberCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionNumberText: {
      fontSize: 13,
      fontWeight: '800',
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    sectionBody: {
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.textPrimary,
      fontWeight: '400',
    },
    boldText: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    featureCallout: {
      flexDirection: 'row',
      gap: 12,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      marginTop: 4,
    },
    featureCalloutCamera: {
      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.1)' : '#ECFDF5',
      borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0',
    },
    featureCalloutMic: {
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.1)' : '#FEF3C7',
      borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A',
    },
    featureCalloutSync: {
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#EFF6FF',
      borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
    },
    featureIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    featureDescription: {
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    bottomBar: {
      backgroundColor: colors.card,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 6,
      elevation: 8,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkboxSquare: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSquareActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
    },
    continueButton: {
      backgroundColor: colors.accent,
      height: 48,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    continueButtonDisabled: {
      opacity: 0.45,
    },
    continueButtonText: {
      color: colors.buttonText || '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
