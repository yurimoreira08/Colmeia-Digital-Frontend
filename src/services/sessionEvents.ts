/**
 * Aviso de "sessão expirada" do sync para a navegação, sem que um importe o
 * outro. Quem ouve (AppNavigator) leva o apicultor ao login.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

/** Inscreve um ouvinte; devolve a função que cancela a inscrição. */
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionExpired(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('[sessionEvents] Falha num ouvinte de sessão expirada:', err);
    }
  });
}
