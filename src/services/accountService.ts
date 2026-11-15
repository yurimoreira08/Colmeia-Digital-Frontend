/**
 * Direito do titular dos dados (LGPD): excluir a conta. Precisa de conexão:
 * os dados completos estão no servidor.
 */
import { apiRequest, checkServerConnection } from './apiClient';
import { clearLocalSession } from './authService';

const OFFLINE_MESSAGE = 'Sem conexão com o servidor. Conecte-se à internet e tente de novo.';

/**
 * Exclui a conta e todos os dados no servidor (apiários, caixas, revisões,
 * manejos e fotos) e limpa o aparelho. Não tem volta.
 *
 * @throws Error com a mensagem do servidor (ex.: "Senha incorreta.") ou de falta de conexão.
 */
export async function deleteAccount(password: string): Promise<void> {
  if (!(await checkServerConnection())) throw new Error(OFFLINE_MESSAGE);
  await apiRequest('/auth/account', 'DELETE', { password });
  await clearLocalSession();
}
