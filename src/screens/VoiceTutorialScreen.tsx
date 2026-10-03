import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppTheme } from '../theme/ThemeContext';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceTutorial'>;

type CommandBadgeProps = {
  command: string;
  description?: string;
};

export function VoiceTutorialScreen({ navigation }: Props) {
  const { colors, themeName } = useAppTheme();
  const isDark = themeName === 'obsidian-dark';
  const { isListening, currentTranscript, toggleListening } = useVoiceCommand();
  const styles = createStyles(colors, isDark);

  function CommandBadge({ command, description }: CommandBadgeProps) {
    return (
      <View style={styles.badgeWrapper}>
        <View style={styles.speechBubble}>
          <Ionicons name="mic" size={13} color={colors.accent} style={{ marginRight: 4 }} />
          <Text style={styles.badgeText}>"{command}"</Text>
        </View>
        {description ? <Text style={styles.badgeDesc}>{description}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header Fixo */}
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tutorial de Voz</Text>
          <Text style={styles.headerSubtitle}>Operação mãos livres no apiário</Text>
        </View>

        <Pressable
          style={[styles.micTestBtn, isListening ? styles.micTestBtnActive : null]}
          onPress={toggleListening}
          hitSlop={8}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={18}
            color={isListening ? '#FFFFFF' : colors.accent}
          />
          <Text style={[styles.micTestBtnText, isListening ? { color: '#FFFFFF' } : null]}>
            {isListening ? 'Ouvindo...' : 'Testar'}
          </Text>
        </Pressable>
      </View>

      {/* Conteúdo Rolável do Tutorial */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Live Feedback Card */}
        {isListening ? (
          <View style={styles.liveTranscriptCard}>
            <View style={styles.liveTranscriptHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTranscriptTitle}>Reconhecimento em tempo real:</Text>
            </View>
            <Text style={styles.liveTranscriptText}>
              {currentTranscript || 'Fale algo para testar os comandos...'}
            </Text>
          </View>
        ) : null}

        {/* Card de Boas-Vindas */}
        <View style={styles.introCard}>
          <View style={styles.introIconWrap}>
            <MaterialCommunityIcons name="hand-back-left-off" size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Trabalhe sem tirar as luvas!</Text>
            <Text style={styles.introBody}>
              O Colmeia Digital foi projetado para permitir que você execute o manejo completo e a navegação no apiário utilizando apenas a voz.
            </Text>
          </View>
        </View>

        {/* 1. SEÇÃO REVISÃO DE CAIXA */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#05966918' }]}>
              <Ionicons name="clipboard-outline" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>1. Fazendo uma Revisão</Text>
              <Text style={styles.sectionSubtitle}>Na tela de Revisão da Caixa</Text>
            </View>
          </View>

          <Text style={styles.stepIntro}>
            Ao abrir a tela de revisão, o microfone é ativado automaticamente. Diga o que observar para marcar os checkboxes:
          </Text>

          <View style={styles.badgesContainer}>
            <CommandBadge command="rainha" description="Marca a presença da rainha" />
            <CommandBadge command="postura" description="Confirma postura regular" />
            <CommandBadge command="ovos" description="Marca ovos do dia" />
            <CommandBadge command="mel" description="Registra presença de mel" />
            <CommandBadge command="polen" description="Registra reserva de pólen" />
            <CommandBadge command="cria aberta" description="Presença de larvas/crias abertas" />
            <CommandBadge command="cria fechada" description="Presença de opérculos/crias fechadas" />
            <CommandBadge command="realeira" description="Marca presença de realeiras" />
            <CommandBadge command="zangao" description="Registra presença de zangões" />
            <CommandBadge command="com espaco" description="Espaço suficiente para postura" />
            <CommandBadge command="sem espaco" description="Ninho com superlotação" />
            <CommandBadge command="forca boa" description="Enxame forte e populoso" />
            <CommandBadge command="forca media" description="Desenvolvimento regular" />
            <CommandBadge command="forca fraca" description="Enxame fraco ou lento" />
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" />
            <Text style={styles.tipText}>
              <Text style={styles.boldText}>Ditado de Observações:</Text> Diga <Text style={styles.codeText}>"observação [seu texto]"</Text> para preencher o campo de notas e <Text style={styles.codeText}>"indicação [seu texto]"</Text> para registrar ações recomendadas.
            </Text>
          </View>

          <View style={styles.finishBox}>
            <Text style={styles.finishBoxTitle}>Para salvar a revisão:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              <CommandBadge command="encerrar revisao" />
              <CommandBadge command="salvar revisao" />
              <CommandBadge command="concluir" />
            </View>
          </View>
        </View>

        {/* 2. SEÇÃO MANEJO TÉCNICO */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#D9770618' }]}>
              <Ionicons name="construct-outline" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>2. Registrando Manejo Técnico</Text>
              <Text style={styles.sectionSubtitle}>Na tela de Manejo de Campo</Text>
            </View>
          </View>

          <Text style={styles.stepIntro}>
            Diga o nome das tarefas realizadas para abrir os cartões de manejo:
          </Text>

          <View style={styles.badgesContainer}>
            <CommandBadge command="alimentacao energetica" description="Xarope de açúcar / glicose" />
            <CommandBadge command="alimentacao proteica" description="Bife / suplemento proteico" />
            <CommandBadge command="troca de cera" description="Substituição de caixilhos velhos" />
            <CommandBadge command="cera alveolada" description="Adição de cera laminada" />
            <CommandBadge command="divisao de enxame" description="Multiplicação de colmeia" />
            <CommandBadge command="uniao de enxame" description="Junção de colônias" />
            <CommandBadge command="introducao de rainha" description="Substituição ou nova matriz" />
            <CommandBadge command="colheita de mel" description="Centrifugação e retirada" />
            <CommandBadge command="tratamento de pragas" description="Varroa, traça ou sanidade" />
            <CommandBadge command="outro" description="Outra intervenção personalizada" />
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="camera-outline" size={18} color="#059669" />
            <Text style={styles.tipText}>
              <Text style={styles.boldText}>Foto do Manejo por Voz:</Text> Diga <Text style={styles.codeText}>"tirar foto"</Text> ou <Text style={styles.codeText}>"abrir camera"</Text> para anexar uma comprovação fotográfica sem encostar na tela.
            </Text>
          </View>

          <View style={styles.finishBox}>
            <Text style={styles.finishBoxTitle}>Para salvar o manejo:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              <CommandBadge command="salvar manejo" />
              <CommandBadge command="encerrar manejo" />
            </View>
          </View>
        </View>

        {/* 3. SEÇÃO SELEÇÃO DE CAIXAS E APIÁRIOS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#2563EB18' }]}>
              <Ionicons name="cube-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>3. Selecionando Caixas e Apiários</Text>
              <Text style={styles.sectionSubtitle}>Nas telas de listagem</Text>
            </View>
          </View>

          <Text style={styles.stepIntro}>
            Abra diretamente qualquer caixa ou apiário falando o número ou o nome:
          </Text>

          <View style={styles.badgesContainer}>
            <CommandBadge command="caixa 1" description="Abre a Caixa 1 na tela atual" />
            <CommandBadge command="caixa dois" description="Reconhece números por extenso" />
            <CommandBadge command="revisar caixa 3" description="Vai direto para nova revisão" />
            <CommandBadge command="manejar caixa 5" description="Vai direto para novo manejo" />
            <CommandBadge command="historico caixa 2" description="Abre anotações anteriores" />
            <CommandBadge command="abrir apiario [nome]" description="Abre a lista de caixas do apiário" />
            <CommandBadge command="buscar [termo]" description="Filtra a lista em tempo real" />
            <CommandBadge command="limpar busca" description="Restaura a lista completa" />
          </View>
        </View>

        {/* 4. SEÇÃO NAVEGAÇÃO GLOBAL */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#7C3AED18' }]}>
              <Ionicons name="compass-outline" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>4. Navegando entre Telas</Text>
              <Text style={styles.sectionSubtitle}>Funciona em qualquer lugar do aplicativo</Text>
            </View>
          </View>

          <View style={styles.badgesContainer}>
            <CommandBadge command="inicio" description="Volta para a Home" />
            <CommandBadge command="apiarios" description="Abre a lista de apiários" />
            <CommandBadge command="novo apiario" description="Abre cadastro de apiário" />
            <CommandBadge command="revisoes" description="Abre lista de revisões" />
            <CommandBadge command="manejos" description="Abre lista de manejos" />
            <CommandBadge command="relatorios" description="Abre histórico e gráficos" />
            <CommandBadge command="notificacoes" description="Abre avisos do sistema" />
            <CommandBadge command="configuracoes" description="Abre opções do app" />
            <CommandBadge command="meu perfil" description="Abre dados do apicultor" />
            <CommandBadge command="voltar" description="Retorna à tela anterior" />
          </View>
        </View>

        {/* 5. SEÇÃO ROLAGEM SEM AS MÃOS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#0D948818' }]}>
              <Ionicons name="swap-vertical-outline" size={20} color="#0D9488" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>5. Rolagem de Tela</Text>
              <Text style={styles.sectionSubtitle}>Rolar formulários e relatórios longos</Text>
            </View>
          </View>

          <View style={styles.badgesContainer}>
            <CommandBadge command="descer" description="Rola a tela para baixo" />
            <CommandBadge command="para baixo" description="Rola a tela para baixo" />
            <CommandBadge command="subir" description="Rola a tela para cima" />
            <CommandBadge command="para cima" description="Rola a tela para cima" />
          </View>
        </View>

        {/* 6. CONTROLE DO MICROFONE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EF444418' }]}>
              <Ionicons name="mic-off-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>6. Controle do Microfone</Text>
              <Text style={styles.sectionSubtitle}>Pausar e gerenciar a escuta</Text>
            </View>
          </View>

          <View style={styles.badgesContainer}>
            <CommandBadge command="parar comando de voz" description="Pausa a escuta de voz" />
            <CommandBadge command="parar escuta" description="Desativa o microfone" />
            <CommandBadge command="ajuda de voz" description="Exibe resumo rápido" />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    micTestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    micTestBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    micTestBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 14,
    },
    liveTranscriptCard: {
      backgroundColor: colors.accentSoft,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: colors.accent,
      gap: 6,
    },
    liveTranscriptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    liveTranscriptTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    liveTranscriptText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontStyle: 'italic',
      fontWeight: '500',
    },
    introCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    introIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    introBody: {
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.textMuted,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    stepIntro: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textPrimary,
    },
    badgesContainer: {
      gap: 8,
    },
    badgeWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    speechBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    badgeDesc: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
      minWidth: 140,
    },
    tipBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.1)' : '#FEF3C7',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A',
      alignItems: 'flex-start',
    },
    tipText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    boldText: {
      fontWeight: '700',
    },
    codeText: {
      fontWeight: '700',
      color: colors.accent,
    },
    finishBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    finishBoxTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });
}
