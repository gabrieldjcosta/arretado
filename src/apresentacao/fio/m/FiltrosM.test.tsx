import { cleanup, render } from '@testing-library/react';
import { FiltrosM } from './FiltrosM';

afterEach(cleanup);

/** As entradas que todo filtro já tem; qualquer outra `in` ou `in2` tem de apontar para um `result` anterior. */
const ENTRADAS_DO_FILTRO = ['SourceGraphic', 'SourceAlpha'];

function filtro(id: string): SVGFilterElement {
  const { container } = render(<FiltrosM />);
  const achado = container.querySelector<SVGFilterElement>(`filter#${id}`);
  if (!achado) throw new Error(`faltou o filtro ${id}`);
  return achado;
}

/** Por halo, de longe a perto: o espalhamento (`feMorphology`), o desvio do desfoque e a opacidade da cor. */
function halos(f: SVGFilterElement): Array<[string | null, string | null, string | null]> {
  const dilatar = [...f.querySelectorAll('feMorphology')];
  const borrar = [...f.querySelectorAll('feGaussianBlur')];
  const cor = [...f.querySelectorAll('feFlood')];
  return dilatar.map((m, i) => [
    m.getAttribute('radius'),
    borrar[i]?.getAttribute('stdDeviation') ?? null,
    cor[i]?.getAttribute('flood-opacity') ?? null,
  ]);
}

describe('os filtros do neon do fio (desvio 20)', () => {
  it('trazem os valores das pranchas da Marca, de longe a perto, nos três estados', () => {
    const { container } = render(<FiltrosM />);
    const pegar = (estado: string) => {
      const f = container.querySelector<SVGFilterElement>(`filter#m-neon-${estado}`);
      if (!f) throw new Error(`faltou o filtro m-neon-${estado}`);
      return halos(f);
    };
    // O `box-shadow` da prancha é `0 0 <raio> <espalha> <cor>` e o raio é o dobro do desvio-padrão.
    expect(pegar('solto')).toEqual([
      ['2', '7', '0.32'],
      ['1', '2', '0.55'],
    ]);
    expect(pegar('puxando')).toEqual([
      ['4', '10', '0.42'],
      ['1', '2.5', '0.7'],
    ]);
    expect(pegar('passou')).toEqual([
      ['8', '14', '0.6'],
      ['2', '3', '0.95'],
    ]);
  });

  it('só têm primitivas dentro do <filter>, e o halo de longe fica por baixo do de perto e do fio', () => {
    for (const estado of ['solto', 'puxando', 'passou']) {
      const f = filtro(`m-neon-${estado}`);
      // Um `<g>` dentro do `<filter>` não conta: o navegador o ignora e o halo some.
      expect([...f.children].map((c) => c.localName)).toEqual([
        'feMorphology',
        'feGaussianBlur',
        'feFlood',
        'feComposite',
        'feMorphology',
        'feGaussianBlur',
        'feFlood',
        'feComposite',
        'feMerge',
      ]);
      const camadas = [...f.querySelectorAll('feMergeNode')].map((n) => n.getAttribute('in'));
      expect(camadas).toEqual(['halo0', 'halo1', 'SourceGraphic']);
    }
  });

  it('só leem de resultados que já existem', () => {
    const f = filtro('m-neon-passou');
    const feitos = new Set(ENTRADAS_DO_FILTRO);
    for (const p of f.children) {
      for (const lado of ['in', 'in2']) {
        const entrada = p.getAttribute(lado);
        if (entrada) expect(feitos.has(entrada), `${p.localName} lê ${entrada}`).toBe(true);
      }
      for (const n of p.querySelectorAll('feMergeNode')) {
        const entrada = n.getAttribute('in');
        if (entrada) expect(feitos.has(entrada), `feMergeNode lê ${entrada}`).toBe(true);
      }
      const resultado = p.getAttribute('result');
      if (resultado) feitos.add(resultado);
    }
  });

  it('têm uma região própria, em px do desenho, e somam as cores no sRGB como o box-shadow', () => {
    for (const estado of ['solto', 'puxando', 'passou']) {
      const f = filtro(`m-neon-${estado}`);
      // O fio é uma reta sem largura em repouso: uma região relativa ao traço seria vazia.
      expect(f.getAttribute('filterUnits')).toBe('userSpaceOnUse');
      expect(f.getAttribute('color-interpolation-filters')).toBe('sRGB');
    }
  });
});
