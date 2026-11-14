/**
 * Direitos do titular (LGPD): exportar os dados e excluir a conta pelo app.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiRequest, checkServerConnection } from '../../src/services/apiClient';
import { deleteAccount, exportAccountData } from '../../src/services/accountService';
import { clearLocalSession } from '../../src/services/authService';

jest.mock('../../src/services/apiClient', () => ({
  apiRequest: jest.fn(),
  checkServerConnection: jest.fn(async () => true),
}));
jest.mock('../../src/services/authService', () => ({ clearLocalSession: jest.fn(async () => undefined) }));
jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', writeAsStringAsync: jest.fn(async () => undefined) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(checkServerConnection).mockResolvedValue(true);
});

describe('deleteAccount', () => {
  it('pede a exclusão com a senha exatamente como digitada e limpa o aparelho', async () => {
    jest.mocked(apiRequest).mockResolvedValue({ success: true });

    await deleteAccount(' senha com espaço ');

    expect(apiRequest).toHaveBeenCalledWith('/auth/account', 'DELETE', { password: ' senha com espaço ' });
    expect(clearLocalSession).toHaveBeenCalled();
  });

  it('senha errada: mostra o erro do servidor e não limpa nada', async () => {
    jest.mocked(apiRequest).mockRejectedValue(new Error('Senha incorreta.'));

    await expect(deleteAccount('errada')).rejects.toThrow('Senha incorreta.');
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it('sem conexão não tenta e explica o motivo', async () => {
    jest.mocked(checkServerConnection).mockResolvedValue(false);

    await expect(deleteAccount('x')).rejects.toThrow('Sem conexão com o servidor');
    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe('exportAccountData', () => {
  it('grava o JSON e abre o compartilhamento do sistema', async () => {
    jest.mocked(apiRequest).mockResolvedValue({ user: { id: 1 }, apiaries: [] });

    const uri = await exportAccountData();

    expect(uri).toMatch(/^file:\/\/\/cache\/colmeia-digital-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1] as string)).toEqual({ user: { id: 1 }, apiaries: [] });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'application/json' }));
  });
});
