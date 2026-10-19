// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { lerTemas } from '../scripts/contraste.mjs';

// O que a plataforma lê do site (P7): ícone do app, favicon, manifest, theme-color e viewport. Nada
// disso passa pela interface; um arquivo faltando ou uma cor fora do lugar só aparece no aparelho.
const RAIZ = path.join(import.meta.dirname, '..');
const ler = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo));
const texto = (arquivo: string) => ler(arquivo).toString('utf8');

const { claro } = lerTemas();
/** Um token de estilos.css no tema claro (as paletas dos dois mundos ficam nesse bloco). */
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
  it('é o chão de cada tema, --papel e --n-noite (src/apresentacao/cor-da-barra.ts)', () => {
    const fonte = texto('src/apresentacao/cor-da-barra.ts');
    const cores = /claro: '(#[0-9a-f]{6})', escuro: '(#[0-9a-f]{6})'/.exec(fonte)?.slice(1);
    expect(cores).toEqual([token('papel'), token('n-noite')]);
  });

  it('o index.html traz uma meta por tema, nas mesmas cores', () => {
    const html = texto('index.html');
    expect(html).toContain(
      `<meta name="theme-color" content="${token('papel')}" media="(prefers-color-scheme: light)" />`,
    );
    expect(html).toContain(
      `<meta name="theme-color" content="${token('n-noite')}" media="(prefers-color-scheme: dark)" />`,
    );
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

  it('usa o papel do tema claro na abertura (o escuro troca a meta do index.html)', () => {
    expect(manifesto.theme_color).toBe(token('papel'));
    expect(manifesto.background_color).toBe(token('papel'));
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

  it('o SVG usa o vidro da caneta de estilos.css (rode o script se mudarem)', () => {
    const svg = texto('public/icone.svg');
    // As cinco cores do vidro e o miolo, que ainda vêm de estilos.css (provisórios até a Q4).
    for (const nome of [
      'caneta-0',
      'caneta-1',
      'caneta-2',
      'caneta-3',
      'caneta-4',
      'caneta-miolo',
    ]) {
      expect(svg, nome).toContain(token(nome));
    }
  });

  it('o ícone segue com a areia e o halo da D-D7, até a Q4 refazê-lo na D-D9', () => {
    // Estas duas cores saíram de estilos.css (o chão agora é o --papel e o halo da ponta, o
    // --ponto-halo): ficam aqui como estão no scripts/icones-app.mjs. A Q4 (caneta de vidro nova,
    // ícone sobre o papel) troca as duas e este teste passa a comparar com os tokens.
    const svg = texto('public/icone.svg');
    expect(svg, 'areia da D-D7').toContain('#f1e6d3');
    expect(svg, 'halo da D-D7').toContain('#7df3e1');
  });
});
