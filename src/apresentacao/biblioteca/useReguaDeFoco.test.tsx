import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReguaDeFoco, ACESA, APAGADA } from './useReguaDeFoco';

class FalsoRealce {
  faixas: Range[];
  constructor(...faixas: Range[]) {
    this.faixas = faixas;
  }
}

function Caixa({ ligada }: { ligada: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useReguaDeFoco(ref, ligada);
  return (
    <div ref={ref}>
      <span className="texto-vigente" data-dispositivo="a">
        Primeira frase. Segunda frase.
      </span>
    </div>
  );
}

describe('useReguaDeFoco', () => {
  const mapa = new Map<string, FalsoRealce>();
  beforeEach(() => {
    mapa.clear();
    vi.stubGlobal('Highlight', FalsoRealce);
    Object.defineProperty(CSS, 'highlights', { value: mapa, configurable: true });
    vi.stubGlobal('requestAnimationFrame', (f: () => void) => {
      f();
      return 1;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(CSS, 'highlights');
  });

  it('acende a primeira frase e apaga o resto, sem mexer no DOM', () => {
    const { container, unmount } = render(<Caixa ligada />);
    const antes = container.innerHTML;
    const acesa = mapa.get(ACESA);
    const apagada = mapa.get(APAGADA);
    expect(acesa?.faixas.map((f) => f.toString())).toEqual(['Primeira frase.']);
    expect(apagada?.faixas.map((f) => f.toString().trim())).toEqual(['Segunda frase.']);
    expect(container.innerHTML).toBe(antes);
    unmount();
    expect(mapa.has(ACESA)).toBe(false);
    expect(mapa.has(APAGADA)).toBe(false);
  });

  it('desligada não pinta nada', () => {
    render(<Caixa ligada={false} />);
    expect(mapa.size).toBe(0);
  });
});
