/**
 * Relatórios: listagem, métricas do período, busca, comandos de voz e edição
 * ou exclusão de revisões e manejos.
 *
 * Testes de caracterização: descrevem o comportamento atual, para que o
 * useReports possa ser dividido sem mudar o que o apicultor vê.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReports } from '../../src/hooks/useReports';
import { getLocalRevisions } from '../../src/services/localDbService';
import { deleteManejoService, updateManejoService } from '../../src/services/manejoService';
import { deleteRevision, updateRevision } from '../../src/services/reviewReportService';
import type { ManejoReport } from '../../src/types/manejo';
import type { ReviewReport } from '../../src/types/reviewReport';
import { isoDateToDisplay } from '../../src/utils/date';

jest.setTimeout(30_000);

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = `${TODAY}T10:00:00.000Z`;

const mockApiaries = [
  { id: 1, name: 'Apiário Sol', location: 'Teresina', created_at: NOW, role: 'owner' },
  { id: 2, name: 'Apiário Lua', location: '', created_at: NOW, role: 'member' },
];
const mockBoxes = [{ id: 10, apiary_id: 1, apiary_name: 'Apiário Sol', name: 'Caixa 01', position: 1, created_at: NOW, updated_at: NOW, archived: 0, synced: 1 }];
const mockRevision = { id: 100, apiaryId: 1, apiaryName: 'Apiário Sol', caixaId: 10, caixaName: 'Caixa 01', observacoes: 'mel escuro', indicacoes: '', checkedOptions: ['mel'], createdAt: NOW };
const mockManejo = {
  id: 200, apiaryId: 1, apiaryName: 'Apiário Sol', caixaId: 10, caixaName: 'Caixa 01', observacoes: '', indicacoes: '',
  checkedOptions: [{ id: 'alimentacao', obs: 'xarope', ind: '' }], photoUri: 'file:///foto.jpg', createdAt: NOW,
};

type VoiceHandler = (transcript: string, isFinal: boolean) => boolean;
const mockVoiceHandlers: VoiceHandler[] = [];

jest.mock('../../src/services/localDbService', () => ({
  getLocalApiaries: jest.fn(async () => mockApiaries),
  getLocalBoxes: jest.fn(async () => mockBoxes),
  getLocalRevisions: jest.fn(async () => [mockRevision]),
  getLocalManejos: jest.fn(async () => [mockManejo]),
}));
jest.mock('../../src/services/reviewReportService', () => ({
  updateRevision: jest.fn(async () => undefined),
  deleteRevision: jest.fn(async () => undefined),
  archiveRevision: jest.fn(async () => undefined),
}));
jest.mock('../../src/services/manejoService', () => ({
  updateManejoService: jest.fn(async () => undefined),
  deleteManejoService: jest.fn(async () => undefined),
  archiveManejo: jest.fn(async () => undefined),
}));
jest.mock('../../src/services/reportsService', () => ({ fetchReportsStats: jest.fn() }));
jest.mock('../../src/services/syncService', () => ({ subscribeToSyncStatus: jest.fn(() => () => undefined) }));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn(), MediaTypeOptions: { Images: 'Images' } }));
jest.mock('../../src/voice/VoiceCommandContext', () => ({
  useVoiceCommand: () => ({
    registerScreenCommandHandler: (handler: VoiceHandler) => {
      mockVoiceHandlers.push(handler);
      return () => {
        mockVoiceHandlers.splice(mockVoiceHandlers.indexOf(handler), 1);
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
  return { useAppTheme: () => ({ colors: themes['petroleo-digital'] }) };
});

async function renderReports(params?: Record<string, unknown>) {
  const hook = await renderHook(() => useReports(params));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

/** Igual ao VoiceCommandContext: o último handler registrado tenta primeiro. */
async function say(transcript: string) {
  let handled = false;
  await act(async () => {
    for (const handler of [...mockVoiceHandlers].reverse()) {
      if (handler(transcript, true)) {
        handled = true;
        return;
      }
    }
  });
  return handled;
}

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDateToDisplay(d.toISOString().slice(0, 10));
};

beforeEach(() => {
  mockVoiceHandlers.length = 0;
  jest.clearAllMocks();
});

describe('listagem', () => {
  it('começa em revisões dos últimos 7 dias, paginando', async () => {
    const { result } = await renderReports();

    expect(result.current.filter).toBe('revisoes');
    expect(result.current.quickFilter).toBe('7days');
    expect(result.current.fromDate).toBe(daysAgo(7));
    expect(result.current.paginatedItems).toEqual([mockRevision]);
    expect(result.current.hasMore).toBe(false);
    expect(getLocalRevisions).toHaveBeenCalledWith(expect.objectContaining({ limit: 75, offset: 0, fromDate: expect.any(String), toDate: TODAY }));
  });

  it('abre filtrado pela caixa quando vem da tela da caixa', async () => {
    const { result } = await renderReports({ caixaId: 10 });

    expect(result.current.quickFilter).toBe('box');
    expect(getLocalRevisions).toHaveBeenLastCalledWith(expect.objectContaining({ caixaId: 10 }));
  });

  it('papel do usuário em cada apiário', async () => {
    const { result } = await renderReports();

    expect(result.current.getRoleForApiary(2)).toBe('member');
    expect(result.current.getRoleForApiary(99)).toBe('owner');
    expect(result.current.getRoleForApiary(null)).toBe('owner');
  });
});

describe('métricas do período', () => {
  it('apiários: crescimento por semana e resumo', async () => {
    const { result } = await renderReports();
    await act(async () => result.current.setFilter('apiarios'));
    await waitFor(() => expect(result.current.boxes).toHaveLength(1));

    expect(result.current.chartTitle).toBe('Crescimento Apiários');
    expect(result.current.barsData).toEqual([
      { label: 'S1', value: 0 },
      { label: 'S2', value: 0 },
      { label: 'S3', value: 0 },
      { label: 'S4', value: 2 },
    ]);
    expect(result.current.maxBar).toBe(2);
    expect(result.current.summaryText).toBe('No período selecionado, você possui 2 apiários ativos e 1 caixas registradas.');
    expect(result.current.boxes[0]).toEqual({
      id: 10, apiaryId: 1, apiaryName: 'Apiário Sol', name: 'Caixa 01', position: 1, createdAt: NOW, updatedAt: NOW, archived: false,
    });
  });

  it('a busca filtra revisões e manejos, inclusive pelo nome da tarefa de manejo', async () => {
    const { result } = await renderReports();
    await act(async () => {
      result.current.setFilter('caixas');
      result.current.setSearchTerm('alimenta');
    });
    await waitFor(() => expect(result.current.manejos).toHaveLength(1));

    expect(result.current.revisions).toHaveLength(0);
    expect(result.current.chartTitle).toBe('Crescimento Caixas');
    expect(result.current.summaryText).toBe('No período selecionado, foram identificadas 1 caixas cadastradas.');
  });
});

describe('comandos de voz', () => {
  it('troca o tipo de relatório', async () => {
    const { result } = await renderReports();

    expect(await say('mostrar manejos')).toBe(true);
    expect(result.current.filter).toBe('manejos');
    await say('caixas');
    expect(result.current.filter).toBe('caixas');
  });

  it('busca e limpa a busca', async () => {
    const { result } = await renderReports();

    await say('buscar rainha');
    expect(result.current.searchTerm).toBe('rainha');
    await say('limpar busca');
    expect(result.current.searchTerm).toBe('');
  });

  it('períodos rápidos', async () => {
    const { result } = await renderReports();

    await say('este mês');
    expect(result.current.quickFilter).toBe('thisMonth');
    await say('últimos 30 dias');
    expect(result.current.fromDate).toBe(daysAgo(30));
  });

  it('"encerrar" fecha a edição aberta', async () => {
    const { result } = await renderReports();
    await act(async () => result.current.handleOpenEditReport(mockRevision as unknown as ReviewReport));

    await say('encerrar');

    expect(result.current.editingReport).toBeNull();
  });

  it('não reconhece frases sem comando', async () => {
    await renderReports();
    expect(await say('bom dia')).toBe(false);
  });
});

describe('edição e exclusão', () => {
  it('edita a revisão com as regras de exclusão entre itens', async () => {
    const { result } = await renderReports();
    await act(async () => result.current.handleOpenEditReport(mockRevision as unknown as ReviewReport));
    expect(result.current.editChecked).toEqual({ mel: true });

    await act(async () => {
      result.current.toggleEditOption('caixa');
      result.current.toggleEditOption('nucleo');
      result.current.setEditObs('Mel claro');
    });
    await act(async () => result.current.handleSaveEditReport());

    expect(updateRevision).toHaveBeenCalledWith(100, { observacoes: 'Mel claro', indicacoes: '', checkedOptions: ['mel', 'nucleo'] });
    expect(result.current.editingReport).toBeNull();
  });

  it('a edição segue as mesmas regras da revisão nova: ovos marca a rainha', async () => {
    const { result } = await renderReports();
    await act(async () => result.current.handleOpenEditReport({ ...mockRevision, checkedOptions: [] } as unknown as ReviewReport));

    await act(async () => result.current.toggleEditOption('ovos'));

    expect(result.current.editChecked).toEqual({ ovos: true, rainha: true });
  });

  it('edita o manejo: tarefas, detalhes e nome do "outro"', async () => {
    const { result } = await renderReports();
    await act(async () => result.current.handleOpenEditManejo(mockManejo as unknown as ManejoReport));
    expect(result.current.editManejoTasks.alimentacao).toEqual({ id: 'alimentacao', obs: 'xarope', ind: '', active: true });
    expect(result.current.editManejoTasks.divisao.active).toBe(false);

    await act(async () => {
      result.current.toggleEditManejoTask('divisao');
      result.current.updateEditManejoTaskDetail('divisao', 'ind', 'Separar em 2');
      result.current.toggleEditManejoTask('outro');
      result.current.updateEditManejoTaskDetail('outro', 'customName', 'Limpeza');
    });
    await act(async () => result.current.handleSaveEditManejo());

    expect(updateManejoService).toHaveBeenCalledWith(200, {
      checkedOptions: [
        { id: 'alimentacao', obs: 'xarope', ind: '' },
        { id: 'divisao', obs: '', ind: 'Separar em 2' },
        { id: 'outro', obs: '', ind: '', customName: 'Limpeza' },
      ],
      observacoes: '',
      indicacoes: '',
      photoUri: 'file:///foto.jpg',
    });
  });

  it('exclui só depois da confirmação', async () => {
    const { result } = await renderReports();

    await act(async () => result.current.handleDeleteReport(100));
    expect(deleteRevision).not.toHaveBeenCalled();
    await act(async () => result.current.confirmDeleteReport());
    expect(deleteRevision).toHaveBeenCalledWith(100);
    expect(result.current.deleteId).toBeNull();

    await act(async () => result.current.handleDeleteManejo(200));
    await act(async () => result.current.confirmDeleteManejo());
    expect(deleteManejoService).toHaveBeenCalledWith(200);
  });
});
