import { act, render } from '@testing-library/react';
import { simularMovimento } from '../../../testes/movimento';
import { IconeDoPasso } from './IconeDoPasso';
import { PASSOS } from './passos';

const HOJE = PASSOS[0]?.icone ?? '';
const TRILHA = PASSOS[1]?.icone ?? '';

const deslocamentos = (raiz: ParentNode) =>
  [...raiz.querySelectorAll<SVGPathElement>('path')].map((p) => p.style.strokeDashoffset);

describe('o ícone do passo (D-D10)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('é decorativo e desenha o ícone da aba duas vezes: o brilho por baixo e o traço por cima', () => {
    simularMovimento('reduzido');
    const { container } = render(<IconeDoPasso d={HOJE} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    const caminhos = [...container.querySelectorAll('path')];
    expect(caminhos.map((p) => p.getAttribute('d'))).toEqual([HOJE, HOJE]);
    expect(caminhos.map((p) => p.getAttribute('pathLength'))).toEqual(['1', '1']);
    // O brilho é a camada de néon: filtro de desfoque de região fixa (um traço reto tem caixa de largura zero).
    expect(caminhos[0]).toHaveClass('passo-neon', 'neon-camada');
    expect(caminhos[1]).not.toHaveClass('passo-neon');
    const filtro = container.querySelector('filter');
    expect(filtro).toHaveAttribute('filterUnits', 'userSpaceOnUse');
    expect(filtro?.querySelector('feGaussianBlur')).toHaveAttribute('stdDeviation', '1.1');
    expect(caminhos[0]?.getAttribute('filter')).toBe(`url(#${filtro?.id ?? ''})`);
  });

  it('no movimento normal o traço se desenha em 420 ms com o néon aceso, que assenta ao fechar', () => {
    simularMovimento('normal');
    const { container } = render(<IconeDoPasso d={HOJE} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-acesa');
    expect(deslocamentos(container)).toEqual(['1.02', '1.02']);
    act(() => {
      vi.advanceTimersByTime(16);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const [brilho, traco] = deslocamentos(container).map(Number);
    expect(brilho).toBe(traco);
    expect(traco).toBeGreaterThan(0);
    expect(traco).toBeLessThan(1.02);
    expect(svg).toHaveAttribute('data-acesa');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(deslocamentos(container)).toEqual(['0', '0']);
    expect(svg).not.toHaveAttribute('data-acesa');
  });

  it.each(['calmo', 'reduzido'] as const)(
    'no %s o ícone aparece pronto, sem néon aceso',
    (movimento) => {
      simularMovimento(movimento);
      const { container } = render(<IconeDoPasso d={HOJE} />);
      expect(deslocamentos(container)).toEqual(['0', '0']);
      expect(container.querySelector('svg')).not.toHaveAttribute('data-acesa');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(deslocamentos(container)).toEqual(['0', '0']);
    },
  );

  it('um ícone novo se desenha de novo; desmontar no meio do traço não deixa nada para trás', () => {
    simularMovimento('normal');
    const { container, rerender, unmount } = render(<IconeDoPasso d={HOJE} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(deslocamentos(container)).toEqual(['0', '0']);
    rerender(<IconeDoPasso d={TRILHA} />);
    expect(deslocamentos(container)).toEqual(['1.02', '1.02']);
    expect([...container.querySelectorAll('path')].map((p) => p.getAttribute('d'))).toEqual([
      TRILHA,
      TRILHA,
    ]);
    const svg = container.querySelector('svg');
    unmount();
    expect(svg).not.toHaveAttribute('data-acesa');
    expect(vi.getTimerCount()).toBe(0);
  });
});
