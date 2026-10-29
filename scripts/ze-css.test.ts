import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bloco } from './css-bloco';

const css = readFileSync(
  path.join(import.meta.dirname, '..', 'src', 'apresentacao', 'componentes', 'ze', 'ze.css'),
  'utf8',
);

// O jsdom não aplica o CSS do Zé (nem o filtro do halo): estas são as regras de que o contraste, as cores
// forçadas e o movimento dependem. Cada uma foi achada por mutação (revisão do #341): trocar uma linha
// dessas passava sem teste nenhum. Quem muda uma delas muda também o par de `scripts/contraste.mjs` ou o contrato.

describe('o CSS do Zé: as regras que o jsdom não vê (D-D10)', () => {
  it('a linha usa o núcleo branco e a faixa usa a cor da faixa: a linha não some dentro dela', () => {
    expect(bloco(css, '.ze .z-linha')).toContain('stroke: var(--z-nucleo);');
    expect(bloco(css, '.ze .z-banda')).toContain('stroke: var(--z-banda);');
  });

  it('o tamanho grande tem traço de 6 e faixa de 17; o médio e o pequeno engrossam', () => {
    const grande = bloco(css, '.ze');
    expect(grande).toContain('--z-traco: 6;');
    expect(grande).toContain('--z-faixa: 17;');
    const medio = bloco(css, ".ze[data-tamanho='medio'],\n.ze[data-tamanho='pequeno']");
    expect(medio).toContain('--z-traco: 8;');
    expect(medio).toContain('--z-faixa: 21;');
  });

  it('a 32 e 24 px a faixa afunda (os pares de 3,6:1 e 3,4:1) e as bochechas somem', () => {
    const minimo = bloco(css, ".ze[data-tamanho='minimo']");
    expect(minimo).toContain('--z-banda: var(--z-banda-p);');
    expect(minimo).toContain('--z-traco: 10;');
    expect(bloco(css, ".ze[data-tamanho='minimo'] .z-bochechas")).toBe('display: none;');
  });

  it('o brilho assenta em 0,6 s e acende na hora', () => {
    expect(bloco(css, '.ze .z-bloom')).toContain('transition: opacity 600ms');
    expect(bloco(css, '.ze[data-acesa] .z-bloom')).toBe('transition: none;');
    expect(bloco(css, '.ze[data-acesa]')).toBe('--z-bloom-op: var(--z-bloom-aceso);');
  });

  it('o olhar desliza em 200 ms só com movimento normal; no Calmo troca na hora', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{\s*\.ze \.z-olhos \{\s*transition: transform 200ms/,
    );
    expect(bloco(css, "html[data-perfil='calmo'] .ze .z-olhos")).toBe('transition: none;');
    expect(bloco(css, "html[data-perfil='calmo'] .ze .z-bloom")).toBe('transition: none;');
  });

  it('com movimento reduzido o brilho não assenta', () => {
    const reduzido = bloco(css, '@media (prefers-reduced-motion: reduce)');
    expect(reduzido).toContain('.ze .z-bloom { transition: none; }');
  });

  it('em cores forçadas somem o brilho, as faixas, o miolo, as bochechas e os halos; o traço usa o texto do sistema', () => {
    const forcadas = bloco(css, '@media (forced-colors: active)');
    expect(forcadas).toContain(
      '.ze .z-bloom, .ze .z-banda, .ze .z-miolo, .ze .z-bochechas, .ze .z-oh, .ze .z-fh { display: none; }',
    );
    expect(forcadas).toContain(
      '.ze .z-linha, .ze .z-haste, .ze .z-pupila { stroke: CanvasText; forced-color-adjust: none; }',
    );
    expect(forcadas).toContain('.ze .z-fp { fill: CanvasText; forced-color-adjust: none; }');
  });
});
