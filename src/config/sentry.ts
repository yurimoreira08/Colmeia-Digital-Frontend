/**
 * Sentry no app (rastreamento de erros). Só liga com EXPO_PUBLIC_SENTRY_DSN
 * definido no build (eas.json ou variáveis do EAS); sem ele, nada é enviado.
 *
 * Nada de dados pessoais: sem IP, sem dados do usuário além do id, sem corpo
 * de requisição e sem query string nas URLs (podem ter termo de busca). O
 * token nunca entra no Sentry: ele só existe no SecureStore e no cabeçalho
 * Authorization, que é removido.
 */
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Tira a query string de uma URL (`https://x/api?search=ana` → `https://x/api`). */
export function stripQuery(url: string | undefined): string | undefined {
  return url ? url.split('?')[0] : url;
}

/** Remove dados pessoais do evento antes do envio. Exportado para os testes. */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    event.request.url = stripQuery(event.request.url);
    if (event.request.headers) {
      const { Authorization: _a, authorization: _b, ...safe } = event.request.headers;
      event.request.headers = safe;
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  return event;
}

/** Breadcrumbs de requisição sem a query string. */
export function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  if (breadcrumb.data && typeof breadcrumb.data.url === 'string') {
    breadcrumb.data = { ...breadcrumb.data, url: stripQuery(breadcrumb.data.url) };
  }
  return breadcrumb;
}

export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}
