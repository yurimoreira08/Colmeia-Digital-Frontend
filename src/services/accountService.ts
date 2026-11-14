/**
 * Direitos do titular dos dados (LGPD): exportar e excluir a conta.
 * As duas ações precisam de conexão: os dados completos estão no servidor.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

/**
 * Baixa todos os dados do usuário num arquivo JSON e abre o compartilhamento
 * do sistema (salvar em arquivos, enviar por e-mail...).
 *
 * @returns o caminho do arquivo gerado no aparelho.
 */
export async function exportAccountData(): Promise<string> {
  if (!(await checkServerConnection())) throw new Error(OFFLINE_MESSAGE);
  const data = await apiRequest<unknown>('/auth/export', 'GET');

  const date = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}colmeia-digital-meus-dados-${date}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Meus dados do Colmeia Digital' });
  }
  return uri;
}
