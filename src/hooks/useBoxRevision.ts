import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';

import { saveRevision } from '../services/reviewReportService';
import { markBoxModifiedInSession } from '../services/sessionStore';
import type { RootStackParamList } from '../types/auth';
import {
  applyOptionSelection,
  checkedOptionIds,
  VOICE_OPTION_ALIASES,
  VOICE_OPTIONS,
  type RevisionSelection,
} from '../utils/revisionOptions';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { appendSentence, containsWholeWord, formatDictation, normalizeText } from '../voice/voiceText';

/** Campo de anotação que recebe o ditado: observações ou "o que fazer". */
export type VoiceNoteField = 'obs' | 'act';

type RevisionParams = RootStackParamList['BoxRevision'];

/** Frases que fecham o campo em ditado. */
const CLOSE_FIELD_COMMANDS = ['concluir tarefa', 'fechar tarefa', 'concluir a tarefa', 'fechar a tarefa', 'concluir campo', 'concluir'];
/** Frases que salvam a revisão em qualquer momento. */
const FINISH_REVISION_COMMANDS = ['encerrar revisao', 'encerrar a revisao', 'finalizar revisao', 'concluir revisao'];

/** Gatilhos procurados no meio da frase. */
const TRIGGER_KEYWORDS: Record<'obs' | 'act' | 'finish' | 'close', string[]> = {
  obs: ['observacao', 'observacoes', 'anotacao', 'anotacoes', 'comentario', 'comentarios'],
  act: ['o que fazer', 'oque fazer', 'indicacao', 'indicacoes', 'tarefa', 'para fazer'],
  finish: ['finalizar', 'encerrar', 'salvar', 'concluir'],
  close: ['concluir campo', 'fechar campo', 'finalizar campo'],
};

type TriggerMatch = { type: keyof typeof TRIGGER_KEYWORDS; kw: string; idx: number; end: number };

/** Todas as ocorrências dos gatilhos no texto, sem as contidas em gatilhos maiores, em ordem. */
function findTriggers(command: string): TriggerMatch[] {
  const found: TriggerMatch[] = [];
  for (const [type, keywords] of Object.entries(TRIGGER_KEYWORDS) as [TriggerMatch['type'], string[]][]) {
    for (const keyword of keywords) {
      const kw = normalizeText(keyword);
      let searchFrom = 0;
      while (true) {
        const idx = command.indexOf(kw, searchFrom);
        if (idx === -1) break;
        if (containsWholeWord(command, kw)) found.push({ type, kw, idx, end: idx + kw.length });
        searchFrom = idx + 1;
      }
    }
  }
  // Ex.: "indicacao" dentro de "indicacoes" conta uma vez só.
  return found
    .filter((t, i) => !found.some((other, oi) => i !== oi && t.idx >= other.idx && t.end <= other.end && other.kw.length > t.kw.length))
    .sort((a, b) => a.idx - b.idx);
}

/**
 * Estado e ações da tela de revisão da caixa: itens marcados, anotações,
 * comandos de voz e gravação.
 *
 * Ao entrar na tela liga o microfone e registra o tratador de comandos; ao
 * sair, desliga. Salvar grava no SQLite local (via saveRevision, que dispara
 * o sync) e marca a caixa como modificada na sessão.
 */
export function useBoxRevision(params: RevisionParams) {
  const voice = useVoiceCommand();
  const { startListening, stopListening, registerScreenCommandHandler } = voice;

  const [selectedOptions, setSelectedOptions] = useState<RevisionSelection>({});
  const [observation, setObservation] = useState('');
  const [indication, setIndication] = useState('');
  const [tempObservation, setTempObservation] = useState('');
  const [tempIndication, setTempIndication] = useState('');
  const [activeVoiceField, setActiveVoiceFieldState] = useState<VoiceNoteField | null>(null);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // O tratador de voz lê o campo ativo pela ref: o estado só serve para desenhar.
  const activeVoiceFieldRef = useRef<VoiceNoteField | null>(null);
  const setActiveVoiceField = useCallback((field: VoiceNoteField | null) => {
    activeVoiceFieldRef.current = field;
    setActiveVoiceFieldState(field);
  }, []);

  const isFilled = Object.keys(selectedOptions).length > 0 || observation.trim().length > 0 || indication.trim().length > 0;

  // Rolagem até o item falado.
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Record<string, number>>({});
  const itemPositionsRef = useRef<Record<string, number>>({});
  const registerSectionY = useCallback((sectionId: string, y: number) => {
    sectionYRef.current[sectionId] = y;
  }, []);
  const registerItemY = useCallback((itemId: string, sectionId: string, y: number) => {
    itemPositionsRef.current[itemId] = (sectionYRef.current[sectionId] || 0) + y;
  }, []);
  const scrollToItem = useCallback((itemId: string) => {
    setTimeout(() => {
      const y = itemPositionsRef.current[itemId];
      if (typeof y === 'number' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: Math.max(0, y - 60), animated: true });
      }
    }, 60);
  }, []);

  const toggleOption = useCallback((id: string) => {
    setSelectedOptions((prev) => applyOptionSelection(prev, id, !prev[id]));
  }, []);
  const setOptionState = useCallback((id: string, checked: boolean) => {
    setSelectedOptions((prev) => applyOptionSelection(prev, id, checked));
  }, []);

  /** Edição pelo teclado: substitui o texto e descarta a prévia do ditado. */
  const changeObservation = useCallback((value: string) => {
    setObservation(value);
    setTempObservation('');
  }, []);
  const changeIndication = useCallback((value: string) => {
    setIndication(value);
    setTempIndication('');
  }, []);

  // Snapshot para o salvar: ter os valores nas dependências recriaria o
  // tratador de voz (e re-registraria o microfone) a cada palavra falada.
  const latestValuesRef = useRef({ selectedOptions, observation, indication });
  useEffect(() => {
    latestValuesRef.current = { selectedOptions, observation, indication };
  }, [selectedOptions, observation, indication]);

  const handleFinishRevision = useCallback(() => {
    const { selectedOptions: opts, observation: obs, indication: ind } = latestValuesRef.current;
    saveRevision({
      caixaId: params.boxId,
      caixaName: params.boxName,
      apiaryId: params.apiaryId,
      apiaryName: params.apiaryName,
      tipo: params.tipo,
      checkedOptions: checkedOptionIds(opts),
      observacoes: obs,
      indicacoes: ind,
    }).then(() => {
      markBoxModifiedInSession(params.boxId, 'revisao');
      stopListening();
      setSuccessModal(true);
    }).catch((err) => {
      setErrorModal(err?.message || 'Não foi possível salvar a revisão. Tente novamente.');
    });
  }, [params, stopListening]);

  // Palavras de item já tratadas no resultado parcial atual (o motor repete o texto a cada parcial).
  const handledKeywordsRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void startListening();

      /** Grava o trecho no campo (resultado final) ou mostra como prévia (parcial). */
      const dictate = (field: VoiceNoteField, text: string, isFinal: boolean) => {
        if (isFinal) {
          if (field === 'obs') setObservation((p) => appendSentence(p, text));
          else setIndication((p) => appendSentence(p, text));
        } else if (field === 'obs') {
          setTempObservation(text);
        } else {
          setTempIndication(text);
        }
      };
      const closeField = () => {
        setActiveVoiceField(null);
        setTempObservation('');
        setTempIndication('');
      };

      const unsubscribe = registerScreenCommandHandler((transcript, isFinal) => {
        let cleanCommand = normalizeText(transcript);

        // 0. "concluir" fecha o campo em ditado; a palavra sai do texto.
        let shouldCloseField = false;
        for (const cmd of CLOSE_FIELD_COMMANDS) {
          if (containsWholeWord(cleanCommand, cmd)) {
            shouldCloseField = true;
            cleanCommand = cleanCommand.replace(new RegExp(`\\b${cmd}\\b`, 'g'), '').trim();
            break;
          }
        }
        if (!shouldCloseField && cleanCommand.endsWith(' concluir')) {
          shouldCloseField = true;
          cleanCommand = cleanCommand.replace(/\bconcluir$/, '').trim();
        }
        const command = cleanCommand;

        if (isFinal) handledKeywordsRef.current.clear();

        // Com um campo em ditado, nomes de itens são texto, não marcação.
        const shouldBypassKeywords = !!activeVoiceFieldRef.current && !shouldCloseField;

        // Silêncio ou ruído.
        if (!command && !shouldCloseField) return false;

        // 1. Encerrar a revisão (prioridade máxima).
        if (FINISH_REVISION_COMMANDS.some((cmd) => command.includes(cmd))) {
          if (isFinal) handleFinishRevision();
          return true;
        }

        // 2. Itens marcáveis.
        if (!shouldBypassKeywords) {
          for (const option of VOICE_OPTIONS) {
            const aliases = VOICE_OPTION_ALIASES[option.id] ?? [];
            const matchedAlias = aliases.find((alias) => containsWholeWord(command, normalizeText(alias)));
            if (!matchedAlias) continue;
            if (handledKeywordsRef.current.has(matchedAlias)) continue;
            handledKeywordsRef.current.add(matchedAlias);

            if (isFinal) closeField();

            const shouldCheck = containsWholeWord(command, 'selecionar') || containsWholeWord(command, 'marcar') || command === matchedAlias;
            const shouldUncheck = containsWholeWord(command, 'desmarcar') || containsWholeWord(command, 'remover') || containsWholeWord(command, 'tirar');

            let optionMatched = false;
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

        // 3. Gatilhos de campo, de salvar e de fechar campo no meio da frase.
        const triggers = findTriggers(cleanCommand);
        let handled = false;

        if (triggers.length > 0) {
          // Texto antes do primeiro gatilho pertence ao campo que já estava em ditado.
          const preText = formatDictation(cleanCommand.substring(0, triggers[0].idx).trim());
          if (preText && activeVoiceFieldRef.current) dictate(activeVoiceFieldRef.current, preText, isFinal);

          for (let i = 0; i < triggers.length; i++) {
            const trigger = triggers[i];
            const next = triggers[i + 1];
            const payload = formatDictation(cleanCommand.substring(trigger.end, next ? next.idx : cleanCommand.length).trim());

            if (trigger.type === 'finish') {
              if (isFinal) handleFinishRevision();
              return true;
            }
            if (trigger.type === 'close') {
              if (isFinal) closeField();
              handled = true;
              continue;
            }

            setActiveVoiceField(trigger.type);
            scrollToItem(trigger.type);
            if (isFinal) {
              if (payload) dictate(trigger.type, payload, true);
              setTempObservation('');
              setTempIndication('');
            } else {
              // Só o gatilho, sem conteúdo ainda: "..." mostra que o campo está ouvindo.
              dictate(trigger.type, payload || '...', false);
            }
            handled = true;
          }
        } else if (activeVoiceFieldRef.current && !shouldCloseField) {
          // 4. Sem gatilho: continua no campo em ditado.
          const payload = formatDictation(cleanCommand);
          if (payload) {
            const field = activeVoiceFieldRef.current;
            dictate(field, payload, isFinal);
            if (isFinal) {
              if (field === 'obs') setTempObservation('');
              else setTempIndication('');
            }
            handled = true;
          }
        }

        // 5. Último recurso: nome do item como está na lista (ex.: "força boa").
        if (!handled && isFinal) {
          for (const option of VOICE_OPTIONS) {
            if (containsWholeWord(cleanCommand, normalizeText(option.label))) {
              toggleOption(option.id);
              handled = true;
            }
          }
        }

        if (shouldCloseField) {
          if (isFinal) closeField();
          handled = true;
        }

        return handled;
      });

      return () => {
        unsubscribe();
        stopListening();
      };
    }, [handleFinishRevision, registerScreenCommandHandler, setActiveVoiceField, setOptionState, toggleOption, scrollToItem, startListening, stopListening]),
  );

  return {
    voice,
    selectedOptions,
    toggleOption,
    observation,
    indication,
    tempObservation,
    tempIndication,
    changeObservation,
    changeIndication,
    activeVoiceField,
    setActiveVoiceField,
    isFilled,
    scrollViewRef,
    registerSectionY,
    registerItemY,
    handleFinishRevision,
    successModal,
    closeSuccessModal: () => setSuccessModal(false),
    errorModal,
    closeErrorModal: () => setErrorModal(null),
  };
}
