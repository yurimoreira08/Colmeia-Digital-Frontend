import * as FileSystemLegacy from 'expo-file-system/legacy';
import { apiRequest } from './apiClient';

export type StorageFolder = 'manejos' | 'profiles' | 'geral';

/**
 * Faz o upload de uma imagem local para o Supabase Storage através do backend.
 * Se a URI já for uma URL HTTP/HTTPS (já na nuvem), ela é retornada diretamente.
 */
export async function uploadImageToServer(
  localUri: string,
  folder: StorageFolder = 'geral',
  fileName?: string
): Promise<string> {
  if (!localUri || typeof localUri !== 'string') {
    return '';
  }

  // Se já for uma URL remota do Supabase ou web, não precisa re-enviar
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  try {
    // Determinar mimeType básico a partir da extensão
    const cleanUri = localUri.split('?')[0];
    const ext = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'gif') mimeType = 'image/gif';

    // Ler arquivo como base64 usando a API legacy estável
    let base64 = '';
    if (localUri.startsWith('data:')) {
      base64 = localUri;
    } else {
      const fileData = await FileSystemLegacy.readAsStringAsync(localUri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });
      base64 = `data:${mimeType};base64,${fileData}`;
    }

    const response = await apiRequest<{ success: boolean; url: string; path: string }>(
      '/upload',
      'POST',
      {
        base64Data: base64,
        folder,
        mimeType,
        fileName,
      }
    );

    if (response && response.url) {
      return response.url;
    }

    throw new Error('Servidor não retornou a URL pública da imagem.');
  } catch (err: any) {
    console.error('[StorageService] Falha no upload da imagem:', err);
    throw new Error(err.message || 'Falha ao enviar imagem para a nuvem.');
  }
}
