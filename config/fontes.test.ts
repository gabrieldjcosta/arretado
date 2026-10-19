// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// As fontes dos títulos (D-D9): Schibsted Grotesk de dia, Familjen Grotesk à noite, hospedadas no app
// (font-src 'self'), cada uma com a licença OFL ao lado, e pré-carregadas só no tema que as usa.
const RAIZ = path.join(import.meta.dirname, '..');
const FONTES = path.join(RAIZ, 'src', 'apresentacao', 'fontes');
const texto = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo), 'utf8');

const TITULOS = [
  {
    familia: 'Schibsted Grotesk',
    arquivo: 'SchibstedGrotesk-latin-400_900-normal.woff2',
    pesos: '400 900',
    licenca: 'SchibstedGrotesk-OFL.txt',
    copyright: /^Copyright 2023 The Schibsted-Grotesk Project Authors/,
    tema: 'light',
  },
  {
    familia: 'Familjen Grotesk',
    arquivo: 'FamiljenGrotesk-latin-400_700-normal.woff2',
    pesos: '400 700',
    licenca: 'FamiljenGrotesk-OFL.txt',
    copyright: /^Copyright 2021 The Familjen Grotesk Project Authors/,
    tema: 'dark',
  },
] as const;

describe('fontes dos títulos', () => {
  const css = texto('src/apresentacao/estilos.css');
  const html = texto('index.html');

  it.each(TITULOS)('$familia: @font-face variável, em swap, servido do próprio app', (t) => {
    const face = css.match(new RegExp(`@font-face \\{[^}]*font-family: '${t.familia}';[^}]*\\}`));
    expect(face, `sem @font-face de ${t.familia}`).not.toBeNull();
    expect(face?.[0]).toContain(`font-weight: ${t.pesos};`);
    expect(face?.[0]).toContain('font-display: swap;');
    expect(face?.[0]).toContain(`url('./fontes/${t.arquivo}') format('woff2-variations')`);
    expect(existsSync(path.join(FONTES, t.arquivo)), t.arquivo).toBe(true);
  });

  it.each(TITULOS)(
    '$familia: a licença OFL vem ao lado do arquivo, com o copyright da família',
    (t) => {
      const licenca = readFileSync(path.join(FONTES, t.licenca), 'utf8');
      expect(licenca).toMatch(t.copyright);
      expect(licenca).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007');
    },
  );

  it('toda fonte hospedada tem a sua licença e nada sobrou da Gabarito', () => {
    const arquivos = readdirSync(FONTES);
    const woff2 = arquivos.filter((a) => a.endsWith('.woff2'));
    expect(woff2.sort()).toEqual(TITULOS.map((t) => t.arquivo).sort());
    expect(arquivos.filter((a) => a.endsWith('.txt')).sort()).toEqual(
      TITULOS.map((t) => t.licenca).sort(),
    );
    expect(css).not.toMatch(/gabarito/i);
    expect(html).not.toMatch(/gabarito/i);
  });

  it.each(TITULOS)('$familia: pré-carregada só no tema que a usa (media do index.html)', (t) => {
    const link = html.match(
      new RegExp(`<link\\s+rel="preload"\\s+href="/src/apresentacao/fontes/${t.arquivo}"[^>]*>`),
    );
    expect(link, `sem preload de ${t.arquivo}`).not.toBeNull();
    expect(link?.[0]).toContain('as="font"');
    expect(link?.[0]).toContain('type="font/woff2"');
    expect(link?.[0]).toContain('crossorigin');
    expect(link?.[0]).toContain(`media="(prefers-color-scheme: ${t.tema})"`);
  });
});
