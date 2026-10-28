import { render } from '@testing-library/react';
import { EscritaDoNome } from './EscritaDoNome';
import { CACTO, CAIXA_DO_LOCKUP, NOME } from './geometria';

/** Todo `url(#id)` que o desenho usa precisa achar o `id` no próprio documento. */
function referencias(raiz: Element): string[] {
  return [...raiz.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].flatMap((a) => [...a.value.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!)),
  );
}

describe('EscritaDoNome (D-D9, Q6)', () => {
  it('é decorativa e tem a caixa do lockup', () => {
    const { container } = render(<EscritaDoNome />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', CAIXA_DO_LOCKUP);
    expect(svg).toHaveClass('lockup', 'eb');
  });

  it('escreve os 14 traços do nome, na ordem da mão, cada um com a sua animação', () => {
    const { container } = render(<EscritaDoNome />);
    const traços = [...container.querySelectorAll('path.tr:not(.tn)')];
    expect(traços).toHaveLength(14);
    expect(NOME).toHaveLength(14);
    traços.forEach((traço, i) => {
      expect(traço).toHaveAttribute('d', NOME[i]![0]);
      expect(traço).toHaveAttribute('pathLength', '1');
      expect(traço).toHaveStyle({ animationName: `eb-t${String(i)}` });
    });
  });

  describe('o néon suave (D-D10)', () => {
    it('é uma cópia dos 14 traços e do cacto, sob o desenho, com a mesma animação de cada letra', () => {
      const { container } = render(<EscritaDoNome />);
      const svg = container.querySelector('svg.eb') as SVGSVGElement;
      const grupo = svg.querySelector<SVGGElement>('g.eb-neon');
      expect(grupo).not.toBeNull();
      expect(grupo).toHaveClass('neon-camada', 'a');
      expect(grupo).toHaveStyle({ animationName: 'eb-neon' });
      // Vem antes de tudo o que é desenhado: o brilho fica por baixo das letras.
      const filhos = [...svg.children].filter((el) => el.tagName !== 'defs');
      expect(filhos[0]).toBe(grupo);

      const gemeos = [...(grupo?.querySelectorAll('path.tn') ?? [])];
      const letras = gemeos.filter((p) => p.classList.contains('tr'));
      expect(letras).toHaveLength(14);
      letras.forEach((gemeo, i) => {
        expect(gemeo).toHaveAttribute('d', NOME[i]![0]);
        expect(gemeo).toHaveAttribute('transform', `translate(${String(NOME[i]![1])} 0)`);
        expect(gemeo).toHaveAttribute('pathLength', '1');
        // A mesma curva da letra: o brilho se desenha junto com ela.
        expect(gemeo).toHaveStyle({ animationName: `eb-t${String(i)}` });
      });
      const cacto = gemeos.filter((p) => !p.classList.contains('tr'));
      expect(cacto.map((p) => p.getAttribute('d'))).toEqual([...CACTO]);
      expect(cacto[0]?.parentElement).toHaveStyle({ animationName: 'eb-cacto' });
    });

    it('o filtro tem desvio 7 e região fixa em unidades do letreiro', () => {
      const { container } = render(<EscritaDoNome />);
      const grupo = container.querySelector('g.eb-neon');
      const id = /url\(#([^)]+)\)/.exec(grupo?.getAttribute('filter') ?? '')?.[1];
      const filtro = container.querySelector(`filter[id="${id ?? ''}"]`);
      expect(filtro).not.toBeNull();
      // A caixa do grupo muda a cada letra que se escreve: a região não pode ser a dela.
      expect(filtro).toHaveAttribute('filterUnits', 'userSpaceOnUse');
      expect(filtro).toHaveAttribute('x', '-80');
      expect(filtro).toHaveAttribute('y', '-40');
      expect(filtro).toHaveAttribute('width', '1140');
      expect(filtro).toHaveAttribute('height', '260');
      expect(filtro?.querySelector('feGaussianBlur')).toHaveAttribute('stdDeviation', '7');
    });

    it('o desenho de verdade continua sem filtro nem classe de brilho', () => {
      const { container } = render(<EscritaDoNome />);
      for (const letra of container.querySelectorAll('path.tr:not(.tn)')) {
        expect(letra).not.toHaveAttribute('filter');
        expect(letra.closest('.eb-neon')).toBeNull();
      }
    });
  });

  it('o cacto final tem os três traços do lockup', () => {
    const { container } = render(<EscritaDoNome />);
    const cacto = [...container.querySelectorAll('g.eb-cacto path')].map((p) =>
      p.getAttribute('d'),
    );
    expect(cacto).toEqual([...CACTO]);
  });

  it('os modos viram classes: curta, calmo e pulou', () => {
    const { container, rerender } = render(<EscritaDoNome />);
    const svg = container.querySelector('svg');
    expect(svg).not.toHaveClass('curta');
    expect(svg).not.toHaveClass('calmo');
    expect(svg).not.toHaveClass('pulou');
    rerender(<EscritaDoNome curta calmo pulou />);
    expect(svg).toHaveClass('curta', 'calmo', 'pulou');
  });

  it('duas escritas na mesma tela não repetem id, e cada referência acha o seu alvo', () => {
    const { container } = render(
      <>
        <EscritaDoNome />
        <EscritaDoNome />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    const usados = referencias(container);
    expect(usados.length).toBeGreaterThan(0);
    for (const id of usados) expect(ids).toContain(id);
    // Cada instância usa só os ids da própria `<defs>`.
    for (const svg of container.querySelectorAll('svg')) {
      const meus = [...svg.querySelectorAll('[id]')].map((el) => el.id);
      for (const id of referencias(svg)) expect(meus).toContain(id);
    }
  });

  it('os cones da caneta, só de preenchimento, soltam o traço que a raiz herda', () => {
    const { container } = render(<EscritaDoNome />);
    // Fechados (terminam em Z): o cone de cada camada de vidro e o do furo de tinta.
    const cones = [...container.querySelectorAll('.pen-corpo path, .eb-bico path')].filter((p) =>
      p.getAttribute('d')?.endsWith('Z'),
    );
    expect(cones).toHaveLength(3);
    for (const cone of cones) expect(cone).toHaveAttribute('stroke', 'none');
  });
});
