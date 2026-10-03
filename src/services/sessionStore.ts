type BoxModificationType = 'revisao' | 'manejo' | 'both';

interface BoxModificationInfo {
  boxId: number;
  type: BoxModificationType;
  timestamp: number;
}

// Armazenamento em memória (reseta automaticamente ao reiniciar/fechar o app)
const modifiedBoxesMap = new Map<number, BoxModificationInfo>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('[SessionStore] Erro ao notificar listener:', err);
    }
  });
}

/**
 * Marca uma caixa como modificada recentemente (revisada ou manejo feito) nesta sessão do aplicativo.
 */
export function markBoxModifiedInSession(boxId: number, type: 'revisao' | 'manejo'): void {
  if (!boxId) return;

  const existing = modifiedBoxesMap.get(boxId);
  let finalType: BoxModificationType = type;

  if (existing && existing.type !== type) {
    finalType = 'both';
  }

  modifiedBoxesMap.set(boxId, {
    boxId,
    type: finalType,
    timestamp: Date.now(),
  });

  notifyListeners();
}

/**
 * Retorna as informações de modificação da caixa na sessão atual ou null se não foi mexida.
 */
export function getBoxSessionModification(boxId: number): BoxModificationInfo | null {
  return modifiedBoxesMap.get(boxId) || null;
}

/**
 * Verifica se a caixa foi modificada nesta sessão.
 */
export function isBoxModifiedInSession(boxId: number): boolean {
  return modifiedBoxesMap.has(boxId);
}

/**
 * Subscreve para ser notificado de atualizações de caixas modificadas na sessão.
 */
export function subscribeSessionModifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
