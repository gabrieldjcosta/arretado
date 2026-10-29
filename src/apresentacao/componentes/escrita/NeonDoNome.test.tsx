import { render } from '@testing-library/react';
import { CACTO, NOME } from './geometria';
import { NeonDoNome } from './NeonDoNome';

describe('NeonDoNome (D-D10, N1)', () => {
  it('parado, é só o repouso: o mesmo grupo e os mesmos gêmeos, sem animação nem traço tracejado', () => {
    const { container } = render(
      <svg>
        <NeonDoNome />
      </svg>,
    );
    const grupo = container.querySelector<SVGGElement>('g.eb-neon');
    expect(grupo).toHaveClass('neon-camada');
    expect(grupo).not.toHaveClass('a');
    expect(grupo?.getAttribute('style')).toBeNull();

    const gemeos = [...(grupo?.querySelectorAll('path.tn') ?? [])];
    expect(gemeos).toHaveLength(NOME.length + CACTO.length);
    gemeos.slice(0, NOME.length).forEach((gemeo, i) => {
      expect(gemeo).toHaveAttribute('d', NOME[i]![0]);
      expect(gemeo).toHaveAttribute('transform', `translate(${String(NOME[i]![1])} 0)`);
      expect(gemeo).not.toHaveClass('tr', 'a');
      expect(gemeo).not.toHaveAttribute('pathLength');
      expect(gemeo.getAttribute('style')).toBeNull();
    });
    expect(gemeos.slice(NOME.length).map((p) => p.getAttribute('d'))).toEqual([...CACTO]);
    expect(gemeos[NOME.length]?.parentElement?.getAttribute('style')).toBeNull();
  });

  it('o filtro do grupo existe no próprio documento, com desvio 7 e região fixa', () => {
    const { container } = render(
      <svg>
        <NeonDoNome />
      </svg>,
    );
    const grupo = container.querySelector('g.eb-neon');
    const id = /url\(#([^)]+)\)/.exec(grupo?.getAttribute('filter') ?? '')?.[1];
    const filtro = container.querySelector(`filter[id="${id ?? ''}"]`);
    expect(filtro).toHaveAttribute('filterUnits', 'userSpaceOnUse');
    expect(filtro).toHaveAttribute('width', '1140');
    expect(filtro?.querySelector('feGaussianBlur')).toHaveAttribute('stdDeviation', '7');
  });

  it('dois néons na mesma tela não repetem o id do filtro', () => {
    const { container } = render(
      <svg>
        <NeonDoNome />
        <NeonDoNome />
      </svg>,
    );
    const ids = [...container.querySelectorAll('filter')].map((f) => f.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('animado, cada gêmeo leva a curva da sua letra e o grupo, a do néon', () => {
    const { container } = render(
      <svg>
        <NeonDoNome animado />
      </svg>,
    );
    const grupo = container.querySelector<SVGGElement>('g.eb-neon');
    expect(grupo).toHaveClass('a');
    expect(grupo).toHaveStyle({ animationName: 'eb-neon' });
    const letras = [...container.querySelectorAll('path.tn.tr')];
    expect(letras).toHaveLength(NOME.length);
    letras.forEach((gemeo, i) => {
      expect(gemeo).toHaveAttribute('pathLength', '1');
      expect(gemeo).toHaveStyle({ animationName: `eb-t${String(i)}` });
    });
  });
});
