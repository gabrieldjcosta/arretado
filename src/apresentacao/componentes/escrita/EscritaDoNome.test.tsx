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
    const traços = [...container.querySelectorAll('path.tr')];
    expect(traços).toHaveLength(14);
    expect(NOME).toHaveLength(14);
    traços.forEach((traço, i) => {
      expect(traço).toHaveAttribute('d', NOME[i]![0]);
      expect(traço).toHaveAttribute('pathLength', '1');
      expect(traço).toHaveStyle({ animationName: `eb-t${String(i)}` });
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
