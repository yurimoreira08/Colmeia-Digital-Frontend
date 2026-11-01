import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ConfirmModal } from '../components/ConfirmModal';
import { saveRevision } from '../services/reviewReportService';
import { markBoxModifiedInSession } from '../services/sessionStore';
import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { FloatingScrollButtons } from '../components/FloatingScrollButtons';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';

type Props = NativeStackScreenProps<RootStackParamList, 'BoxRevision'>;

type RevisionOption = {
  id: string;
  label: string;
};

const CHECK_OPTIONS: RevisionOption[] = [
  { id: 'nucleo', label: 'Nucleo' },
  { id: 'caixa', label: 'Caixa' },
  { id: 'rainha', label: 'Rainha' },
  { id: 'polen', label: 'Polen' },
  { id: 'mel', label: 'Mel' },
  { id: 'cria-nova-3-dias', label: 'Cria Nova\n3 dias' },
  { id: 'cria-aberta', label: 'Cria Aberta' },
  { id: 'cria-fechada', label: 'Cria Fechada' },
  { id: 'ovos', label: 'Ovos' },
  { id: 'com-espaco', label: 'Com espaco' },
  { id: 'sem-espaco', label: 'Sem espaco' },
  { id: 'forca-fraca', label: 'Força - Fraca' },
  { id: 'forca-media', label: 'Força - Média' },
  { id: 'forca-boa', label: 'Força - Boa' },
];

const OPTION_ALIASES: Record<string, string[]> = {
  nucleo: ['nucleo'],
  caixa: ['caixa'],
  rainha: ['rainha'],
  polen: ['polen', 'polém', 'polem', 'pollen'],
  mel: ['mel'],
  'cria-nova-3-dias': ['cria nova', 'cria nova 3 dias', 'cria de 3 dias'],
  'cria-aberta': ['cria aberta'],
  'cria-fechada': ['cria fechada'],
  ovos: ['ovos', 'ovo'],
  'com-espaco': ['com espaco', 'tem espaco', 'com espaço'],
  'sem-espaco': ['sem espaco', 'sem espaço'],
  'forca-fraca': ['fraca'],
  'forca-media': ['media', 'média'],
  'forca-boa': ['boa'],
  'com-enxame': ['com enxame', 'enxame'],
  'sem-enxame': ['sem enxame'],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se a palavra/frase `word` ocorre como palavra inteira dentro de `text`.
 * Previne matches falsos como 'mel' dentro de 'carnaval' ou 'obs' dentro de 'observar'.
 */
function containsWholeWord(text: string, word: string): boolean {
  let idx = text.indexOf(word);
  while (idx !== -1) {
    const before = idx > 0 ? text[idx - 1] : ' ';
    const after = idx + word.length < text.length ? text[idx + word.length] : ' ';
    if (/[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after)) return true;
    idx = text.indexOf(word, idx + 1);
  }
  return false;
}

export function BoxRevisionScreen({ navigation, route }: Props) {
  const { colors, themeName } = useAppTheme();
  const styles = createStyles(colors);
  const placeholderColor = themeName === 'obsidian-dark' ? '#64748B' : '#94A3B8';
  const { isKeyboardVisible, keyboardHeight } = useKeyboardVisible();
  const { isListening, currentTranscript, startListening, stopListening, toggleListening, registerScreenCommandHandler } = useVoiceCommand();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [observation, setObservation] = useState('');
  const [indication, setIndication] = useState('');
  const [tempObservation, setTempObservation] = useState('');
  const [tempIndication, setTempIndication] = useState('');
  const isFilled = Object.keys(selectedOptions).length > 0 || observation.trim().length > 0 || indication.trim().length > 0;
  const [activeVoiceField, setActiveVoiceFieldState] = useState<'obs' | 'act' | null>(null);
  const activeVoiceFieldRef = useRef<'obs' | 'act' | null>(null);
  function setActiveVoiceField(field: 'obs' | 'act' | null) {
    activeVoiceFieldRef.current = field;
    setActiveVoiceFieldState(field);
  }
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const handledKeywordsRef = useRef<Set<string>>(new Set());
  const sectionYRef = useRef<Record<string, number>>({});
  const itemPositionsRef = useRef<Record<string, number>>({});

  const scrollToItem = useCallback((itemId: string) => {
    setTimeout(() => {
      const y = itemPositionsRef.current[itemId];
      if (typeof y === 'number' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: Math.max(0, y - 60),
          animated: true,
        });
      }
    }, 60);
  }, []);

  // Ref com snapshot dos valores para handleFinishRevision — evita que obs/indication
  // no dep array causem re-run do useFocusEffect a cada palavra falada
  const latestRevisionValuesRef = useRef({ selectedOptions, observation, indication });
  useEffect(() => {
    latestRevisionValuesRef.current = { selectedOptions, observation, indication };
  }, [selectedOptions, observation, indication]);

  const toggleOption = useCallback((id: string) => {
    setSelectedOptions((prev) => {
      const nextObj = { ...prev, [id]: !prev[id] };
      if (nextObj[id]) {
        if (id === 'caixa') nextObj['nucleo'] = false;
        if (id === 'nucleo') nextObj['caixa'] = false;
        if (id === 'com-espaco') nextObj['sem-espaco'] = false;
        if (id === 'sem-espaco') nextObj['com-espaco'] = false;
        if (id === 'com-enxame') nextObj['sem-enxame'] = false;
        if (id === 'sem-enxame') nextObj['com-enxame'] = false;
        if (id === 'ovos') nextObj['rainha'] = true;
        if (id === 'forca-fraca') { nextObj['forca-media'] = false; nextObj['forca-boa'] = false; }
        if (id === 'forca-media') { nextObj['forca-fraca'] = false; nextObj['forca-boa'] = false; }
        if (id === 'forca-boa') { nextObj['forca-fraca'] = false; nextObj['forca-media'] = false; }
      }
      return nextObj;
    });
  }, []);

  const setOptionState = useCallback((id: string, checked: boolean) => {
    setSelectedOptions((prev) => {
      const nextObj = { ...prev, [id]: checked };
      if (nextObj[id]) {
        if (id === 'caixa') nextObj['nucleo'] = false;
        if (id === 'nucleo') nextObj['caixa'] = false;
        if (id === 'com-espaco') nextObj['sem-espaco'] = false;
        if (id === 'sem-espaco') nextObj['com-espaco'] = false;
        if (id === 'com-enxame') nextObj['sem-enxame'] = false;
        if (id === 'sem-enxame') nextObj['com-enxame'] = false;
        if (id === 'ovos') nextObj['rainha'] = true;
        if (id === 'forca-fraca') { nextObj['forca-media'] = false; nextObj['forca-boa'] = false; }
        if (id === 'forca-media') { nextObj['forca-fraca'] = false; nextObj['forca-boa'] = false; }
        if (id === 'forca-boa') { nextObj['forca-fraca'] = false; nextObj['forca-media'] = false; }
      }
      return nextObj;
    });
  }, []);

  const handleFinishRevision = useCallback(() => {
    // Usa ref para garantir valores sempre atualizados sem criar deps instáveis
    const { selectedOptions: opts, observation: obs, indication: ind } = latestRevisionValuesRef.current;
    const checkedIds = Object.entries(opts)
      .filter(([, v]) => v)
      .map(([k]) => k);

    saveRevision({
      caixaId: route.params.boxId,
      caixaName: route.params.boxName,
      apiaryId: route.params.apiaryId,
      apiaryName: route.params.apiaryName,
      tipo: route.params.tipo,
      checkedOptions: checkedIds,
      observacoes: obs,
      indicacoes: ind,
    }).then(() => {
      markBoxModifiedInSession(route.params.boxId, 'revisao');
      stopListening();
      setSuccessModal(true);
    }).catch((err) => {
      setErrorModal(err?.message || 'Não foi possível salvar a revisão. Tente novamente.');
    });

  // route.params é estável; selectedOptions/observation/indication lidos via ref
  }, [route.params, stopListening]);

  useFocusEffect(
    useCallback(() => {
      // Ativa o microfone automaticamente ao entrar na tela
      void startListening();

      const unsubscribe = registerScreenCommandHandler((transcript, isFinal) => {
        let cleanCommand = normalizeText(transcript);

        // 0. Verifica se o usuário falou para concluir o campo
        let shouldCloseField = false;
        const closeFieldCommands = ['concluir tarefa', 'fechar tarefa', 'concluir a tarefa', 'fechar a tarefa', 'concluir campo', 'concluir'];
        for (const cmd of closeFieldCommands) {
           if (containsWholeWord(cleanCommand, cmd)) {
               shouldCloseField = true;
               // Especial: se for apenas 'concluir', removemos ele. Se for parte de algo maior, removemos a keyword.
               cleanCommand = cleanCommand.replace(new RegExp(`\\b${cmd}\\b`, 'g'), '').trim();
               break;
           }
        }
        if (!shouldCloseField) {
           if (cleanCommand.endsWith(' concluir')) {
               shouldCloseField = true;
               cleanCommand = cleanCommand.replace(/\bconcluir$/, '').trim();
           }
        }

        const command = cleanCommand;

        // Limpa debounce de keywords a cada resultado final para evitar duplicação
        if (isFinal) {
          handledKeywordsRef.current.clear();
        }

        // --- TRAVA DE VOZ: PRIORIZA DITADO SE UM CAMPO ESTIVER ATIVO ---
        const isDictating = !!activeVoiceFieldRef.current;
        const shouldBypassKeywords = isDictating && !shouldCloseField;

        let handled = false;

        // Descartar transcripts vazios (ruído / motor de voz em silêncio)
        if (!command && !shouldCloseField) return false;

        // 1. Comandos de encerramento (prioridade máxima)
        const closeCommands = ['encerrar revisao', 'encerrar a revisao', 'finalizar revisao', 'concluir revisao'];
        if (closeCommands.some(cmd => command.includes(cmd))) {
          if (isFinal) {
            handleFinishRevision();
          }
          return true;
        }

        // 2. Opções (Checkboxes) — PRIORIDADE SOBRE CAMPOS DE TEXTO (ignoramos se estiver ditando)
        if (!shouldBypassKeywords) {
          const optionsToTest = CHECK_OPTIONS;
          let optionMatched = false;

          for (const option of optionsToTest) {
            const aliases = OPTION_ALIASES[option.id] ?? [];
            // normalizeText(alias): garante que aliases com acentos ('com espaço', 'média', etc.) também matcham
            const matchedAlias = aliases.find((alias) => containsWholeWord(command, normalizeText(alias)));

            if (matchedAlias) {
              if (handledKeywordsRef.current.has(matchedAlias)) continue;
              handledKeywordsRef.current.add(matchedAlias);

              if (isFinal) {
                setActiveVoiceField(null);
                setTempObservation('');
                setTempIndication('');
              }

              const shouldCheck = containsWholeWord(command, 'selecionar') || containsWholeWord(command, 'marcar') || command === matchedAlias;
              const shouldUncheck = containsWholeWord(command, 'desmarcar') || containsWholeWord(command, 'remover') || containsWholeWord(command, 'tirar');

              if (shouldCheck) {
                setOptionState(option.id, true);
                optionMatched = true;
              } else if (shouldUncheck) {
                setOptionState(option.id, false);
                optionMatched = true;
              } else if (isFinal) {
                toggleOption(option.id);
                optionMatched = true;
              }

              if (optionMatched) {
                scrollToItem(option.id);
                return true;
              }
            }
          }
        }

        // 3. Identifica todas as ocorrências de palavras-chave (word-boundary aware) (ignoramos se estiver ditando)
        
        // 0. Gatilhos do Sistema
        const finishKeywords = ['finalizar', 'encerrar', 'salvar', 'concluir'];
        const closeFieldKeywords = ['concluir campo', 'fechar campo', 'finalizar campo'];
        
        // 1. Mapeamento de Gatilhos de Campo
        const obsKeywords = ['observacao', 'observacoes', 'anotacao', 'anotacoes', 'comentario', 'comentarios'];
        const actKeywords = ['o que fazer', 'oque fazer', 'indicacao', 'indicacoes', 'tarefa', 'para fazer'];

        interface TriggerMatch { type: 'obs' | 'act' | 'finish' | 'close', kw: string, idx: number, end: number }
        const foundTriggers: TriggerMatch[] = [];

        // Localizar todos os gatilhos no transcript
        const searchKeywords = (kws: string[], type: TriggerMatch['type']) => {
          for (const kw of kws) {
            let searchFrom = 0;
            const normalizedKw = normalizeText(kw);
            while (true) {
              const i = cleanCommand.indexOf(normalizedKw, searchFrom);
              if (i === -1) break;
              if (containsWholeWord(cleanCommand, normalizedKw)) {
                foundTriggers.push({ type, kw: normalizedKw, idx: i, end: i + normalizedKw.length });
              }
              searchFrom = i + 1;
            }
          }
        };

        searchKeywords(obsKeywords, 'obs');
        searchKeywords(actKeywords, 'act');
        searchKeywords(finishKeywords, 'finish');
        searchKeywords(closeFieldKeywords, 'close');

        // Remover sobreposições (ex: "indicacao" dentro de "indicacoes")
        const filteredTriggers = foundTriggers.filter((t, i) => {
          return !foundTriggers.some((other, oi) => {
            if (i === oi) return false;
            return t.idx >= other.idx && t.end <= other.end && other.kw.length > t.kw.length;
          });
        }).sort((a, b) => a.idx - b.idx);

        handled = false;

        // Se encontrou gatilhos, processamos os segmentos
        if (filteredTriggers.length > 0) {
          // Processar texto ANTES do primeiro gatilho (pertence ao campo sticky atual)
          const firstTrigger = filteredTriggers[0];
          const preText = cleanCommand.substring(0, firstTrigger.idx).trim();
          if (preText && activeVoiceFieldRef.current) {
             const cleanPayload = preText.replace(/^(falar|dizer|que|de|do|da|com|sobre|adicione|escreva|registre|coloque)\s+/i, '').trim();
             if (cleanPayload) {
                const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
                if (isFinal) {
                  if (activeVoiceFieldRef.current === 'obs') setObservation(p => p ? p.trim().replace(/[.?!]$/, '') + '. ' + formatted : formatted);
                  else setIndication(p => p ? p.trim().replace(/[.?!]$/, '') + '. ' + formatted : formatted);
                } else {
                  if (activeVoiceFieldRef.current === 'obs') setTempObservation(formatted);
                  else setTempIndication(formatted);
                }
             }
          }

          // Processar cada gatilho e o texto que o segue
          for (let i = 0; i < filteredTriggers.length; i++) {
            const trigger = filteredTriggers[i];
            const nextTrigger = filteredTriggers[i+1];
            const segmentText = cleanCommand.substring(trigger.end, nextTrigger ? nextTrigger.idx : cleanCommand.length).trim();
            const cleanPayload = segmentText.replace(/^(falar|dizer|que|de|do|da|com|sobre|adicione|escreva|registre|coloque)\s+/i, '').trim();

            if (trigger.type === 'finish') {
              if (isFinal) handleFinishRevision();
              return true;
            }
            if (trigger.type === 'close') {
              if (isFinal) {
                setActiveVoiceField(null);
                setTempObservation('');
                setTempIndication('');
              }
              handled = true;
              continue;
            }

            // Gatilhos de Campo (obs / act)
            setActiveVoiceField(trigger.type);
            scrollToItem(trigger.type);
            if (isFinal) {
              if (cleanPayload) {
                const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
                if (trigger.type === 'obs') setObservation(p => p ? p.trim().replace(/[.?!]$/, '') + '. ' + formatted : formatted);
                else setIndication(p => p ? p.trim().replace(/[.?!]$/, '') + '. ' + formatted : formatted);
              }
              setTempObservation('');
              setTempIndication('');
            } else {
              if (cleanPayload) {
                const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
                if (trigger.type === 'obs') setTempObservation(formatted);
                else setTempIndication(formatted);
              } else {
                // Se só falou a keyword, ativa o campo visualmente
                if (trigger.type === 'obs') setTempObservation('...');
                else setTempIndication('...');
              }
            }
            handled = true;
          }
        } else if (activeVoiceFieldRef.current && !shouldCloseField) {
          // Lógica Sticky (sem gatilhos na frase atual)
          const cleanPayload = cleanCommand.replace(/^(falar|dizer|que|de|do|da|com|sobre|adicione|escreva|registre|coloque)\s+/i, '').trim();
          if (cleanPayload) {
            const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
            if (isFinal) {
              if (activeVoiceFieldRef.current === 'obs') {
                setObservation(p => p ? p.trim().replace(/[.?!]$/, '') + '. ' + formatted : formatted);
                setTempObservation('');
              } else {
                setIndication(p => p ? p.trim().replace(/[.?!]$/, '') + '. ' + formatted : formatted);
                setTempIndication('');
              }
            } else {
              if (activeVoiceFieldRef.current === 'obs') setTempObservation(formatted);
              else setTempIndication(formatted);
            }
            handled = true;
          }
        }

        // Outros comandos de clique/toggle podem ir aqui (ex: "caixa", "abelhas")
        if (!handled && isFinal) {
           for (const option of CHECK_OPTIONS) {
              if (containsWholeWord(cleanCommand, normalizeText(option.label))) {
                 toggleOption(option.id);
                 handled = true;
              }
           }
        }

        if (shouldCloseField) {
          if (isFinal) {
            setActiveVoiceField(null);
            setTempObservation('');
            setTempIndication('');
          }
          handled = true;
        }

        return handled;
      });


      return () => {
        unsubscribe();
        // Desliga o microfone ao sair da tela
        stopListening();
      };
    }, [handleFinishRevision, registerScreenCommandHandler, setOptionState, toggleOption, startListening, stopListening]),
  );

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
          ref={scrollViewRef}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Hero da Caixa e Apiário */}
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

          {/* Botão de Comando de Voz */}
          <Pressable
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
                name={isListening ? "microphone" : "microphone-outline"}
                size={26}
                color={isListening ? "#FFFFFF" : PALETTE.primaryDark}
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

          {/* Categoria 1: Tipo & Espaço */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current['sec1'] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionHeader}>TIPO E ESPAÇO</Text>
            <View style={styles.grid2Col}>
              {[
                { id: 'nucleo', label: 'Núcleo' },
                { id: 'caixa', label: 'Caixa' },
                { id: 'com-espaco', label: 'Com Espaço' },
                { id: 'sem-espaco', label: 'Sem Espaço' },
              ].map((option) => {
                const active = !!selectedOptions[option.id];
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.itemCard, active ? styles.itemCardActive : null]}
                    onPress={() => toggleOption(option.id)}
                    onLayout={(e) => {
                      itemPositionsRef.current[option.id] = (sectionYRef.current['sec1'] || 0) + e.nativeEvent.layout.y;
                    }}
                  >
                    <Text style={[styles.itemCardText, active ? styles.itemCardTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Categoria 2: Sanidade, Rainha & Postura */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current['sec2'] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionHeader}>RAINHA, CRIA E ALIMENTO</Text>
            <View style={styles.grid2Col}>
              {[
                { id: 'rainha', label: 'Rainha' },
                { id: 'ovos', label: 'Ovos' },
                { id: 'cria-nova-3-dias', label: 'Cria Nova' },
                { id: 'cria-aberta', label: 'Cria Aberta' },
                { id: 'cria-fechada', label: 'Cria Fechada' },
                { id: 'mel', label: 'Mel' },
                { id: 'polen', label: 'Pólen' },
              ].map((option) => {
                const active = !!selectedOptions[option.id];
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.itemCard, active ? styles.itemCardActive : null]}
                    onPress={() => toggleOption(option.id)}
                    onLayout={(e) => {
                      itemPositionsRef.current[option.id] = (sectionYRef.current['sec2'] || 0) + e.nativeEvent.layout.y;
                    }}
                  >
                    <Text style={[styles.itemCardText, active ? styles.itemCardTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Categoria 3: Força do Enxame */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current['sec3'] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionHeader}>FORÇA DO ENXAME</Text>
            <View style={styles.strengthContainer}>
              {[
                { id: 'forca-fraca', label: 'Fraca', activeBg: '#DC2626' },
                { id: 'forca-media', label: 'Média', activeBg: PALETTE.secondaryLight },
                { id: 'forca-boa', label: 'Boa', activeBg: PALETTE.primaryDark },
              ].map((strength) => {
                const active = !!selectedOptions[strength.id];
                return (
                  <Pressable
                    key={strength.id}
                    style={[
                      styles.strengthPill,
                      active 
                        ? { backgroundColor: strength.activeBg, borderColor: strength.activeBg } 
                        : null,
                    ]}
                    onPress={() => toggleOption(strength.id)}
                    onLayout={(e) => {
                      itemPositionsRef.current[strength.id] = (sectionYRef.current['sec3'] || 0) + e.nativeEvent.layout.y;
                    }}
                  >
                    <Text 
                      style={[
                        styles.strengthText, 
                        active ? { color: '#FFFFFF', fontWeight: '800' } : null
                      ]}
                    >
                      {strength.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Categoria 4: Anotações de Campo */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current['sec4'] = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionHeader}>ANOTAÇÕES DE CAMPO</Text>
            
            {/* Observações - SEM ÍCONE ANTES DO TÍTULO */}
            <View
              style={styles.textAreaCard}
              onLayout={(e) => {
                itemPositionsRef.current['obs'] = (sectionYRef.current['sec4'] || 0) + e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>Observações</Text>
                {activeVoiceField === 'obs' && isListening ? (
                  <View style={styles.voiceFieldBadge}>
                    <MaterialCommunityIcons name="microphone" size={14} color={PALETTE.primaryDark} />
                    <Text style={styles.voiceFieldBadgeText}>Ouvindo...</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                style={styles.textArea}
                multiline
                value={observation}
                onChangeText={(val) => {
                  setObservation(val);
                  setTempObservation('');
                }}
                placeholder="Ex: Enxame calmo, rainha ativa..."
                placeholderTextColor={placeholderColor}
                onFocus={() => setActiveVoiceField('obs')}
              />
              {tempObservation ? (
                <Text style={styles.voicePreview}>🎤 {tempObservation}</Text>
              ) : null}
            </View>

            {/* O Que Fazer - SEM ÍCONE ANTES DO TÍTULO */}
            <View
              style={styles.textAreaCard}
              onLayout={(e) => {
                itemPositionsRef.current['act'] = (sectionYRef.current['sec4'] || 0) + e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>O que fazer</Text>
                {activeVoiceField === 'act' && isListening ? (
                  <View style={styles.voiceFieldBadge}>
                    <MaterialCommunityIcons name="microphone" size={14} color={PALETTE.primaryDark} />
                    <Text style={styles.voiceFieldBadgeText}>Ouvindo...</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                style={styles.textArea}
                multiline
                value={indication}
                onChangeText={(val) => {
                  setIndication(val);
                  setTempIndication('');
                }}
                placeholder="Ex: Adicionar melgueira, alimentar..."
                placeholderTextColor={placeholderColor}
                onFocus={() => setActiveVoiceField('act')}
              />
              {tempIndication ? (
                <Text style={styles.voicePreview}>🎤 {tempIndication}</Text>
              ) : null}
            </View>
          </View>

          {/* Botão de Finalização da Revisão */}
          <View style={styles.actionsArea}>
            <Pressable 
              style={({ pressed }) => [
                styles.primaryAction,
                isFilled ? styles.primaryActionFilled : null,
                pressed ? { transform: [{ scale: 0.985 }] } : null,
              ]} 
              onPress={handleFinishRevision}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={26}
                color={isFilled ? PALETTE.primaryDark : '#FFFFFF'}
              />
              <Text style={[styles.primaryActionText, isFilled ? styles.primaryActionTextFilled : null]}>
                Salvar Revisão
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FloatingScrollButtons
        scrollRef={scrollViewRef}
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
        visible={successModal}
        title="Revisão Salva"
        message={`Revisão da caixa ${route.params.boxName} registrada com sucesso.`}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => {
          setSuccessModal(false);
          navigation.goBack();
        }}
      />

      <ConfirmModal
        visible={!!errorModal}
        title="Erro"
        message={errorModal || ''}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => setErrorModal(null)}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: PALETTE.lightSurface,
    },
    floatingTranscript: {
      position: 'absolute',
      top: 100,
      left: 18,
      right: 18,
      backgroundColor: PALETTE.primaryDark,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
    },
    floatingTranscriptText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 130,
      gap: 16,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    heroIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBoxTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    heroApiaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    heroApiaryText: {
      fontSize: 13.5,
      color: PALETTE.secondaryDark,
      fontWeight: '600',
    },
    activeRevisionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: PALETTE.vibrantAccent,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    pulsingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: PALETTE.primaryDark,
    },
    activeRevisionBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    voiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 1,
    },
    voiceCardActive: {
      backgroundColor: PALETTE.lightSurface,
      borderColor: PALETTE.primaryDark,
    },
    voiceIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voiceIconWrapActive: {
      backgroundColor: PALETTE.primaryDark,
    },
    voiceTextWrap: {
      flex: 1,
      gap: 2,
    },
    voiceTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    voiceSubtitle: {
      fontSize: 12.5,
      color: PALETTE.secondaryDark,
    },
    recordingPill: {
      backgroundColor: PALETTE.primaryDark,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    recordingPillText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    sectionBlock: {
      gap: 10,
    },
    sectionHeader: {
      fontSize: 13.5,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.8,
      marginLeft: 4,
    },
    grid2Col: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    itemCard: {
      width: '48.3%',
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      paddingHorizontal: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 2,
      borderColor: PALETTE.secondaryDark,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    itemCardActive: {
      backgroundColor: PALETTE.primaryDark,
      borderColor: PALETTE.secondaryLight,
    },
    itemCardText: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      color: PALETTE.primaryDark,
    },
    itemCardTextActive: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    strengthContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    strengthPill: {
      flex: 1,
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: PALETTE.secondaryDark,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    strengthText: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    textAreaCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      padding: 16,
      gap: 10,
      marginBottom: 6,
    },
    fieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldLabel: {
      fontSize: 17,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    voiceFieldBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: PALETTE.lightSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    voiceFieldBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    textArea: {
      minHeight: 110,
      borderRadius: 14,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: PALETTE.primaryDark,
      textAlignVertical: 'top',
    },
    voicePreview: {
      fontSize: 15,
      fontWeight: '600',
      color: PALETTE.secondaryDark,
      fontStyle: 'italic',
      paddingHorizontal: 2,
    },
    actionsArea: {
      marginTop: 8,
      paddingBottom: 10,
    },
    primaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 58,
      paddingVertical: 18,
      borderRadius: 16,
      backgroundColor: PALETTE.primaryDark,
      shadowColor: PALETTE.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryActionFilled: {
      backgroundColor: PALETTE.vibrantAccent,
      shadowColor: PALETTE.vibrantAccent,
    },
    primaryActionText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    primaryActionTextFilled: {
      color: PALETTE.primaryDark,
    },
  });
}
