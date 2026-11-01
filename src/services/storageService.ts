import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiRequest, apiMultipartRequest } from './apiClient';

export type StorageFolder = 'manejos' | 'profiles' | 'geral';

/**
 * Comprime e redimensiona uma imagem para otimizar tamanho e uso de banda
 * Redimensiona para largura máxima de 1200px com qualidade 0.7 em formato JPEG.
 */
export async function compressImage(uri: string): Promise<string> {
  if (!uri || typeof uri !== 'string') return uri;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (err) {
    console.warn('[compressImage] Aviso: Falha ao redimensionar com ImageManipulator, usando imagem original:', err);
    return uri;
  }
}

/**
 * Faz o upload multipart/form-data de uma foto de manejo para o Supabase Storage
 * Endpoint: POST /upload/manejo-photo
 */
export async function uploadManejoPhoto(localUri: string): Promise<string> {
  if (!localUri || typeof localUri !== 'string') {
    return '';
  }

  // Se já for uma URL remota do Supabase ou web, retorna diretamente
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  try {
    // 1. Comprime a imagem (max 1200px largura, qualidade 0.7)
    const compressedUri = await compressImage(localUri);

    // 2. Extrai nome do arquivo e extensão
    const filename = compressedUri.split('/').pop() || `foto_${Date.now()}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';

    // 3. Constrói o FormData para envio multipart
    const formData = new FormData();
    formData.append('photo', {
      uri: compressedUri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await apiMultipartRequest<{ success: boolean; url: string; path: string }>(
      '/upload/manejo-photo',
      formData
    );

    if (response && response.url) {
      console.log('[StorageService] Foto de manejo enviada com sucesso para Supabase:', response.url);
      return response.url;
    }

    throw new Error('Servidor não retornou a URL da foto.');
  } catch (err: any) {
    console.error('[StorageService] Falha no upload da foto de manejo:', err);
    throw new Error(err.message || 'Falha ao enviar foto para a nuvem.');
  }
}

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

  // Se já for uma URL remota, não precisa re-enviar
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  // Se for foto de manejo, usa o upload multipart dedicado com compressão
  if (folder === 'manejos') {
    return uploadManejoPhoto(localUri);
  }

  try {
    // Comprime antes de enviar
    const compressedUri = await compressImage(localUri);

    const cleanUri = compressedUri.split('?')[0];
    const ext = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';

    let base64 = '';
    if (compressedUri.startsWith('data:')) {
      base64 = compressedUri;
    } else {
      const fileData = await FileSystemLegacy.readAsStringAsync(compressedUri, {
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
