import { act, renderHook } from '@testing-library/react';
import { useLarguraMaxima, useLarguraMinima } from './largura';

/** Uma janela que responde às consultas `(min-width: Npx)` e `(max-width: Npx)` e avisa quando a largura muda. */
function janelaDe(largura: number) {
  let atual = largura;
  const ouvintes = new Set<() => void>();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => ({
      get matches() {
        const limite = Number(/(\d+)px/.exec(consulta)?.[1]);
        return consulta.includes('max-width') ? atual <= limite : atual >= limite;
      },
      addEventListener: (_: string, ouvinte: () => void) => {
        ouvintes.add(ouvinte);
      },
      removeEventListener: (_: string, ouvinte: () => void) => {
        ouvintes.delete(ouvinte);
      },
    }),
  });
  return {
    ouvintes,
    mudar(nova: number) {
      atual = nova;
      act(() => {
        for (const ouvinte of ouvintes) ouvinte();
      });
    },
  };
}

afterEach(() => {
  delete (window as Partial<Window>).matchMedia;
});

describe('useLarguraMinima', () => {
  it('sem matchMedia (jsdom), a janela nunca é larga', () => {
    const { result } = renderHook(() => useLarguraMinima(700));
    expect(result.current).toBe(false);
  });

  it('diz se a janela tem a largura mínima e acompanha a mudança dela', () => {
    const janela = janelaDe(390);
    const { result } = renderHook(() => useLarguraMinima(700));
    expect(result.current).toBe(false);
    janela.mudar(768);
    expect(result.current).toBe(true);
    janela.mudar(699);
    expect(result.current).toBe(false);
  });

  it('assina uma vez só e solta o ouvinte ao sair', () => {
    const janela = janelaDe(1024);
    const { result, rerender, unmount } = renderHook(() => useLarguraMinima(700));
    expect(result.current).toBe(true);
    rerender();
    rerender();
    expect(janela.ouvintes.size).toBe(1);
    unmount();
    expect(janela.ouvintes.size).toBe(0);
  });
});

describe('useLarguraMaxima', () => {
  it('sem matchMedia (jsdom), a janela nunca é estreita', () => {
    const { result } = renderHook(() => useLarguraMaxima(699));
    expect(result.current).toBe(false);
  });

  it('diz se a janela cabe na largura máxima e acompanha a mudança dela', () => {
    const janela = janelaDe(390);
    const { result } = renderHook(() => useLarguraMaxima(699));
    expect(result.current).toBe(true);
    janela.mudar(700);
    expect(result.current).toBe(false);
    janela.mudar(699);
    expect(result.current).toBe(true);
  });
});
