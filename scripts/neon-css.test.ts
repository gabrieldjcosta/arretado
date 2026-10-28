import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bloco } from './css-bloco';

const lerCss = (...partes: string[]) =>
  readFileSync(
    path.join(import.meta.dirname, '..', 'src', 'apresentacao', 'componentes', ...partes),
    'utf8',
  );

const escrita = lerCss('escrita', 'escrita.css');
const traco = lerCss('traco', 'traco.css');
const quadro = lerCss('quadro', 'quadro.css');

// O jsdom não aplica o CSS: estas são as regras do néon suave (D-D10, N1) de que o repouso, o assentar,
// o Calmo e as cores forçadas dependem. Quem muda uma delas muda também o contrato (Apêndice E).

describe('o néon na escrita do nome', () => {
  it('a cópia larga tem 30 de largura, na cor piscina, e o grupo repousa no token do mundo', () => {
    expect(bloco(escrita, '.eb-neon')).toBe(
      'opacity: var(--neon-repouso); visibility: var(--neon-repouso-visibilidade);',
    );
    const letra = bloco(escrita, '.eb-neon .tn');
    expect(letra).toContain('fill: none;');
    expect(letra).toContain('stroke: var(--neon-cor);');
    expect(letra).toContain('stroke-width: 30;');
  });

  it('acende com a escrita (até 66%) e assenta no repouso entre 66% e 84%, uma vez', () => {
    expect(bloco(escrita, '@keyframes eb-neon')).toBe(
      '0% { opacity: var(--neon-aceso); visibility: visible; } ' +
        '66% { opacity: var(--neon-aceso); visibility: visible; animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1); } ' +
        '84% { opacity: var(--neon-repouso); visibility: visible; } ' +
        '100% { opacity: var(--neon-repouso); visibility: visible; }',
    );
  });

  it('em cores forçadas o brilho some', () => {
    expect(bloco(escrita, '@media (forced-colors: active)')).toBe('.eb-neon { display: none; }');
  });
});

describe('o néon no traço de seleção', () => {
  it('a cópia larga tem 7 de largura, na cor piscina, e acende no token do mundo', () => {
    const neon = bloco(traco, '.traco-sel .traco-neon');
    expect(neon).toContain('stroke: var(--neon-cor);');
    expect(neon).toContain('stroke-width: 7;');
    expect(neon).toContain('opacity: var(--neon-aceso);');
  });

  it('em cores forçadas o brilho some', () => {
    expect(bloco(traco, '@media (forced-colors: active)')).toBe(
      '.traco-sel .traco-neon { display: none; }',
    );
  });
});

describe('o néon no quadro do cacto', () => {
  it('repousa no token do mundo e assenta em 0,6 s', () => {
    const grupo = bloco(quadro, '.quadro-neon');
    expect(grupo).toContain('opacity: var(--neon-repouso);');
    expect(grupo).toContain('transition: opacity 600ms cubic-bezier(0.2, 0.7, 0.2, 1);');
  });

  it('acende na hora, enquanto a caneta anda', () => {
    expect(bloco(quadro, '.quadro-neon[data-acesa]')).toBe(
      'opacity: var(--neon-aceso); transition: none;',
    );
  });

  it('o gêmeo do núcleo tem 34 de largura, na cor piscina', () => {
    const fio = bloco(quadro, '.quadro-neon-fio');
    expect(fio).toContain('fill: none;');
    expect(fio).toContain('stroke: var(--neon-cor);');
    expect(fio).toContain('stroke-width: 34;');
  });

  it('com movimento reduzido não assenta, e em cores forçadas o brilho some', () => {
    expect(bloco(quadro, '@media (prefers-reduced-motion: reduce)')).toBe(
      '.quadro-neon { transition: none; }',
    );
    expect(bloco(quadro, '@media (forced-colors: active)')).toBe('.quadro-neon { display: none; }');
  });
});

describe('o néon, em todos os traços', () => {
  it('nunca repete e nunca usa sombra de CSS: a técnica é o filtro do SVG', () => {
    for (const css of [escrita, traco, quadro]) {
      const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(semComentarios).not.toMatch(/infinite/);
      expect(semComentarios).not.toMatch(/drop-shadow|box-shadow/);
    }
  });
});
