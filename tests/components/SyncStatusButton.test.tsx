/**
 * Indicador de sync no cabeçalho (F4 do relatório): o apicultor vê se há
 * alterações esperando envio, se o envio falhou ou se está tudo no servidor,
 * e pode pedir o envio com um toque.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { describeSyncStatus, SyncStatusButton } from '../../src/components/SyncStatusButton';
import { subscribeToSyncStatus, triggerSyncBackground, type SyncStatus } from '../../src/services/syncService';

jest.setTimeout(30_000);

let mockEmit: ((status: SyncStatus) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('../../src/services/syncService', () => ({
  subscribeToSyncStatus: jest.fn((listener: (status: SyncStatus) => void) => {
    mockEmit = listener;
    return mockUnsubscribe;
  }),
  triggerSyncBackground: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

const status = (partial: Partial<SyncStatus>): SyncStatus => ({
  isSyncing: false,
  lastSyncTime: null,
  unsyncedCount: 0,
  lastError: null,
  ...partial,
});

/** O contador é só visual: o leitor de tela já ouve o número no rótulo do botão. */
const visualOnly = { includeHiddenElements: true };

beforeEach(() => {
  mockEmit = null;
  jest.mocked(triggerSyncBackground).mockClear();
  mockUnsubscribe.mockClear();
});

describe('describeSyncStatus', () => {
  it('nada a mostrar antes da primeira leitura', () => {
    expect(describeSyncStatus(null)).toBeNull();
  });

  it('sincronizando tem prioridade sobre pendências e erro', () => {
    expect(describeSyncStatus(status({ isSyncing: true, unsyncedCount: 3, lastError: 'x' }))?.icon).toBe('cloud-sync-outline');
  });

  it('falha com pendências convida a tentar de novo', () => {
    const view = describeSyncStatus(status({ unsyncedCount: 2, lastError: 'Network request failed' }));
    expect(view).toEqual({
      icon: 'cloud-alert-outline',
      label: 'Não foi possível enviar 2 alterações. Toque para tentar de novo.',
      pendingCount: 2,
    });
  });

  it('pendências sem erro: aguardando envio, no singular quando é uma', () => {
    expect(describeSyncStatus(status({ unsyncedCount: 1 }))?.label).toBe('1 alteração aguardando envio. Toque para enviar agora.');
  });

  it('erro antigo sem pendências não assusta: tudo sincronizado', () => {
    expect(describeSyncStatus(status({ lastError: 'antigo' }))).toEqual({
      icon: 'cloud-check-outline',
      label: 'Tudo sincronizado com o servidor',
      pendingCount: 0,
    });
  });
});

describe('SyncStatusButton', () => {
  it('mostra o estado recebido do syncService e envia ao tocar', async () => {
    await render(<SyncStatusButton />);
    await act(async () => mockEmit?.(status({ unsyncedCount: 3 })));

    expect(screen.getByText('3', visualOnly)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '3 alterações aguardando envio. Toque para enviar agora.' }));
    expect(triggerSyncBackground).toHaveBeenCalledTimes(1);
  });

  it('acompanha as mudanças e esconde o contador quando tudo foi enviado', async () => {
    await render(<SyncStatusButton />);
    await act(async () => mockEmit?.(status({ isSyncing: true, unsyncedCount: 3 })));
    expect(screen.getByRole('button', { name: 'Sincronizando dados com o servidor' })).toBeTruthy();

    await act(async () => mockEmit?.(status({})));
    expect(screen.getByRole('button', { name: 'Tudo sincronizado com o servidor' })).toBeTruthy();
    expect(screen.queryByText(/\d/, visualOnly)).toBeNull();
  });

  it('não pede outro envio enquanto já está sincronizando', async () => {
    await render(<SyncStatusButton />);
    await act(async () => mockEmit?.(status({ isSyncing: true })));

    await fireEvent.press(screen.getByRole('button', { name: 'Sincronizando dados com o servidor' }));
    expect(triggerSyncBackground).not.toHaveBeenCalled();
  });

  it('limita o contador a 99+', async () => {
    await render(<SyncStatusButton />);
    await act(async () => mockEmit?.(status({ unsyncedCount: 150 })));
    expect(screen.getByText('99+', visualOnly)).toBeTruthy();
  });

  it('cancela a inscrição ao sair da tela', async () => {
    const { unmount } = await render(<SyncStatusButton />);
    expect(subscribeToSyncStatus).toHaveBeenCalled();
    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
