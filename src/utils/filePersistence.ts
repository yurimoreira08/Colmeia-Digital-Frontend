import { Paths, File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

/**
 * Utilitário para salvar imagens permanentemente.
 * Copia uma imagem temporária para o diretório de documentos do aplicativo.
 * Também salva na galeria do dispositivo do usuário.
 */
export async function saveImagePermanently(uriOriginal: string): Promise<string> {
  try {
    // 1. Solicita permissões e salva na galeria do dispositivo
    if (Platform.OS !== 'web') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        // Salva na galeria (pasta padrão de imagens do sistema)
        await MediaLibrary.saveToLibraryAsync(uriOriginal);
      }
    }

    // 2. Extrai o nome do arquivo original
    const nomeArquivo = uriOriginal.split('/').pop() || `foto_${Date.now()}.jpg`;

    // 3. Define o local permanente dentro do aplicativo usando o novo API (Paths e File)
    const arquivoOrigem = new File(uriOriginal);
    const arquivoDestino = new File(Paths.document, nomeArquivo);

    // 4. Copia o arquivo para o armazenamento permanente
    // Nota: De acordo com a nova API do Expo FileSystem, copy pode ser síncrono ou assíncrono
    // dependendo da implementação, mas aqui tratamos como operação segura.
    await arquivoOrigem.copy(arquivoDestino);

    return arquivoDestino.uri;
  } catch (erro) {
    console.error('Erro ao persistir imagem:', erro);
    // Em caso de falha, retorna a URI original para não perder a referência
    return uriOriginal;
  }
}

/**
 * Exclui um arquivo local do sistema.
 * Útil para limpar fotos quando um registro é removido.
 */
export async function deleteLocalFile(uri: string): Promise<void> {
  try {
    if (!uri || !uri.startsWith('file://')) return;
    
    const arquivo = new File(uri);
    if (arquivo.exists) {
      await arquivo.delete();
    }
  } catch (erro) {
    console.error('Erro ao excluir arquivo local:', erro);
  }
}
