/**
 * @jest-environment node
 */
/** O Sentry do app não envia dados pessoais (Fase 4). */
import { scrubBreadcrumb, scrubEvent } from '../../src/config/sentry';

jest.mock('@sentry/react-native', () => ({ init: jest.fn() }));

it('o evento sai sem token, corpo, cookies, query nem dados do usuário além do id', () => {
  const event = scrubEvent({
    type: undefined,
    request: {
      url: 'https://api.example/api/v1/manejos?search=ana',
      headers: { Authorization: 'Bearer segredo', 'Content-Type': 'application/json' },
      data: '{"password":"x"}',
      cookies: { a: 'b' },
      query_string: 'search=ana',
    },
    user: { id: '1', email: 'ana@example.com', username: 'Ana' },
  });

  expect(event.request).toEqual({ url: 'https://api.example/api/v1/manejos', headers: { 'Content-Type': 'application/json' } });
  expect(event.user).toEqual({ id: '1' });
});

it('as requisições registradas no breadcrumb perdem a query string', () => {
  expect(scrubBreadcrumb({ category: 'fetch', data: { url: 'https://api.example/x?search=ana', status_code: 200 } }).data).toEqual({
    url: 'https://api.example/x',
    status_code: 200,
  });
});
