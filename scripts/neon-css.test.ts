import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bloco } from './css-bloco';

const lerCss = (...partes: string[]) =>
  readFileSync(
    path.join(import.meta.dirname, '..', 'src', 'apresentacao', 'componentes', ...partes),
    'utf8',
  );

const traco = lerCss('traco', 'traco.css');

// O jsdom não aplica o CSS: estas são as regras do néon suave (D-D10, N1) de que o repouso, o assentar,
// o Calmo e as cores forçadas dependem. Quem muda uma delas muda também o contrato (Apêndice E).

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

describe('o néon, em todos os traços', () => {
  it('nunca repete e nunca usa sombra de CSS: a técnica é o filtro do SVG', () => {
    for (const css of [traco]) {
      const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(semComentarios).not.toMatch(/infinite/);
      expect(semComentarios).not.toMatch(/drop-shadow|box-shadow/);
    }
  });
});
