import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { acceptTermsRemote, getCurrentUser } from '../services/authService';
import type { RootStackParamList } from '../types/auth';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, any>;
};

// Cores da paleta oficial do Colmeia Digital
const PALETTE = {
  primaryDark: '#2C4251',     // Primária escura (fundos, headers, botões principais)
  secondaryMedium: '#7798AB', // Secundária média (elementos de apoio, bordas)
  secondaryLight: '#6DA6B4',  // Secundária clara (destaques, selecionados)
  lightBg: '#BACEE1',         // Fundo claro (cards, inputs, badges)
  vibrantAccent: '#9FD1D4',   // Acento/vibração (botões de ação, alertas positivos)
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  bgSoft: '#BACEE1',
};

export function TermsScreen({ navigation }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    if (!accepted) {
      Alert.alert(
        'Aceite Obrigatório',
        'Para utilizar o aplicativo Colmeia Digital, você precisa ler e concordar com os Termos de Uso e Política de Privacidade.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await acceptTermsRemote();
      const user = await getCurrentUser();
      if (user) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    } catch (err: any) {
      console.warn('[TermsScreen] Erro ao registrar aceite:', err);
      navigation.replace('Login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 1. Header com Logo e Identificação */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <Image
            source={require('../../assets/logo-colmeiadigital-semfundo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTag}>FROM BOILES</Text>
            <Text style={styles.headerTitle}>Termos de Uso e Política de Privacidade</Text>
            <Text style={styles.headerSubtitle}>Colmeia Digital • Versão v2.0</Text>
          </View>
        </View>
      </View>

      {/* 2. ScrollView com o Texto Integral dos Termos */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.welcomeBanner}>
          <MaterialCommunityIcons name="shield-check" size={26} color={PALETTE.primaryDark} />
          <Text style={styles.welcomeBannerText}>
            Seja bem-vindo ao <Text style={styles.boldText}>Colmeia Digital</Text>. Antes de iniciar suas atividades em campo, conheça os termos que regem o uso do aplicativo e a proteção dos seus dados.
          </Text>
        </View>

        {/* SEÇÃO 1: IDENTIFICAÇÃO DO DESENVOLVEDOR */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Identificação do Desenvolvedor</Text>
          </View>
          <Text style={styles.paragraph}>
            Este aplicativo é desenvolvido e mantido por <Text style={styles.boldText}>BOILES</Text>. O Colmeia Digital destina-se a apicultores, meliponicultores, pesquisadores e associações para gestão inteligente, registro técnico de colmeias e monitoramento de atividades apícolas de campo.
          </Text>
        </View>

        {/* SEÇÃO 2: DADOS COLETADOS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>O Que o Aplicativo Coleta</Text>
          </View>
          <Text style={styles.paragraph}>
            Para possibilitar a gestão operacional de suas colmeias e o acompanhamento técnico, coletamos exclusivamente as seguintes categorias de dados:
          </Text>

          <View style={styles.bulletItem}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados Cadastrais:</Text> Nome completo e endereço de e-mail informados na criação da conta para autenticação, controle de acesso e recuperação de senha.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados de Apiários e Caixas:</Text> Nome do apiário, localização geográfica aproximada ou coordenadas, quantidade de caixas/colmeias e características das unidades.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Revisões Biológicas:</Text> Registros de condição da rainha, presença e taxa de postura, estimativas de crias, reservas de mel e pólen, sanidade e defensividade.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <MaterialCommunityIcons name="tools" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Manejos Operacionais:</Text> Checklist técnico de tarefas executadas (alimentação, troca de cera, troca de rainha, divisão, sobrecaixas), observações e indicações.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <MaterialCommunityIcons name="camera-outline" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Fotos de Manejo:</Text> Fotografias capturadas pela câmera ou anexadas voluntariamente da galeria para documentação e auditoria visual dos manejos técnicos.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <MaterialCommunityIcons name="sync" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.bulletText}>
              <Text style={styles.boldText}>Dados Técnicos de Uso:</Text> Logs de sincronização offline-first, versão do aplicativo e diagnósticos de conectividade para garantir a integridade dos seus dados.
            </Text>
          </View>
        </View>

        {/* SEÇÃO 3: FINALIDADE E USO DOS DADOS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Como os Dados São Usados</Text>
          </View>
          <Text style={styles.paragraph}>
            Os dados coletados são utilizados <Text style={styles.boldText}>exclusivamente para o funcionamento do aplicativo</Text>, incluindo a geração de relatórios de produtividade, histórico de manejos, gráficos temporais e sincronização segura entre dispositivos.
          </Text>

          <View style={styles.highlightNotice}>
            <MaterialCommunityIcons name="check-circle" size={22} color={PALETTE.primaryDark} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.boldText, { color: PALETTE.primaryDark }]}>Garantia de Não Comercialização</Text>
              <Text style={styles.noticeText}>
                Seus dados <Text style={styles.boldText}>nunca</Text> serão vendidos, alugados ou cedidos a terceiros. O Colmeia Digital <Text style={styles.boldText}>não</Text> utiliza seus dados para publicidade, marketing direcionado ou perfilamento comercial.
              </Text>
            </View>
          </View>
        </View>

        {/* SEÇÃO 4: ARMAZENAMENTO E SEGURANÇA */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Armazenamento e Segurança</Text>
          </View>
          <Text style={styles.paragraph}>
            Seus dados são armazenados na nuvem em infraestrutura gerenciada pelo <Text style={styles.boldText}>Supabase (PostgreSQL)</Text> e no Supabase Storage para mídias, com protocolos modernos de criptografia em trânsito (HTTPS / TLS 1.3) e criptografia em repouso.
          </Text>
          <Text style={styles.paragraph}>
            Para garantir que o aplicativo funcione mesmo em áreas rurais sem sinal de celular, os registros são mantidos em banco de dados local seguro (SQLite no próprio dispositivo) e sincronizados atomicamente com o servidor assim que a conectividade for restabelecida.
          </Text>
        </View>

        {/* SEÇÃO 5: DIREITOS DO USUÁRIO (LGPD) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>5</Text>
            </View>
            <Text style={styles.sectionTitle}>Direitos do Usuário (LGPD)</Text>
          </View>
          <Text style={styles.paragraph}>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você possui o direito de a qualquer momento:
          </Text>
          <Text style={styles.bulletPoint}>• Confirmar a existência de tratamento de seus dados;</Text>
          <Text style={styles.bulletPoint}>• Acessar, corrigir e atualizar informações incompletas ou inexatas;</Text>
          <Text style={styles.bulletPoint}>• Solicitar a anonimização, bloqueio ou eliminação definitiva de dados;</Text>
          <Text style={styles.bulletPoint}>• Revogar o consentimento e solicitar a exclusão integral de sua conta.</Text>
        </View>

        {/* SEÇÃO 6: CONTATO E EXCLUSÃO DE DADOS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>6</Text>
            </View>
            <Text style={styles.sectionTitle}>Contato e Exclusão de Dados</Text>
          </View>
          <Text style={styles.paragraph}>
            Para exercer seus direitos, esclarecer dúvidas sobre privacidade ou solicitar a exclusão definitiva dos seus dados e colmeias de nossos servidores, entre em contato com a equipe de suporte através do e-mail:
          </Text>
          <View style={styles.contactCard}>
            <MaterialCommunityIcons name="email" size={20} color={PALETTE.primaryDark} />
            <Text style={styles.contactEmail}>colmeiadigital.app@gmail.com</Text>
          </View>
        </View>

        {/* SEÇÃO 7: VIGÊNCIA E ATUALIZAÇÕES */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>7</Text>
            </View>
            <Text style={styles.sectionTitle}>Vigência e Atualização do Termo</Text>
          </View>
          <Text style={styles.paragraph}>
            Este termo possui versão identificada como <Text style={styles.boldText}>v2.0</Text> e entra em vigor a partir da confirmação do seu aceite. Caso haja alterações materiais nas práticas de privacidade ou funcionalidades que impactem o tratamento de dados, uma nova versão será submetida para sua aprovação.
          </Text>
        </View>

        {/* CLÁUSULA FINAL JURÍDICA */}
        <View style={styles.disclaimerBox}>
          <MaterialCommunityIcons name="information" size={20} color={PALETTE.secondaryMedium} />
          <Text style={styles.disclaimerText}>
            Este termo foi elaborado para uso no aplicativo Colmeia Digital. Para dúvidas jurídicas específicas, consulte um advogado.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 3. Rodapé Fixo com Checkbox, Botão Continuar e FROM BOILES */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAccepted(!accepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          hitSlop={8}
        >
          <View style={[styles.checkboxSquare, accepted ? styles.checkboxSquareActive : null]}>
            {accepted ? <MaterialCommunityIcons name="check" size={16} color={PALETTE.primaryDark} /> : null}
          </View>
          <Text style={styles.checkboxLabel}>
            Li e aceito os termos
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.continueButton,
            accepted && !submitting ? styles.continueButtonActive : styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!accepted || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={PALETTE.primaryDark} />
          ) : (
            <>
              <Text style={[styles.continueButtonText, { color: accepted ? PALETTE.primaryDark : PALETTE.white }]}>
                Continuar
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={accepted ? PALETTE.primaryDark : PALETTE.white}
              />
            </>
          )}
        </Pressable>

        <Text style={styles.fromBoilesFooter}>FROM BOILES</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.bgSoft,
  },
  headerContainer: {
    backgroundColor: PALETTE.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: PALETTE.secondaryLight,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: PALETTE.vibrantAccent,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.white,
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    color: PALETTE.lightBg,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: PALETTE.secondaryLight,
  },
  welcomeBannerText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: PALETTE.primaryDark,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: PALETTE.secondaryLight,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PALETTE.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: PALETTE.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.primaryDark,
    letterSpacing: 0.2,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: PALETTE.primaryDark,
  },
  boldText: {
    fontWeight: '800',
    color: PALETTE.primaryDark,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: PALETTE.lightBg,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.primaryDark,
  },
  bulletText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: PALETTE.primaryDark,
  },
  bulletPoint: {
    fontSize: 13.5,
    lineHeight: 21,
    color: PALETTE.primaryDark,
    paddingLeft: 6,
  },
  highlightNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: PALETTE.lightBg,
    borderColor: PALETTE.secondaryLight,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.primaryDark,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PALETTE.lightBg,
    padding: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.primaryDark,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderColor: PALETTE.secondaryMedium,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: PALETTE.secondaryMedium,
    fontStyle: 'italic',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1.5,
    borderTopColor: PALETTE.secondaryLight,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxSquare: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PALETTE.secondaryMedium,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareActive: {
    backgroundColor: PALETTE.vibrantAccent,
    borderColor: PALETTE.secondaryLight,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.primaryDark,
  },
  continueButton: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonActive: {
    backgroundColor: PALETTE.vibrantAccent,
    shadowColor: PALETTE.vibrantAccent,
  },
  continueButtonDisabled: {
    backgroundColor: PALETTE.secondaryMedium,
    opacity: 0.5,
    shadowColor: 'transparent',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  fromBoilesFooter: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: PALETTE.secondaryMedium,
    letterSpacing: 2,
    marginTop: 2,
  },
});
