import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { saveImagePermanently } from '../utils/filePersistence';

import { saveManejoService } from '../services/manejoService';
import { markBoxModifiedInSession } from '../services/sessionStore';
import type { ManejoTask } from '../types/manejo';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { useAppTheme } from '../theme/ThemeContext';

export type ManejoOption = {
  id: string;
  label: string;
};

export const MANEJO_OPTIONS: ManejoOption[] = [
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'divisao', label: 'Divisão' },
  { id: 'troca-cera', label: 'Troca de cera' },
  { id: 'troca-rainha', label: 'Troca de rainha' },
  { id: 'colocacao-sobrecaixa', label: 'Colocação de sobrecaixa' },
  { id: 'captura', label: 'Captura' },
  { id: 'defesa-predadores', label: 'Defesa contra predadores' },
  { id: 'reducao-alvado', label: 'Redução de alvado' },
  { id: 'numerar-caixas', label: 'Numerar caixas' },
  { id: 'ofertar-agua', label: 'Ofertar água' },
  { id: 'recolher-caixas-vazias', label: 'Recolher caixas vazias ou abandonadas' },
  { id: 'trocar-caixa', label: 'Trocar caixa' },
  { id: 'outro', label: 'Outro' },
];

const MANEJO_ALIASES: Record<string, string[]> = {
  alimentacao: ['alimentacao'],
  divisao: ['divisao', 'dividir'],
  'troca-cera': ['troca de cera', 'trocar cera', 'trocar a cera'],
  'troca-rainha': ['troca de rainha', 'trocar rainha', 'trocar a rainha', 'introduzir rainha'],
  'colocacao-sobrecaixa': ['colocacao de sobrecaixa', 'colocar sobrecaixa', 'adicionar sobrecaixa'],
  captura: ['captura', 'capturar', 'pegar enxame'],
  'defesa-predadores': ['defesa contra predadores', 'predadores'],
  'reducao-alvado': ['reducao de alvado', 'reduzir alvado'],
  'numerar-caixas': ['numerar caixas'],
  'ofertar-agua': ['ofertar agua', 'dar agua'],
  'recolher-caixas-vazias': ['recolher caixas vazias', 'recolher caixas abandonadas'],
  'trocar-caixa': ['trocar caixa', 'troca de caixa', 'trocar a caixa'],
  outro: ['outro', 'outro manejo', 'outra atividade'],
};

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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useBoxManejo(navigation: any, routeParams: any) {
  const { colors } = useAppTheme();
  const {
    isListening,
    currentTranscript,
    startListening,
    stopListening,
    toggleListening,
    registerScreenCommandHandler,
  } = useVoiceCommand();

  const [selectedTasks, setSelectedTasks] = useState<Record<string, ManejoTask>>({});
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});
  const [tempTaskObservations, setTempTaskObservations] = useState<Record<string, string>>({});
  const [tempTaskIndications, setTempTaskIndications] = useState<Record<string, string>>({});
  const [tempTaskName, setTempTaskName] = useState<Record<string, string>>({});
  const [activeVoiceField, setActiveVoiceFieldState] = useState<'obs' | 'act' | 'name' | null>(null);

  const activeVoiceFieldRef = useRef<'obs' | 'act' | 'name' | null>(null);
  function setActiveVoiceField(field: 'obs' | 'act' | 'name' | null) {
    activeVoiceFieldRef.current = field;
    setActiveVoiceFieldState(field);
  }

  const [lastActiveId, setLastActiveId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const taskPositions = useRef<Record<string, { y: number; h: number }>>({});
  const gridYRef = useRef(0);
  const lastActiveIdRef = useRef<string | null>(null);
  const latestTasksRef = useRef(selectedTasks);
  const collapsedTasksRef = useRef(collapsedTasks);

  useEffect(() => {
    latestTasksRef.current = selectedTasks;
  }, [selectedTasks]);

  useEffect(() => {
    collapsedTasksRef.current = collapsedTasks;
  }, [collapsedTasks]);

  useEffect(() => {
    lastActiveIdRef.current = lastActiveId;
  }, [lastActiveId]);

  useEffect(() => {
    activeVoiceFieldRef.current = activeVoiceField;
  }, [activeVoiceField]);

  const onLayoutGrid = useCallback((e: any) => {
    gridYRef.current = e.nativeEvent.layout.y;
  }, []);

  const onLayoutTask = useCallback((id: string, e: any) => {
    if (!e || !e.nativeEvent || !e.nativeEvent.layout) return;

    const layoutY = e.nativeEvent.layout.y;
    const layoutHeight = e.nativeEvent.layout.height;

    taskPositions.current[id] = {
      y: layoutY,
      h: layoutHeight,
    };
  }, []);

  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setErrorModal('É necessário permitir o acesso à câmera para tirar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const savedUri = await saveImagePermanently(result.assets[0].uri);
        setPhotoUri(savedUri);
      } catch (err) {
        setErrorModal('Erro ao salvar imagem.');
      }
    }
  }

  async function openGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrorModal('É necessário permitir o acesso à galeria para escolher fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const savedUri = await saveImagePermanently(result.assets[0].uri);
        setPhotoUri(savedUri);
      } catch (err) {
        setErrorModal('Erro ao salvar imagem.');
      }
    }
  }

  function handleTakePhoto() {
    setPhotoModalVisible(true);
  }


  const toggleOption = useCallback((id: string) => {
    const wasCollapsed = collapsedTasksRef.current[id];
    const wasActive = !!latestTasksRef.current[id];

    setSelectedTasks((prev) => {
      const next = { ...prev };
      if (next[id]) {
        if (wasCollapsed) {
          return next;
        }
        delete next[id];
        if (lastActiveIdRef.current === id) {
          lastActiveIdRef.current = null;
          setLastActiveId(null);
        }
      } else {
        next[id] = { id, obs: '', ind: '', customName: '' };
        lastActiveIdRef.current = id;
        setLastActiveId(id);
        if (id === 'outro') {
          setActiveVoiceField('name');
        } else {
          setActiveVoiceField('obs');
        }
      }
      return next;
    });

    setCollapsedTasks((prev) => {
      const next = { ...prev };
      if (wasActive) {
        if (wasCollapsed) {
          next[id] = false;
        } else {
          delete next[id];
        }
      } else {
        next[id] = false;
      }
      return next;
    });
  }, []);

  const setOptionState = useCallback((id: string, checked: boolean) => {
    setSelectedTasks((prev) => {
      const next = { ...prev };
      if (checked) {
        if (!next[id]) {
          next[id] = { id, obs: '', ind: '', customName: '' };
          lastActiveIdRef.current = id;
          setLastActiveId(id);
          if (id === 'outro') {
            setActiveVoiceField('name');
          } else {
            setActiveVoiceField('obs');
          }
        }
      } else {
        delete next[id];
        if (lastActiveIdRef.current === id) {
          lastActiveIdRef.current = null;
          setLastActiveId(null);
        }
      }
      return next;
    });

    setCollapsedTasks((prev) => {
      if (checked) {
        return { ...prev, [id]: false };
      } else {
        const next = { ...prev };
        delete next[id];
        return next;
      }
    });
  }, []);

  const handleFinishManejo = useCallback(() => {
    const tasks = Object.values(latestTasksRef.current);

    if (tasks.length === 0) {
      setErrorModal('Selecione ao menos uma tarefa para o manejo.');
      return;
    }

    saveManejoService({
      caixaId: routeParams.boxId,
      caixaName: routeParams.boxName,
      apiaryId: routeParams.apiaryId,
      apiaryName: routeParams.apiaryName,
      tipo: routeParams.tipo,
      revisaoId: routeParams.revisaoId,
      checkedOptions: tasks,
      observacoes: '',
      indicacoes: '',
      photoUri: photoUri ?? undefined,
    })
      .then(() => {
        markBoxModifiedInSession(routeParams.boxId, 'manejo');
        setSuccessModal(true);
        void stopListening();
      })
      .catch((err) => {
        setErrorModal(err?.message || 'Não foi possível salvar o manejo. Tente novamente.');
      });
  }, [routeParams, stopListening, photoUri]);

  useFocusEffect(
    useCallback(() => {
      void startListening();

      const unsubscribe = registerScreenCommandHandler((transcript, isFinal) => {
        let cleanCommand = normalizeText(transcript);
        let shouldCloseField = false;

        const closeFieldCommands = ['concluir tarefa', 'fechar tarefa', 'concluir a tarefa', 'fechar a tarefa', 'concluir campo', 'concluir'];
        for (const cmd of closeFieldCommands) {
          if (containsWholeWord(cleanCommand, cmd)) {
            shouldCloseField = true;
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

        const isDictating = !!activeVoiceFieldRef.current;
        const shouldBypassKeywords = isDictating && !shouldCloseField;

        const finishKeywords = ['encerrar manejo', 'encerrar o manejo', 'finalizar manejo', 'concluir manejo', 'salvar manejo'];
        const cameraKeywords = ['tirar foto', 'abrir camera', 'bater foto', 'anexar foto', 'fotografar'];
        const closeTaskKeywords = ['concluir tarefa', 'fechar tarefa', 'concluir campo'];
        const obsKeywords = ['observacao', 'observacoes'];
        const actKeywords = ['o que deve ser feito', 'o que fazer', 'oque fazer', 'que fazer', 'indicacoes', 'indicacao'];
        const nameKeywords = ['nome', 'nome do manejo', 'qual outro', 'qual o outro', 'qual o outro manejo', 'especificar'];

        // Quick check for camera
        for (const ckw of cameraKeywords) {
          if (cleanCommand.includes(ckw)) {
            if (isFinal) {
              void openCamera();
            }
            return true;
          }
        }

        interface TriggerMatch {
          type: 'task' | 'obs' | 'act' | 'name' | 'finish' | 'close';
          kw: string;
          idx: number;
          end: number;
          taskId?: string;
        }
        const foundTriggers: TriggerMatch[] = [];

        const searchKeywords = (kws: string[], type: TriggerMatch['type']) => {
          for (const kw of kws) {
            let searchFrom = 0;
            const nk = normalizeText(kw);
            while (true) {
              const i = cleanCommand.indexOf(nk, searchFrom);
              if (i === -1) break;
              if (containsWholeWord(cleanCommand, nk)) {
                foundTriggers.push({
                  type,
                  kw: nk,
                  idx: i,
                  end: i + nk.length,
                });
              }
              searchFrom = i + 1;
            }
          }
        };

        searchKeywords(finishKeywords, 'finish');
        searchKeywords(closeTaskKeywords, 'close');
        searchKeywords(obsKeywords, 'obs');
        searchKeywords(actKeywords, 'act');
        searchKeywords(nameKeywords, 'name');

        if (!shouldBypassKeywords) {
          for (const option of MANEJO_OPTIONS) {
            const aliases = MANEJO_ALIASES[option.id] ?? [];
            for (const alias of aliases) {
              const nk = normalizeText(alias);
              let searchFrom = 0;
              while (true) {
                const i = cleanCommand.indexOf(nk, searchFrom);
                if (i === -1) break;
                if (containsWholeWord(cleanCommand, nk)) {
                  foundTriggers.push({
                    type: 'task',
                    taskId: option.id,
                    kw: nk,
                    idx: i,
                    end: i + nk.length,
                  });
                }
                searchFrom = i + 1;
              }
            }
          }
        }

        const filteredTriggers = foundTriggers
          .filter((t, i) => {
            return !foundTriggers.some((other, oi) => {
              if (i === oi) return false;
              return t.idx >= other.idx && t.end <= other.end && other.kw.length > t.kw.length;
            });
          })
          .sort((a, b) => a.idx - b.idx);

        let handled = false;
        let currentLoopTaskId = lastActiveIdRef.current;
        let currentLoopMode = activeVoiceFieldRef.current;

        if (filteredTriggers.length > 0) {
          const firstTrigger = filteredTriggers[0];
          const preText = cleanCommand.substring(0, firstTrigger.idx).trim();
          if (preText && currentLoopTaskId && currentLoopMode && !shouldCloseField) {
            const cleanPayload = preText.replace(/^(falar|dizer|que|de|do|da|com|sobre)\s+/i, '').trim();
            if (cleanPayload) {
              const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
              updateTaskText(currentLoopTaskId, currentLoopMode === 'obs' ? 'obs' : currentLoopMode === 'act' ? 'ind' : 'name', formatted, isFinal);
            }
          }

          for (let i = 0; i < filteredTriggers.length; i++) {
            const trigger = filteredTriggers[i];
            const nextTrigger = filteredTriggers[i + 1];
            const segmentText = cleanCommand
              .substring(trigger.end, nextTrigger ? nextTrigger.idx : cleanCommand.length)
              .trim();
            const cleanPayload = segmentText.replace(/^(falar|dizer|que|de|do|da|com|sobre)\s+/i, '').trim();

            if (trigger.type === 'finish') {
              if (isFinal) handleFinishManejo();
              return true;
            }
            if (trigger.type === 'close') {
              if (isFinal) {
                if (currentLoopTaskId) {
                  setCollapsedTasks((prev) => ({
                    ...prev,
                    [currentLoopTaskId!]: true,
                  }));
                }
                setActiveVoiceField(null);
                setLastActiveId(null);
              }
              handled = true;
              continue;
            }

            if (trigger.type === 'task') {
              currentLoopTaskId = trigger.taskId!;
              if (isFinal) {
                setOptionState(currentLoopTaskId, true);
                setLastActiveId(currentLoopTaskId);
                const isOutro = currentLoopTaskId === 'outro';
                setActiveVoiceField(isOutro ? 'name' : 'obs');
                if (cleanPayload) {
                  const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
                  updateTaskText(currentLoopTaskId, isOutro ? 'name' : 'obs', formatted, isFinal);
                }
              }
              handled = true;
            }

            if (trigger.type === 'obs' || trigger.type === 'act' || trigger.type === 'name') {
              currentLoopMode = trigger.type === 'obs' ? 'obs' : trigger.type === 'act' ? 'act' : 'name';
              if (currentLoopTaskId) {
                setActiveVoiceField(currentLoopMode);
                if (isFinal) {
                  if (cleanPayload) {
                    const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
                    updateTaskText(currentLoopTaskId, currentLoopMode === 'obs' ? 'obs' : currentLoopMode === 'act' ? 'ind' : 'name', formatted, isFinal);
                  }
                  clearTempStates(currentLoopTaskId);
                } else {
                  if (cleanPayload) {
                    const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
                    if (currentLoopMode === 'obs') {
                      setTempTaskObservations((prev) => ({ ...prev, [currentLoopTaskId!]: formatted }));
                    } else if (currentLoopMode === 'act') {
                      setTempTaskIndications((prev) => ({ ...prev, [currentLoopTaskId!]: formatted }));
                    } else if (currentLoopMode === 'name') {
                      setTempTaskName((prev) => ({ ...prev, [currentLoopTaskId!]: formatted }));
                    }
                  }
                }
              }
              handled = true;
            }
          }
        } else if (currentLoopTaskId && currentLoopMode && !shouldCloseField) {
          const cleanPayload = cleanCommand.replace(/^(falar|dizer|que|de|do|da|com|sobre)\s+/i, '').trim();
          if (cleanPayload) {
            const formatted = cleanPayload.charAt(0).toUpperCase() + cleanPayload.slice(1);
            updateTaskText(currentLoopTaskId, currentLoopMode === 'obs' ? 'obs' : currentLoopMode === 'act' ? 'ind' : 'name', formatted, isFinal);
            handled = true;
          }
        }

        if (shouldCloseField) {
          if (isFinal) {
            if (currentLoopTaskId) {
              setCollapsedTasks((prev) => ({
                ...prev,
                [currentLoopTaskId!]: true,
              }));
              clearTempStates(currentLoopTaskId);
            }
            setActiveVoiceField(null);
            setLastActiveId(null);
          }
          handled = true;
        }

        return handled;
      });

      function updateTaskText(taskId: string, field: 'obs' | 'ind' | 'name', text: string, isFinal: boolean) {
        if (isFinal) {
          setSelectedTasks((prev) => {
            const task = prev[taskId];
            if (!task) return prev;
            if (field === 'name') {
              const oldVal = task.customName || '';
              const newVal = oldVal ? oldVal.trim() + ' ' + text : text;
              return { ...prev, [taskId]: { ...task, customName: newVal } };
            }
            const targetField = field === 'obs' ? 'obs' : 'ind';
            const oldVal = task[targetField] || '';
            const newVal = oldVal ? oldVal.trim().replace(/[.?!]$/, '') + '. ' + text : text;
            return { ...prev, [taskId]: { ...task, [targetField]: newVal } };
          });
          clearTempStates(taskId);
        } else {
          if (field === 'obs') {
            setTempTaskObservations((prev) => ({ ...prev, [taskId]: text }));
          } else if (field === 'ind') {
            setTempTaskIndications((prev) => ({ ...prev, [taskId]: text }));
          } else if (field === 'name') {
            setTempTaskName((prev) => ({ ...prev, [taskId]: text }));
          }
        }
      }

      function clearTempStates(taskId: string) {
        setTempTaskObservations((prev) => ({ ...prev, [taskId]: '' }));
        setTempTaskIndications((prev) => ({ ...prev, [taskId]: '' }));
        setTempTaskName((prev) => ({ ...prev, [taskId]: '' }));
      }

      return () => {
        unsubscribe();
        void stopListening();
      };
    }, [handleFinishManejo, registerScreenCommandHandler, setOptionState, startListening, stopListening])
  );

  return {
    colors,
    isListening,
    currentTranscript,
    toggleListening,
    selectedTasks,
    setSelectedTasks,
    collapsedTasks,
    setCollapsedTasks,
    tempTaskObservations,
    setTempTaskObservations,
    tempTaskIndications,
    setTempTaskIndications,
    tempTaskName,
    setTempTaskName,
    activeVoiceField,
    setActiveVoiceField,
    lastActiveId,
    setLastActiveId,
    successModal,
    setSuccessModal,
    errorModal,
    setErrorModal,
    photoUri,
    setPhotoUri,
    handleTakePhoto,
    photoModalVisible,
    setPhotoModalVisible,
    openCamera,
    openGallery,
    scrollY,
    setScrollY,
    scrollViewRef,
    onLayoutGrid,
    onLayoutTask,
    toggleOption,
    handleFinishManejo,
  };
}
