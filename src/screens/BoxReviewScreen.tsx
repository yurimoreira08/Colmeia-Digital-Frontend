import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { FloatingScrollButtons } from '../components/FloatingScrollButtons';
import { RevisionOptionSection } from '../components/revision/RevisionOptionSection';
import { VoiceNoteInput } from '../components/revision/VoiceNoteInput';
import { useBoxRevision } from '../hooks/useBoxRevision';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';
import { QUEEN_BROOD_FOOD_OPTIONS, STRENGTH_OPTIONS, TYPE_AND_SPACE_OPTIONS } from '../utils/revisionOptions';
import { createBoxReviewStyles } from './styles/BoxReviewScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BoxRevision'>;

/**
 * Revisão da caixa: o apicultor marca o que viu (por toque ou voz) e anota
 * observações e o que fazer. O estado e os comandos de voz ficam em
 * useBoxRevision; aqui só a interface.
 */
export function BoxRevisionScreen({ navigation, route }: Props) {
  const { colors, themeName } = useAppTheme();
  const styles = createBoxReviewStyles(colors);
  const placeholderColor = themeName === 'obsidian-dark' ? '#64748B' : '#94A3B8';
  const { isKeyboardVisible, keyboardHeight } = useKeyboardVisible();
  const [scrollY, setScrollY] = useState(0);

  const revision = useBoxRevision(route.params);
  const { isListening, currentTranscript, toggleListening } = revision.voice;
  const { activeVoiceField, isFilled } = revision;

  const sectionProps = {
    selected: revision.selectedOptions,
    onToggle: revision.toggleOption,
    onSectionLayout: revision.registerSectionY,
    onItemLayout: revision.registerItemY,
    styles,
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Revisão"
        showBack
        showMic
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      {isListening && (currentTranscript || activeVoiceField) ? (
        <Animated.View style={styles.floatingTranscript}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: currentTranscript ? 4 : 0 }}>
            <MaterialCommunityIcons name="microphone" size={16} color={colors.textPrimary} />
            <Text style={[styles.floatingTranscriptText, { opacity: 0.8 }]}>
              {activeVoiceField === 'obs' ? 'Ouvindo Observação...' : activeVoiceField === 'act' ? 'Ouvindo O Que Fazer...' : 'Ouvindo comandos...'}
            </Text>
          </View>
          {currentTranscript ? (
            <Text style={styles.floatingTranscriptText} numberOfLines={2}>
              "{currentTranscript}"
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={revision.scrollViewRef}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Caixa e apiário em revisão */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconBadge}>
              <MaterialCommunityIcons name="cube-outline" size={26} color={PALETTE.primaryDark} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.heroBoxTitle}>{route.params.boxName}</Text>
              <View style={styles.heroApiaryRow}>
                <MaterialCommunityIcons name="beehive-outline" size={15} color={PALETTE.secondaryDark} />
                <Text style={styles.heroApiaryText}>{route.params.apiaryName}</Text>
              </View>
            </View>
            <View style={styles.activeRevisionBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.activeRevisionBadgeText}>Em Revisão</Text>
            </View>
          </View>

          {/* Liga e desliga o comando de voz */}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.voiceCard,
              isListening ? styles.voiceCardActive : null,
              pressed ? { transform: [{ scale: 0.99 }] } : null,
            ]}
            onPress={() => {
              void toggleListening();
            }}
          >
            <View style={[styles.voiceIconWrap, isListening ? styles.voiceIconWrapActive : null]}>
              <MaterialCommunityIcons
                name={isListening ? 'microphone' : 'microphone-outline'}
                size={26}
                color={isListening ? '#FFFFFF' : PALETTE.primaryDark}
              />
            </View>
            <View style={styles.voiceTextWrap}>
              <Text style={styles.voiceTitle}>{isListening ? 'Ouvindo seus comandos...' : 'Comando por Voz'}</Text>
              <Text style={styles.voiceSubtitle}>
                {isListening ? 'Fale os itens para marcar ou dite anotações' : 'Toque para preencher falando em campo'}
              </Text>
            </View>
            {isListening ? (
              <View style={styles.recordingPill}>
                <Text style={styles.recordingPillText}>ATIVO</Text>
              </View>
            ) : null}
          </Pressable>

          <RevisionOptionSection sectionId="sec1" title="TIPO E ESPAÇO" options={TYPE_AND_SPACE_OPTIONS} {...sectionProps} />
          <RevisionOptionSection sectionId="sec2" title="RAINHA, CRIA E ALIMENTO" options={QUEEN_BROOD_FOOD_OPTIONS} {...sectionProps} />
          <RevisionOptionSection sectionId="sec3" title="FORÇA DO ENXAME" options={STRENGTH_OPTIONS} variant="strength" {...sectionProps} />

          {/* Anotações de campo */}
          <View style={styles.sectionBlock} onLayout={(e) => revision.registerSectionY('sec4', e.nativeEvent.layout.y)}>
            <Text style={styles.sectionHeader}>ANOTAÇÕES DE CAMPO</Text>
            <VoiceNoteInput
              label="Observações"
              placeholder="Ex: Enxame calmo, rainha ativa..."
              placeholderColor={placeholderColor}
              value={revision.observation}
              preview={revision.tempObservation}
              isDictating={activeVoiceField === 'obs' && isListening}
              onChangeText={revision.changeObservation}
              onFocus={() => revision.setActiveVoiceField('obs')}
              onLayout={(y) => revision.registerItemY('obs', 'sec4', y)}
              styles={styles}
            />
            <VoiceNoteInput
              label="O que fazer"
              placeholder="Ex: Adicionar melgueira, alimentar..."
              placeholderColor={placeholderColor}
              value={revision.indication}
              preview={revision.tempIndication}
              isDictating={activeVoiceField === 'act' && isListening}
              onChangeText={revision.changeIndication}
              onFocus={() => revision.setActiveVoiceField('act')}
              onLayout={(y) => revision.registerItemY('act', 'sec4', y)}
              styles={styles}
            />
          </View>

          <View style={styles.actionsArea}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryAction,
                isFilled ? styles.primaryActionFilled : null,
                pressed ? { transform: [{ scale: 0.985 }] } : null,
              ]}
              onPress={revision.handleFinishRevision}
            >
              <MaterialCommunityIcons name="check-circle" size={26} color={isFilled ? PALETTE.primaryDark : '#FFFFFF'} />
              <Text style={[styles.primaryActionText, isFilled ? styles.primaryActionTextFilled : null]}>
                Salvar Revisão
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FloatingScrollButtons
        scrollRef={revision.scrollViewRef}
        currentY={scrollY}
        bottomOffset={isKeyboardVisible ? keyboardHeight + 16 : 170}
      />

      {!isKeyboardVisible && (
        <BottomDock
          active={null}
          onPressHome={() => navigation.replace('Home')}
          onPressSettings={() => navigation.replace('Settings')}
        />
      )}

      <ConfirmModal
        visible={revision.successModal}
        title="Revisão Salva"
        message={`Revisão da caixa ${route.params.boxName} registrada com sucesso.`}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => {
          revision.closeSuccessModal();
          navigation.goBack();
        }}
      />

      <ConfirmModal
        visible={!!revision.errorModal}
        title="Erro"
        message={revision.errorModal || ''}
        confirmLabel="OK"
        hideCancel
        onConfirm={revision.closeErrorModal}
      />
    </View>
  );
}
