// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { lerTemas } from '../scripts/contraste.mjs';

// O que a plataforma lê do site (P7): ícone do app, favicon, manifest, theme-color e viewport. Nada
// disso passa pela interface; um arquivo faltando ou uma cor fora do lugar só aparece no aparelho.
const RAIZ = path.join(import.meta.dirname, '..');
const ler = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo));
const texto = (arquivo: string) => ler(arquivo).toString('utf8');

const claro = lerTemas().claro as Record<string, string>;
/** Um token de estilos.css no tema claro (a paleta fica nesse bloco). */
function token(nome: string): string {
  const valor = claro[nome];
  if (valor === undefined) throw new Error(`token --${nome} não achado em estilos.css`);
  return valor;
}

interface Icone {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
const manifesto = JSON.parse(texto('public/manifest.webmanifest')) as {
  id: string;
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: Icone[];
};

/** Largura e altura do PNG, do cabeçalho IHDR; lança se não for um PNG. */
function tamanhoDoPng(png: Buffer): string {
  expect(png.subarray(0, 8).toString('hex'), 'assinatura PNG').toBe('89504e470d0a1a0a');
  return `${String(png.readUInt32BE(16))}x${String(png.readUInt32BE(20))}`;
}

describe('index.html', () => {
  const html = texto('index.html');

  it('estende a página até a borda, para as áreas seguras valerem (viewport-fit=cover)', () => {
    expect(html).toMatch(/<meta name="viewport"[^>]*viewport-fit=cover/);
  });

  it('liga favicon (SVG e ICO), ícone do iOS e manifest', () => {
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32" />');
    expect(html).toContain('<link rel="icon" href="/icone.svg" type="image/svg+xml" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });
});

describe('cor da barra', () => {
  it('é o chão de cada tema, --areia e --noite (src/apresentacao/cor-da-barra.ts)', () => {
    const fonte = texto('src/apresentacao/cor-da-barra.ts');
    const cores = /claro: '(#[0-9a-f]{6})', escuro: '(#[0-9a-f]{6})'/.exec(fonte)?.slice(1);
    expect(cores).toEqual([token('areia'), token('noite')]);
  });
});

describe('manifest', () => {
  it('abre o app na raiz, sozinho na janela, em português', () => {
    expect(manifesto).toMatchObject({
      name: 'Arretado',
      short_name: 'Arretado',
      lang: 'pt-BR',
      start_url: './',
      scope: './',
      display: 'standalone',
    });
    expect(manifesto.id).not.toBe('');
  });

  it('usa a areia do tema claro na abertura (o escuro troca a meta do index.html)', () => {
    expect(manifesto.theme_color).toBe(token('areia'));
    expect(manifesto.background_color).toBe(token('areia'));
  });

  it('declara ícones que existem, com o tamanho dito, e um maskable', () => {
    for (const { src, sizes, type } of manifesto.icons) {
      expect(type).toBe('image/png');
      expect(tamanhoDoPng(ler(`public/${src}`)), src).toBe(sizes);
    }
    const tamanhos = manifesto.icons.map((i) => i.sizes);
    expect(tamanhos).toContain('192x192');
    expect(tamanhos).toContain('512x512');
    expect(manifesto.icons.filter((i) => i.purpose === 'maskable')).toHaveLength(1);
  });
});

describe('ícones gerados (scripts/icones-app.mjs)', () => {
  it('o do iOS tem 180 px', () => {
    expect(tamanhoDoPng(ler('public/apple-touch-icon.png'))).toBe('180x180');
  });

  it('o favicon.ico leva PNGs de 16, 32 e 48 px', () => {
    const ico = ler('public/favicon.ico');
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3]);
    const entradas = [0, 1, 2].map((i) => {
      const e = 6 + 16 * i;
      const png = ico.subarray(
        ico.readUInt32LE(e + 12),
        ico.readUInt32LE(e + 12) + ico.readUInt32LE(e + 8),
      );
      return [ico[e], ico[e + 1], tamanhoDoPng(png)];
    });
    expect(entradas).toEqual([
      [16, 16, '16x16'],
      [32, 32, '32x32'],
      [48, 48, '48x48'],
    ]);
  });

  it('o SVG usa a areia e o vidro da caneta de estilos.css (rode o script se mudarem)', () => {
    const svg = texto('public/icone.svg');
    // A areia, as cinco cores do vidro, o miolo e o halo da ponta (--noite-vidro).
    const esperadas = [
      'areia',
      'caneta-0',
      'caneta-1',
      'caneta-2',
      'caneta-3',
      'caneta-4',
      'caneta-miolo',
      'noite-vidro',
    ];
    for (const nome of esperadas) expect(svg, nome).toContain(token(nome));
  });
});
