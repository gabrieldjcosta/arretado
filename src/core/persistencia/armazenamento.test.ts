import { pedirArmazenamentoPersistente } from './armazenamento';

describe('pedirArmazenamentoPersistente', () => {
  it('indisponível sem a API', async () => {
    expect(await pedirArmazenamentoPersistente(undefined)).toBe('indisponivel');
    expect(await pedirArmazenamentoPersistente({})).toBe('indisponivel');
  });

  it('já persistente: não pede de novo', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const r = await pedirArmazenamentoPersistente({
      persisted: () => Promise.resolve(true),
      persist,
    });
    expect(r).toBe('persistente');
    expect(persist).not.toHaveBeenCalled();
  });

  it('pede e reflete a resposta do navegador', async () => {
    const api = (ok: boolean) => ({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(ok),
    });
    expect(await pedirArmazenamentoPersistente(api(true))).toBe('persistente');
    expect(await pedirArmazenamentoPersistente(api(false))).toBe('temporario');
  });

  it('exceção vira indisponível', async () => {
    const r = await pedirArmazenamentoPersistente({
      persisted: () => Promise.reject(new Error('x')),
      persist: () => Promise.resolve(true),
    });
    expect(r).toBe('indisponivel');
  });
});
