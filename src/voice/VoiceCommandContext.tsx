import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

import type { RootStackParamList } from '../types/auth';
import { parseVoiceNavigationCommand } from './voiceCommandRoutes';

type VoiceScreenCommandHandler = (transcript: string, isFinal: boolean) => boolean;

type SpeechEventSubscription = {
  remove: () => void;
};

type SpeechRecognitionModuleLike = {
  addListener: (eventName: string, listener: (event: any) => void) => SpeechEventSubscription;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable: () => boolean;
};

type VoiceCommandContextValue = {
  isListening: boolean;
  isVoiceEnabledByUser: boolean;
  currentTranscript: string;
  voiceFeedback: string | null;
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
  startListening: (isManual?: boolean) => Promise<void>;
  stopListening: (isManual?: boolean) => void;
  toggleListening: () => Promise<void>;
  registerScreenCommandHandler: (handler: VoiceScreenCommandHandler) => () => void;
  showVoiceFeedback: (text: string) => void;
};

const VoiceCommandContext = createContext<VoiceCommandContextValue | null>(null);

type VoiceCommandProviderProps = {
  children: ReactNode;
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

export function VoiceCommandProvider({ children, navigationRef }: VoiceCommandProviderProps) {
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const setIsListeningWithRef = useCallback((val: boolean) => {
    isListeningRef.current = val;
    setIsListening(val);
  }, []);

  const [isVoiceEnabledByUser, setIsVoiceEnabledByUser] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showVoiceFeedback = useCallback((text: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setVoiceFeedback(text);
    feedbackTimeoutRef.current = setTimeout(() => {
      setVoiceFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 2500);
  }, []);

  const lastHandledTranscriptRef = useRef<string | null>(null);
  const screenCommandHandlersRef = useRef<VoiceScreenCommandHandler[]>([]);
  const speechModuleRef = useRef<SpeechRecognitionModuleLike | null>(null);
  const speechListenersRef = useRef<SpeechEventSubscription[]>([]);
  const shouldRestartListeningRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveRestartsRef = useRef(0);
  const lastStartTimestampRef = useRef<number>(0);

  const handleSpeechResult = useCallback(
    (event: { isFinal?: boolean; results?: Array<{ transcript?: string }> }) => {
      const transcript = event.results?.[0]?.transcript?.trim();
      if (!transcript) return;

      // Sempre atualiza o que está sendo falado em tempo real
      setCurrentTranscript(transcript);

      const isFinal = !!event.isFinal;

      if (isFinal && transcript === lastHandledTranscriptRef.current) {
        return;
      }

      if (isFinal) {
        lastHandledTranscriptRef.current = transcript;
      }

      const normalizedTranscript = transcript
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[!?.,;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (
        normalizedTranscript.includes('parar comando de voz') ||
        normalizedTranscript.includes('desativar comando de voz') ||
        normalizedTranscript.includes('parar escuta') ||
        normalizedTranscript.includes('parar de gravar')
      ) {
        shouldRestartListeningRef.current = false;
        setIsVoiceEnabledByUser(false);
        speechModuleRef.current?.stop();
        return;
      }

      if (
        normalizedTranscript === 'ajuda de voz' ||
        normalizedTranscript === 'comandos disponiveis' ||
        normalizedTranscript === 'ajuda' ||
        normalizedTranscript.includes('quais comandos') ||
        normalizedTranscript.includes('comandos disponiveis') ||
        normalizedTranscript.includes('ajuda de voz')
      ) {
        shouldRestartListeningRef.current = true;
        showVoiceFeedback('Ajuda de Comandos');
        Alert.alert(
          'Comandos de Voz Disponíveis',
          'Navegação Global:\n' +
            '• "Início" ou "Home" → Painel principal\n' +
            '• "Apiários" → Lista de apiários\n' +
            '• "Caixas" → Lista de colmeias\n' +
            '• "Revisões" → Histórico de revisões\n' +
            '• "Manejos" → Histórico de manejos\n' +
            '• "Relatórios" → Relatórios e gráficos\n' +
            '• "Configurações" → Configurações do sistema\n' +
            '• "Voltar" → Retornar à tela anterior\n' +
            '• "Parar escuta" → Desativar microfone\n\n' +
            'Nas telas de Revisão e Manejo:\n' +
            '• Fale o nome do item para marcar (ex: "rainha", "mel", "alimentação")\n' +
            '• Diga "observação [texto]" para ditar\n' +
            '• Diga "salvar" ou "encerrar" para finalizar.',
        );
        return;
      }

      // Prioridade Máxima: Handlers registrados pela tela ativa no momento
      const handlers = [...screenCommandHandlersRef.current].reverse();
      for (const handler of handlers) {
        if (handler(transcript, isFinal)) {
          return;
        }
      }

      // Navegação Global: Voltar
      if (
        normalizedTranscript === 'voltar' ||
        normalizedTranscript === 'retornar' ||
        normalizedTranscript === 'tela anterior' ||
        normalizedTranscript === 'fechar tela'
      ) {
        if (navigationRef.isReady() && navigationRef.canGoBack()) {
          showVoiceFeedback('Voltando...');
          navigationRef.goBack();
          return;
        }
      }

      // Navegação Global: Rotas mapeadas
      const currentRouteName = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
      const routeMatch = parseVoiceNavigationCommand(transcript, currentRouteName);
      if (routeMatch && navigationRef.isReady()) {
        try {
          showVoiceFeedback(`Indo para ${routeMatch.label}...`);
          navigationRef.navigate(routeMatch.route as any);
          return;
        } catch (e) {
          console.warn('[Voice] Global navigation error:', e);
        }
      }
    },
    [navigationRef, showVoiceFeedback],
  );

  const bindSpeechListeners = useCallback(
    (speechModule: SpeechRecognitionModuleLike) => {
      if (speechListenersRef.current.length > 0) {
        return;
      }

      const startSub = speechModule.addListener('start', () => {
        setIsListeningWithRef(true);
        const now = Date.now();
        // Só zera o contador se a sessão anterior durou mais de 5 segundos
        if (now - lastStartTimestampRef.current > 5000) {
          consecutiveRestartsRef.current = 0;
        }
        lastStartTimestampRef.current = now;
      });

      const endSub = speechModule.addListener('end', () => {
        // Se deve reiniciar e não foi parado explicitamente (ex: silêncio do SO)
        if (shouldRestartListeningRef.current) {
          if (consecutiveRestartsRef.current >= 5) {
            console.warn('[Voice] Maximum consecutive restarts reached. Disabling continuous listening.');
            shouldRestartListeningRef.current = false;
            setIsListeningWithRef(false);
            return;
          }
          consecutiveRestartsRef.current++;

          if (restartTimeoutRef.current !== null) {
            clearTimeout(restartTimeoutRef.current);
          }

          const delay = 300 + consecutiveRestartsRef.current * 300;

          restartTimeoutRef.current = setTimeout(() => {
            restartTimeoutRef.current = null;
            // Só reinicia se ainda estiver marcado como 'deve reiniciar'
            if (shouldRestartListeningRef.current) {
              lastHandledTranscriptRef.current = null;
              try {
                speechModule.start({
                  lang: 'pt-BR',
                  interimResults: true,
                  maxAlternatives: 1,
                  addsPunctuation: false,
                  continuous: true,
                });
              } catch (err) {
                console.error('[Voice] Error restarting speech recognition:', err);
                setIsListeningWithRef(false);
                shouldRestartListeningRef.current = false;
              }
            } else {
              setIsListeningWithRef(false);
            }
          }, delay);
        } else {
          setIsListeningWithRef(false);
        }
      });

      const errorSub = speechModule.addListener('error', (event: { error?: string; message?: string }) => {
        // Erros comuns que não devem matar a escuta contínua
        const transientErrors = ['no-speech', 'network', 'busy', 'speech-timeout'];
        const isTransient = transientErrors.includes(event.error || '');

        if (isTransient && shouldRestartListeningRef.current) {
          // Em erros transientes, NÃO definimos isListening como false,
          // pois o evento 'end' virá em seguida e cuidará do restart.
          return;
        }

        setIsListeningWithRef(false);
        // Para erros fatais, desliga o restart automático
        shouldRestartListeningRef.current = false;
        if (event.error !== 'no-speech') {
           Alert.alert('Falha no comando de voz', event.message || 'Nao foi possivel capturar a fala agora.');
        }
      });

      const resultSub = speechModule.addListener('result', handleSpeechResult);

      speechListenersRef.current = [startSub, endSub, errorSub, resultSub];
    },
    [handleSpeechResult, setIsListeningWithRef],
  );

  const ensureSpeechModule = useCallback(async (): Promise<SpeechRecognitionModuleLike | null> => {
    if (speechModuleRef.current) {
      return speechModuleRef.current;
    }

    try {
      const speechPackage = await import('expo-speech-recognition');
      const speechModule = speechPackage.ExpoSpeechRecognitionModule as SpeechRecognitionModuleLike | undefined;

      if (!speechModule) {
        return null;
      }

      speechModuleRef.current = speechModule;
      bindSpeechListeners(speechModule);
      return speechModule;
    } catch {
      return null;
    }
  }, [bindSpeechListeners]);

  const stopListening = useCallback((isManual = false) => {
    shouldRestartListeningRef.current = false;
    consecutiveRestartsRef.current = 0;

    if (isManual) {
      setIsVoiceEnabledByUser(false);
    }

    if (restartTimeoutRef.current !== null) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    void (async () => {
      try {
        const speechModule = await ensureSpeechModule();
        speechModule?.stop();
        setIsListeningWithRef(false); // Força o estado visual para desligado imediatamente
      } catch (e) {
        console.error('Erro ao parar escuta:', e);
      }
    })();
  }, [ensureSpeechModule, setIsListeningWithRef]);

  const startListening = useCallback(async (isManual = false) => {
    const speechModule = await ensureSpeechModule();

    if (isManual) {
      setIsVoiceEnabledByUser(true);
    }

    if (!speechModule) {
      Alert.alert(
        'Comando de voz indisponivel no Expo Go',
        'Para usar comando de voz, use uma Development Build ou build EAS do app.',
      );
      return;
    }

    if (!speechModule.isRecognitionAvailable()) {
      Alert.alert('Comando de voz indisponivel', 'Reconhecimento de voz nao esta disponivel neste dispositivo.');
      return;
    }

    const permissions = await speechModule.requestPermissionsAsync();

    if (!permissions.granted) {
      Alert.alert('Permissao necessaria', 'Permita o uso do microfone para comandos de voz.');
      return;
    }

    lastHandledTranscriptRef.current = null;
    setCurrentTranscript('');
    shouldRestartListeningRef.current = true; // Habilita o loop de escuta contínua
    consecutiveRestartsRef.current = 0;

    if (isListeningRef.current) {
      try {
        speechModule.stop();
      } catch {}
    }

    try {
      speechModule.start({
        lang: 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
        addsPunctuation: false,
        continuous: true,
      });
    } catch (err) {
      console.error('[Voice] Error starting speech recognition:', err);
      setIsListeningWithRef(false);
      shouldRestartListeningRef.current = false;
      Alert.alert('Erro', 'Não foi possível iniciar o comando de voz.');
    }
  }, [ensureSpeechModule, setIsListeningWithRef]);

  const toggleListening = useCallback(async () => {
    if (isListeningRef.current) {
      stopListening(true);
      return;
    }

    await startListening(true);
  }, [startListening, stopListening]);

  const registerScreenCommandHandler = useCallback((handler: VoiceScreenCommandHandler) => {
    screenCommandHandlersRef.current.push(handler);

    return () => {
      screenCommandHandlersRef.current = screenCommandHandlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartListeningRef.current = false;

      if (restartTimeoutRef.current !== null) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      for (const subscription of speechListenersRef.current) {
        subscription.remove();
      }

      speechListenersRef.current = [];
    };
  }, []);

  const value = useMemo<VoiceCommandContextValue>(() => {
    return {
      isListening,
      isVoiceEnabledByUser,
      currentTranscript,
      voiceFeedback,
      startListening,
      stopListening,
      toggleListening,
      registerScreenCommandHandler,
      showVoiceFeedback,
      navigationRef,
    };
  }, [isListening, isVoiceEnabledByUser, currentTranscript, voiceFeedback, navigationRef, registerScreenCommandHandler, startListening, stopListening, toggleListening, showVoiceFeedback]);

  return <VoiceCommandContext.Provider value={value}>{children}</VoiceCommandContext.Provider>;
}

export function useVoiceCommand(): VoiceCommandContextValue {
  const context = useContext(VoiceCommandContext);

  if (!context) {
    throw new Error('useVoiceCommand must be used within VoiceCommandProvider.');
  }

  return context;
}
