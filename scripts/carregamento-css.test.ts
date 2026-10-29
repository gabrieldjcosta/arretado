import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(
  path.join(import.meta.dirname, '..', 'public', 'carregamento.css'),
  'utf8',
);
const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');

// A tela de carregamento (D-D10, Apêndice F do contrato do Zé) mora em `public/carregamento.css`, fora do
// pacote. O vitest devolve vazio para um `.css` importado com `?raw`, então o arquivo é lido daqui.

describe('public/carregamento.css', () => {
  it('não tem arquivo nem pedido de rede: a CSP (style-src self) e o precache não deixam', () => {
    expect(semComentarios).not.toMatch(/@import/);
    expect(semComentarios).not.toMatch(/url\(/);
  });

  it('nenhuma animação repete sem fim: tudo acaba em cerca de 1 min (F2, regra 2)', () => {
    expect(semComentarios).not.toMatch(/infinite/);
  });

  it('as animações do Zé só existem com o movimento permitido (F2, regra 3)', () => {
    const permitido = semComentarios.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(permitido).toBeGreaterThan(0);
    // Fora desse bloco só entram a entrada e os textos, que o movimento reduzido também mostra.
    const antes = semComentarios.slice(0, permitido);
    const declaracoes = [...antes.matchAll(/(?<![-\w])animation:([^;]*);/g)].map((m) => m[1] ?? '');
    const nomes = declaracoes.flatMap((d) => d.match(/carr-[a-z-]+/g) ?? []);
    expect(nomes.length).toBeGreaterThan(0);
    for (const nome of nomes) expect(['carr-entra', 'carr-texto', 'carr-some']).toContain(nome);
  });
});
