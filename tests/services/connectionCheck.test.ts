/**
 * Verificação de conexão com o backend (F4 do relatório).
 *
 * O app chama checkServerConnection antes do login automático, do logout e de
 * cada sync. Com o cold start do Render, esperar 10 s em cada chamada deixava
 * a abertura e o logout lentos. Agora: timeout de 3 s, resultado reaproveitado
 * por alguns segundos e chamadas simultâneas compartilhando a mesma requisição.
 */
jest.mock('../../src/services/localDbService', () => ({
  getLocalConfigValue: jest.fn(async () => null),
  setLocalConfigValue: jest.fn(async () => undefined),
}));
jest.mock('../../src/services/secureStorage', () => ({ secureGet: jest.fn(async () => null) }));

import { checkServerConnection, resetConnectionStatusCache, setCustomBackendUrl } from '../../src/services/apiClient';

const fetchMock = jest.fn();

/** Resposta de /health que chega na hora. */
const healthy = () => Promise.resolve({ ok: true } as Response);

/** Requisição que nunca responde, mas respeita o AbortSignal como o fetch real. */
function hanging(_url: string, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  resetConnectionStatusCache();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('timeout', () => {
  it('desiste em 3 segundos quando o servidor não responde', async () => {
    fetchMock.mockImplementation(hanging);
    let result: boolean | undefined;
    void checkServerConnection().then((value) => { result = value; });

    await jest.advanceTimersByTimeAsync(2_900);
    expect(result).toBeUndefined();

    await jest.advanceTimersByTimeAsync(200);
    expect(result).toBe(false);
  });
});

describe('cache do estado da conexão', () => {
  it('reaproveita o "online" por 30 segundos', async () => {
    fetchMock.mockImplementation(healthy);

    expect(await checkServerConnection()).toBe(true);
    await jest.advanceTimersByTimeAsync(29_000);
    expect(await checkServerConnection()).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('confere de novo depois que o cache de "online" vence', async () => {
    fetchMock.mockImplementation(healthy);

    await checkServerConnection();
    await jest.advanceTimersByTimeAsync(31_000);
    await checkServerConnection();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reaproveita o "offline" por menos tempo (10 segundos), para reconectar logo', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    expect(await checkServerConnection()).toBe(false);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(await checkServerConnection()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(healthy);
    await jest.advanceTimersByTimeAsync(6_000);
    expect(await checkServerConnection()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('chamadas simultâneas compartilham uma única requisição', async () => {
    fetchMock.mockImplementation(healthy);

    const results = await Promise.all([checkServerConnection(), checkServerConnection(), checkServerConnection()]);

    expect(results).toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('testar outra URL (overrideUrl) ignora o cache', async () => {
    fetchMock.mockImplementation(healthy);

    await checkServerConnection();
    await checkServerConnection('https://outro-servidor.example');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://outro-servidor.example/api/v1/health');
  });

  it('trocar a URL do servidor descarta o estado guardado do servidor anterior', async () => {
    fetchMock.mockImplementation(healthy);
    await checkServerConnection();

    await setCustomBackendUrl('https://novo-servidor.example');
    await checkServerConnection();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://novo-servidor.example/api/v1/health');
  });
});
