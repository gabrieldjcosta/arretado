import { render } from '@testing-library/react';
import { CACTO, CAIXA_DO_LOCKUP, NOME } from './escrita/geometria';
import { LockupParado } from './LockupParado';

describe('LockupParado (D-D9, Q2)', () => {
  it('é decorativo, tem a caixa do lockup e o desenho de verdade com o ponto de luz', () => {
    const { container } = render(<LockupParado />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', CAIXA_DO_LOCKUP);
    expect(svg).toHaveClass('lockup');
    expect(container.querySelector('.lockup-ponto')).not.toBeNull();
    const letras = [...container.querySelectorAll('svg > path')];
    expect(letras.map((p) => p.getAttribute('d'))).toEqual([...NOME.map(([d]) => d), ...CACTO]);
  });

  it('leva o néon de repouso da escrita, por baixo do desenho (D-D10, N1)', () => {
    const { container } = render(<LockupParado />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    const grupo = svg.querySelector('g.eb-neon');
    expect(grupo).not.toBeNull();
    // O primeiro elemento desenhado: o brilho fica sob as letras.
    const desenhados = [...svg.children].filter((el) => el.tagName !== 'defs');
    expect(desenhados[0]).toBe(grupo);
    // Só o repouso: nada de animação (o quadro final da escrita é este).
    expect(svg.querySelectorAll('.a')).toHaveLength(0);
  });
});
