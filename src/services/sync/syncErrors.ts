/**
 * Tipos e classificação de erros compartilhados pelas etapas do sync.
 */

/** Resultado de uma etapa de envio. */
export interface PushOutcome {
  syncedCount: number;
  errors: string[];
  /** Houve recusa ou conflito: o próximo download precisa ser completo para limpar o aparelho. */
  needsFullPull: boolean;
}

/** Sessão expirada (401): o sync para e só volta depois de um novo login. */
export class SyncAuthError extends Error {}

export function isAuthError(err: any): boolean {
  return err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Não autorizado');
}

export function isForbiddenError(err: any): boolean {
  return err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Forbidden');
}

export function isNotFoundError(err: any): boolean {
  return err?.status === 404 || err?.message?.includes('404') || err?.message?.includes('não encontrado');
}

/** O servidor ainda não tem a rota (versão antiga ou servidor personalizado). */
export function isRouteMissing(err: any): boolean {
  return err?.status === 404;
}
