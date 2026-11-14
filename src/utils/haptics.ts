/**
 * Vibração curta nas ações de campo (F6): no apiário, com luva ou ao sol, o
 * apicultor sente que o toque ou o comando de voz funcionou sem olhar a tela.
 *
 * Falhas são ignoradas: aparelho sem motor de vibração, web ou testes.
 */
import * as Haptics from 'expo-haptics';

function safely(run: () => Promise<void>): void {
  try {
    void run().catch(() => undefined);
  } catch {
    // Módulo nativo indisponível.
  }
}

/** Item marcado ou desmarcado. */
export function hapticSelection(): void {
  safely(() => Haptics.selectionAsync());
}

/** Registro salvo. */
export function hapticSuccess(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Falha ao salvar. */
export function hapticError(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
