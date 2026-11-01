import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceTutorial'>;

type CommandBadgeProps = {
  command: string;
  description?: string;
};

export function VoiceTutorialScreen({ navigation }: Props) {
  const { colors, themeName } = useAppTheme();
  const { isListening, currentTranscript, toggleListening } = useVoiceCommand();
  const styles = createStyles(colors);

  function CommandBadge({ command, description }: CommandBadgeProps) {
    return (
      <View style={styles.badgeWrapper}>
        <View style={styles.speechBubble}>
          <Text style={styles.badgeText}>"{command}"</Text>
        </View>
        {description ? <Text style={styles.badgeDesc}>{description}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Comandos de Voz"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      {/* Barra de Teste Rápido */}
      <View style={styles.testBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.testBarTitle}>Operação Mãos Livres</Text>
          <Text style={styles.testBarSubtitle}>Fale os comandos naturalmente em campo</Text>
        </View>

        <Pressable
          style={[styles.micTestBtn, isListening ? styles.micTestBtnActive : null]}
          onPress={toggleListening}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={isListening ? 'microphone' : 'microphone-outline'}
            size={20}
            color={isListening ? '#FFFFFF' : PALETTE.primaryDark}
          />
          <Text style={[styles.micTestBtnText, isListening ? { color: '#FFFFFF' } : null]}>
            {isListening ? 'Ouvindo...' : 'Testar Voz'}
          </Text>
        </Pressable>
      </View>

      {/* Conteúdo Rolável do Tutorial */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <MaterialCommunityIcons name="microphone-message" size={32} color={PALETTE.primaryDark} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.introTitle}>Trabalhe sem tirar as luvas!</Text>
            <Text style={styles.introBody}>
              O Colmeia Digital foi projetado para permitir que você execute o manejo completo e a navegação no apiário utilizando apenas a voz.
            </Text>
          </View>
        </View>

        {/* 1. SEÇÃO REVISÃO DE CAIXA */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={PALETTE.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>1. Fazendo uma Revisão</Text>
              <Text style={styles.sectionSubtitle}>Na tela de Revisão da Caixa</Text>
            </View>
          </View>

          <Text style={styles.stepIntro}>
            Ao abrir a tela de revisão, o microfone é ativado automaticamente. Diga o que observar para marcar os itens:
          </Text>

          <View style={styles.badgesContainer}>
            <CommandBadge command="rainha" description="Marca a presença da rainha" />
            <CommandBadge command="ovos" description="Marca ovos do dia" />
            <CommandBadge command="mel" description="Registra presença de mel" />
            <CommandBadge command="polen" description="Registra reserva de pólen" />
            <CommandBadge command="cria nova" description="Presença de crias novas de 3 dias" />
            <CommandBadge command="cria aberta" description="Presença de larvas/crias abertas" />
            <CommandBadge command="cria fechada" description="Presença de opérculos/crias fechadas" />
            <CommandBadge command="com espaco" description="Espaço suficiente para postura" />
            <CommandBadge command="sem espaco" description="Ninho com superlotação" />
            <CommandBadge command="forca boa" description="Enxame forte e populoso" />
            <CommandBadge command="forca media" description="Desenvolvimento regular" />
            <CommandBadge command="forca fraca" description="Enxame fraco ou lento" />
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              <Text style={styles.boldText}>Ditado de Anotações:</Text> Diga <Text style={styles.codeText}>"observação [seu texto]"</Text> para preencher o campo de notas e <Text style={styles.codeText}>"o que fazer [seu texto]"</Text> para registrar ações recomendadas.
            </Text>
          </View>

          <View style={styles.finishBox}>
            <Text style={styles.finishBoxTitle}>Para salvar a revisão:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <CommandBadge command="salvar revisao" />
              <CommandBadge command="encerrar revisao" />
            </View>
          </View>
        </View>

        {/* 2. SEÇÃO MANEJO TÉCNICO */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="tools" size={24} color={PALETTE.primaryDark} />
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
            <Text style={styles.tipText}>
              <Text style={styles.boldText}>Foto do Manejo por Voz:</Text> Diga <Text style={styles.codeText}>"tirar foto"</Text> ou <Text style={styles.codeText}>"abrir camera"</Text> para anexar uma comprovação fotográfica sem encostar na tela.
            </Text>
          </View>

          <View style={styles.finishBox}>
            <Text style={styles.finishBoxTitle}>Para salvar o manejo:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <CommandBadge command="salvar manejo" />
              <CommandBadge command="encerrar manejo" />
            </View>
          </View>
        </View>

        {/* 3. SEÇÃO NAVEGAÇÃO GLOBAL */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="compass-outline" size={24} color={PALETTE.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>3. Navegando entre Telas</Text>
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

        {/* 4. SEÇÃO ROLAGEM E CONTROLE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <MaterialCommunityIcons name="swap-vertical" size={24} color={PALETTE.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>4. Rolagem e Controle</Text>
              <Text style={styles.sectionSubtitle}>Comandos auxiliares em formulários</Text>
            </View>
          </View>

          <View style={styles.badgesContainer}>
            <CommandBadge command="descer" description="Rola a tela para baixo" />
            <CommandBadge command="subir" description="Rola a tela para cima" />
            <CommandBadge command="parar escuta" description="Pausa temporariamente o microfone" />
            <CommandBadge command="ajuda de voz" description="Exibe orientações de voz" />
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: PALETTE.lightSurface,
    },
    testBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1.5,
      borderBottomColor: PALETTE.secondaryLight,
    },
    testBarTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    testBarSubtitle: {
      fontSize: 13,
      color: PALETTE.secondaryDark,
      fontWeight: '500',
    },
    micTestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: PALETTE.lightSurface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: PALETTE.primaryDark,
    },
    micTestBtnActive: {
      backgroundColor: PALETTE.primaryDark,
      borderColor: PALETTE.primaryDark,
    },
    micTestBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    liveTranscriptCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.vibrantAccent,
      gap: 8,
    },
    liveTranscriptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: PALETTE.primaryDark,
    },
    liveTranscriptTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    liveTranscriptText: {
      fontSize: 16,
      color: PALETTE.primaryDark,
      fontStyle: 'italic',
      fontWeight: '600',
    },
    introCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
    },
    introIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    introBody: {
      fontSize: 14.5,
      lineHeight: 21,
      color: PALETTE.secondaryDark,
      fontWeight: '500',
    },
    sectionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      gap: 14,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.2,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: PALETTE.secondaryDark,
      fontWeight: '600',
    },
    stepIntro: {
      fontSize: 15,
      lineHeight: 22,
      color: PALETTE.primaryDark,
      fontWeight: '600',
    },
    badgesContainer: {
      gap: 10,
    },
    badgeWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    speechBubble: {
      backgroundColor: PALETTE.lightSurface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
    },
    badgeText: {
      fontSize: 16,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    badgeDesc: {
      flex: 1,
      fontSize: 14,
      color: PALETTE.secondaryDark,
      fontWeight: '600',
      minWidth: 150,
    },
    tipBox: {
      backgroundColor: PALETTE.lightSurface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
    },
    tipText: {
      fontSize: 14.5,
      lineHeight: 21,
      color: PALETTE.primaryDark,
    },
    boldText: {
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    codeText: {
      fontWeight: '800',
      color: PALETTE.secondaryLight,
    },
    finishBox: {
      backgroundColor: PALETTE.lightSurface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
      gap: 8,
    },
    finishBoxTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
  });
}
