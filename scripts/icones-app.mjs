// Gera o ícone do app (D-D7, P7): a caneta de vidro sobre a areia, e o que dele sai para cada
// plataforma. Escreve em public/ (o Vite o copia para a raiz do site):
//   icone.svg               favicon vetorial, composição justa (a caneta quase enche o quadrado)
//   favicon.ico             16, 32 e 48 px, para quem não lê SVG (o Safari)
//   icone-192.png, icone-512.png   ícone "any": quadrado arredondado, cantos transparentes
//   icone-maskable-512.png  ícone "maskable": areia até a borda; a caneta cabe no círculo seguro
//   apple-touch-icon.png    180 px, areia até a borda (o iOS arredonda e não aceita transparência)
// Sem dependência nova: a caneta é o desenho de componentes/Caneta.tsx em cores fixas (o ícone não lê
// os tokens do tema) e o Chromium do Playwright rasteriza. Se uma cor da caneta ou da areia mudar em
// estilos.css, rode de novo; config/plataformas.test.ts acusa a diferença.
//
// Uso: node scripts/icones-app.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PUBLIC = path.join(import.meta.dirname, '..', 'public');

// Cores fixas da D-D7 (tema claro), congeladas até a Q4 da D-D9 (docs/planos/tinta-e-noite.md): a
// Q1 trocou os tokens (a areia e o vidro saíram de estilos.css) e deixou os ícones como estavam.
// `--caneta-0` a `--caneta-4` e `--caneta-miolo` seguem em estilos.css, provisórios até a Q4.
const AREIA = '#f1e6d3';
const VIDRO = ['#dffcff', '#9af0dc', '#5fcf8f', '#2b8f5e', '#17422f'];
const MIOLO = '#0f3b2b';
const BRANCO = '#ffffff';
const HALO = '#7df3e1'; // o halo da ponta (era --noite-vidro, token que saiu na Q1)

const LADO = 512;
const CORPO = 'M19 166 L21 28 A11 11 0 0 1 43 28 L45 166 L32 200 Z';
// A caneta de pé, ponta em (32, 200), girada 35° em torno dela (a pose encostada). Depois de girada, o
// retângulo que a contém tem o centro aqui; é ele que vai para o meio do quadrado.
const CENTRO_DA_CANETA = [86.83, 124.05];

/** A caneta de Caneta.tsx, no tema claro. `id` separa o gradiente e o filtro de outro desenho na página. */
function caneta(id) {
  const traco = (d, largura) =>
    `<path d="${d}" fill="none" stroke="url(#${id}v)" stroke-width="${largura}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const brilho = (d, largura, opacidade) =>
    `<path d="${d}" fill="none" stroke="${BRANCO}" stroke-width="${largura}" stroke-linecap="round" opacity="${opacidade}"/>`;
  return [
    `<defs>`,
    `<linearGradient id="${id}v" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="200">`,
    ...[0, 0.28, 0.55, 0.8, 1].map(
      (deslocamento, i) => `<stop offset="${deslocamento}" stop-color="${VIDRO[i]}"/>`,
    ),
    `</linearGradient>`,
    `<filter id="${id}h" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>`,
    `</defs>`,
    `<path d="${CORPO}" fill="url(#${id}v)"/>`,
    traco('M27 112 H12 V76', 13),
    traco('M37 132 H52 V100', 13),
    `<path d="M35 126 L39 166 L32 198 L31 166 Z" fill="${MIOLO}" opacity="0.22"/>`,
    `<path d="${CORPO}" fill="none" stroke="${BRANCO}" stroke-width="1.3" opacity="0.7"/>`,
    brilho('M27 36 V138', 2.6, 0.8),
    brilho('M9 82 V112 M49 106 V128', 2.2, 0.72),
    `<circle cx="30" cy="25" r="2.4" fill="${BRANCO}"/>`,
    `<circle cx="10" cy="76" r="2" fill="${BRANCO}"/>`,
    `<circle cx="50" cy="100" r="2" fill="${BRANCO}"/>`,
    `<circle cx="32" cy="200" r="7" fill="${HALO}" opacity="0.85" filter="url(#${id}h)"/>`,
    `<circle cx="32" cy="200" r="3" fill="${BRANCO}"/>`,
  ].join('');
}

/**
 * Um quadrado de 512: areia, com cantos arredondados (`raio`) ou até a borda (`raio` 0), e a caneta
 * na `escala` dada, no meio. A maskable e a do iOS usam escala 1,95: a caneta inteira, com o halo,
 * cabe no círculo de 40% da borda, a zona segura que a plataforma garante depois de recortar.
 */
function icone({ raio, escala }) {
  const [cx, cy] = CENTRO_DA_CANETA;
  const meio = LADO / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}">`,
    `<rect width="${LADO}" height="${LADO}" rx="${raio}" fill="${AREIA}"/>`,
    `<g transform="translate(${meio} ${meio}) scale(${escala}) translate(${-cx} ${-cy}) rotate(35 32 200)">`,
    caneta('c'),
    `</g>`,
    `</svg>`,
    '',
  ].join('');
}

const JUSTO = icone({ raio: 112, escala: 2.45 });
const ARREDONDADO = icone({ raio: 112, escala: 1.95 });
const ATE_A_BORDA = icone({ raio: 0, escala: 1.95 });

/** PNG do SVG no tamanho pedido; os cantos que o desenho não cobre ficam transparentes. */
async function rasterizar(pagina, svg, tamanho) {
  await pagina.setViewportSize({ width: tamanho, height: tamanho });
  await pagina.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${tamanho}px;height:${tamanho}px}</style>${svg}`,
  );
  return pagina.screenshot({ omitBackground: true, type: 'png' });
}

/** Um .ico só com PNGs (o formato aceita desde o Vista): cabeçalho, uma entrada por tamanho, os PNGs. */
function ico(imagens) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(1, 2); // tipo: ícone
  cabecalho.writeUInt16LE(imagens.length, 4);
  let deslocamento = cabecalho.length + 16 * imagens.length;
  const entradas = imagens.map(({ tamanho, png }) => {
    const entrada = Buffer.alloc(16);
    entrada[0] = tamanho;
    entrada[1] = tamanho;
    entrada.writeUInt16LE(1, 4); // planos
    entrada.writeUInt16LE(32, 6); // bits por pixel
    entrada.writeUInt32LE(png.length, 8);
    entrada.writeUInt32LE(deslocamento, 12);
    deslocamento += png.length;
    return entrada;
  });
  return Buffer.concat([cabecalho, ...entradas, ...imagens.map(({ png }) => png)]);
}

const navegador = await chromium.launch();
try {
  const pagina = await navegador.newPage({ deviceScaleFactor: 1 });
  const png = (svg, tamanho) => rasterizar(pagina, svg, tamanho);
  const escrever = (nome, conteudo) => writeFile(path.join(PUBLIC, nome), conteudo);

  await mkdir(PUBLIC, { recursive: true });
  await escrever('icone.svg', JUSTO);
  // Um de cada vez: os três dividem a mesma página, e o tamanho da janela é o do último que pediu.
  const imagensDoIco = [];
  for (const tamanho of [16, 32, 48])
    imagensDoIco.push({ tamanho, png: await png(JUSTO, tamanho) });
  await escrever('favicon.ico', ico(imagensDoIco));
  await escrever('icone-192.png', await png(ARREDONDADO, 192));
  await escrever('icone-512.png', await png(ARREDONDADO, 512));
  await escrever('icone-maskable-512.png', await png(ATE_A_BORDA, 512));
  await escrever('apple-touch-icon.png', await png(ATE_A_BORDA, 180));
} finally {
  await navegador.close();
}
console.log('Ícones gravados em public/.');
