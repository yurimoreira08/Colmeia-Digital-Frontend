/**
 * Tela de revisão da caixa: marcação dos itens (toque e voz), ditado das
 * anotações e gravação da revisão.
 *
 * Os comandos de voz chegam pelo handler registrado no VoiceCommandContext.
 * Aqui o teste chama esse handler diretamente com o texto reconhecido e
 * confere o que seria salvo ao tocar em "Salvar Revisão".
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BoxRevisionScreen } from '../../src/screens/BoxReviewScreen';
import * as Haptics from 'expo-haptics';
import { saveRevision } from '../../src/services/reviewReportService';
import type { RootStackParamList } from '../../src/types/auth';

jest.setTimeout(30_000);

type VoiceHandler = (transcript: string, isFinal: boolean) => boolean;
let mockVoiceHandler: VoiceHandler | null = null;

jest.mock('../../src/services/reviewReportService', () => ({ saveRevision: jest.fn(async () => ({})) }));
jest.mock('../../src/services/sessionStore', () => ({ markBoxModifiedInSession: jest.fn() }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('../../src/voice/VoiceCommandContext', () => ({
  useVoiceCommand: () => ({
    isListening: true,
    currentTranscript: '',
    startListening: jest.fn(async () => undefined),
    stopListening: jest.fn(),
    toggleListening: jest.fn(async () => undefined),
    registerScreenCommandHandler: (handler: VoiceHandler) => {
      mockVoiceHandler = handler;
      return () => {
        mockVoiceHandler = null;
      };
    },
  }),
}));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock('../../src/theme/ThemeContext', () => {
  const { themes } = jest.requireActual('../../src/theme/themes');
  return { useAppTheme: () => ({ colors: themes['petroleo-digital'], themeName: 'petroleo-digital' }) };
});
// Cabeçalho, dock e botões flutuantes têm testes próprios e dependências que não interessam aqui.
jest.mock('../../src/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../src/components/BottomDock', () => ({ BottomDock: () => null }));
jest.mock('../../src/components/FloatingScrollButtons', () => ({ FloatingScrollButtons: () => null }));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const params: RootStackParamList['BoxRevision'] = { boxId: 7, boxName: 'Caixa 07', apiaryName: 'Apiário Sol', apiaryId: 3, tipo: 'apiario' };

async function renderScreen() {
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
  const props = { navigation, route: { key: 'BoxRevision', name: 'BoxRevision', params } } as unknown as NativeStackScreenProps<RootStackParamList, 'BoxRevision'>;
  await render(<BoxRevisionScreen {...props} />);
}

/** Simula um resultado do reconhecimento de voz. */
async function say(transcript: string, isFinal = true) {
  let handled = false;
  await act(async () => {
    handled = mockVoiceHandler?.(transcript, isFinal) ?? false;
  });
  return handled;
}

async function saveAndGetPayload() {
  await fireEvent.press(screen.getByText('Salvar Revisão'));
  await waitFor(() => expect(saveRevision).toHaveBeenCalled());
  return jest.mocked(saveRevision).mock.calls.at(-1)![0];
}

const observationInput = () => screen.getByPlaceholderText('Ex: Enxame calmo, rainha ativa...');
const indicationInput = () => screen.getByPlaceholderText('Ex: Adicionar melgueira, alimentar...');

beforeEach(() => {
  mockVoiceHandler = null;
  jest.mocked(saveRevision).mockClear();
});

describe('marcação por toque', () => {
  it('salva os itens marcados com os dados da caixa', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Mel'));
    await fireEvent.press(screen.getByText('Boa'));

    const payload = await saveAndGetPayload();

    expect(payload).toMatchObject({ caixaId: 7, caixaName: 'Caixa 07', apiaryId: 3, apiaryName: 'Apiário Sol', tipo: 'apiario' });
    expect(payload.checkedOptions.sort()).toEqual(['forca-boa', 'mel']);
  });

  it('opções excludentes: caixa x núcleo, com x sem espaço, uma força só', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Caixa'));
    await fireEvent.press(screen.getByText('Núcleo'));
    await fireEvent.press(screen.getByText('Com Espaço'));
    await fireEvent.press(screen.getByText('Sem Espaço'));
    await fireEvent.press(screen.getByText('Fraca'));
    await fireEvent.press(screen.getByText('Média'));

    expect((await saveAndGetPayload()).checkedOptions.sort()).toEqual(['forca-media', 'nucleo', 'sem-espaco']);
  });

  it('marcar ovos marca a rainha; tocar de novo desmarca', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Ovos'));
    await fireEvent.press(screen.getByText('Mel'));
    await fireEvent.press(screen.getByText('Mel'));

    expect((await saveAndGetPayload()).checkedOptions.sort()).toEqual(['ovos', 'rainha']);
  });
});

describe('comandos de voz', () => {
  it('marca e desmarca itens falados', async () => {
    await renderScreen();
    expect(await say('marcar mel')).toBe(true);
    await say('pólen');
    await say('cria aberta');
    await say('desmarcar polen');

    expect((await saveAndGetPayload()).checkedOptions.sort()).toEqual(['cria-aberta', 'mel']);
  });

  it('dita a observação e continua no mesmo campo até concluir', async () => {
    await renderScreen();
    await say('observação enxame calmo');
    // Enquanto dita, "rainha" é texto, não marcação.
    await say('rainha ativa');
    await say('concluir');
    await say('mel');

    expect(observationInput().props.value).toBe('Enxame calmo. Rainha ativa');
    const payload = await saveAndGetPayload();
    expect(payload.observacoes).toBe('Enxame calmo. Rainha ativa');
    expect(payload.checkedOptions).toEqual(['mel']);
  });

  it('dita o "o que fazer"', async () => {
    await renderScreen();
    await say('o que fazer alimentar com xarope');

    expect(indicationInput().props.value).toBe('Alimentar com xarope');
    expect((await saveAndGetPayload()).indicacoes).toBe('Alimentar com xarope');
  });

  it('mostra a prévia do ditado antes do resultado final', async () => {
    await renderScreen();
    await say('observacao abelhas agitadas', false);

    expect(screen.getByText('🎤 Abelhas agitadas')).toBeTruthy();
    expect(observationInput().props.value).toBe('');
  });

  it('"encerrar revisão" salva', async () => {
    await renderScreen();
    await say('mel');
    await say('encerrar revisão');

    await waitFor(() => expect(saveRevision).toHaveBeenCalledTimes(1));
    expect(jest.mocked(saveRevision).mock.calls[0][0].checkedOptions).toEqual(['mel']);
    expect(await screen.findByText('Revisão Salva')).toBeTruthy();
  });

  it('ignora silêncio', async () => {
    await renderScreen();
    expect(await say('   ')).toBe(false);
  });
});

describe('falha ao salvar', () => {
  it('mostra a mensagem de erro', async () => {
    jest.mocked(saveRevision).mockRejectedValueOnce(new Error('Banco ocupado'));
    await renderScreen();

    await fireEvent.press(screen.getByText('Salvar Revisão'));

    expect(await screen.findByText('Banco ocupado')).toBeTruthy();
  });
});

describe('vibração nas ações de campo', () => {
  it('vibra ao marcar um item (toque ou voz) e ao salvar', async () => {
    await renderScreen();
    jest.mocked(Haptics.selectionAsync).mockClear();

    await fireEvent.press(screen.getByText('Mel'));
    await say('pólen');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);

    await saveAndGetPayload();
    await waitFor(() => expect(Haptics.notificationAsync).toHaveBeenCalledWith('success'));
  });

  it('vibra diferente quando salvar falha', async () => {
    jest.mocked(saveRevision).mockRejectedValueOnce(new Error('Banco ocupado'));
    await renderScreen();

    await fireEvent.press(screen.getByText('Salvar Revisão'));

    await waitFor(() => expect(Haptics.notificationAsync).toHaveBeenCalledWith('error'));
  });
});
