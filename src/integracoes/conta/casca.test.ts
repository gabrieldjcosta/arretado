import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServicoDeConta } from './interface';

const m = vi.hoisted(() => ({
  aoAbrir: undefined as unknown as (e: { url: string }) => void,
  lancamento: undefined as string | undefined,
  tratar: vi.fn(() => Promise.resolve('falhou' as const)),
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (_: string, f: (e: { url: string }) => void) => {
      m.aoAbrir = f;
      return Promise.resolve();
    },
    getLaunchUrl: () => Promise.resolve(m.lancamento ? { url: m.lancamento } : undefined),
  },
}));
vi.mock('@capacitor/browser', () => ({ Browser: { close: () => Promise.resolve() } }));
vi.mock('./retorno', () => ({ tratarRetornoDoLogin: m.tratar }));

import { ouvirRetornoDoLogin } from './casca';

beforeEach(() => {
  sessionStorage.clear();
  m.tratar.mockClear();
  m.lancamento = undefined;
  (window as unknown as { Capacitor: unknown }).Capacitor = { isNativePlatform: () => true };
});

describe('retorno do login na casca', () => {
  it('trata o link de abertura uma vez só, mesmo depois de recarregar', async () => {
    m.lancamento = 'https://arretado.cc/?code=abc';
    await ouvirRetornoDoLogin({} as ServicoDeConta);
    await ouvirRetornoDoLogin({} as ServicoDeConta);
    expect(m.tratar).toHaveBeenCalledTimes(1);
  });

  it('ignora link sem código e URL malformada', async () => {
    await ouvirRetornoDoLogin({} as ServicoDeConta);
    m.aoAbrir({ url: 'https://arretado.cc/' });
    m.aoAbrir({ url: 'isto não é url' });
    await Promise.resolve();
    expect(m.tratar).not.toHaveBeenCalled();
  });
});
