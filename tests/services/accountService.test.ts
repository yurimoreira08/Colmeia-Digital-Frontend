/**
 * Direito do titular (LGPD): excluir a conta pelo app.
 */
import { apiRequest, checkServerConnection } from '../../src/services/apiClient';
import { deleteAccount } from '../../src/services/accountService';
import { clearLocalSession } from '../../src/services/authService';

jest.mock('../../src/services/apiClient', () => ({
  apiRequest: jest.fn(),
  checkServerConnection: jest.fn(async () => true),
}));
jest.mock('../../src/services/authService', () => ({ clearLocalSession: jest.fn(async () => undefined) }));

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
