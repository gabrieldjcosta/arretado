// Gera o ícone do app (D-D9, Q4): a caneta de vidro sobre o papel, e o que dele sai para cada
// plataforma. Escreve em public/ (o Vite o copia para a raiz do site):
//   icone.svg               favicon vetorial: a silhueta da caneta, que se lê em 16 px
//   favicon.ico             16, 32 e 48 px, para quem não lê SVG (o Safari); a mesma silhueta
//   icone-192.png, icone-512.png   ícone "any": quadrado arredondado, cantos transparentes
//   icone-maskable-512.png  ícone "maskable": papel até a borda; a caneta cabe no círculo seguro
//   apple-touch-icon.png    180 px, papel até a borda (o iOS arredonda e não aceita transparência)
// Sem dependência nova: a caneta é o desenho de componentes/Caneta.tsx em cores fixas do dia (o
// ícone não lê os tokens do tema) e o Chromium do Playwright rasteriza. O vidro claro some sobre o
// papel em 16 a 48 px, então o favicon é a silhueta cheia (tronco, braços e bico, em tinta) com a lima
// atrás da ponta; do 180 ao 512 é a caneta inteira, com o furo de tinta. Se uma cor ou a geometria da
// caneta mudar, rode de novo; config/plataformas.test.ts acusa a diferença.
//
// Uso: node scripts/icones-app.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PUBLIC = path.join(import.meta.dirname, '..', 'public');

// Cores fixas do dia (D-D9, tema claro): o papel, a tinta e a lima são os tokens `--papel`, `--tinta`
// e `--marca`; o vidro, o aro e o halo, os `--pen-*` do dia, de estilos.css.
const PAPEL = '#f6f8fb';
const TINTA = '#0f1c3a';
const TINTA_FUNDA = '#0a1428';
const VIDRO = '#edf0f6';
const VIDRO_2 = '#c7cedb';
const MARCA = '#eefa4b';
const BRANCO = '#ffffff';

const LADO = 512;
// A geometria é a de Caneta.tsx (120 × 270, ponta em (60, 262)); config/plataformas.test.ts confere.
const ARO = 5;
const TRONCO = 'M60 34 V184';
const BRACOS = 'M60 128 H42 A16 16 0 0 1 26 112 V82 M60 152 H78 A16 16 0 0 0 94 136 V108';
const FURO = 'M60 52 V186 M60 128 H42 A16 16 0 0 1 26 112 V92 M60 152 H78 A16 16 0 0 0 94 136 V118';
const CONE = 'M42 184 V186 C45 218 55 248 60 262 C65 248 75 218 78 186 V184 Z';
const CONE_CLARO = 'M48.48 184 V186 C50.4 218 56.8 248 60 262 C63.2 248 69.6 218 71.52 186 V184 Z';
const CONE_FURO = 'M54.6 186 V186 C55.5 218 58.5 248 60 258 C61.5 248 64.5 218 65.4 186 V186 Z';
const CONE_SOMBRA = 'M45.96 184 V186 C48.3 218 56.1 248 60 258 C63.9 248 71.7 218 74.04 186 V184 Z';

// A caneta de pé, girada 35° em torno da ponta (a pose encostada). Depois de girada, o centro do que
// se vê (a caneta, mais a lima da ponta), em relação à ponta, é este; vai para o meio do quadrado.
const CENTRO_DA_CANETA = [73, -101];
const CENTRO_DA_SILHUETA = [81, -112];

/** A caneta de Caneta.tsx, no dia. `id` separa filtros e máscara de outro desenho na página. */
function canetaDeVidro(id) {
  const tubo = (larguras, cone) =>
    `<path d="${TRONCO}" fill="none" stroke-width="${larguras[0]}"/><path d="${BRACOS}" fill="none" stroke-width="${larguras[1]}"/><path d="${cone}" stroke="none"/>`;
  const linhas = 'stroke-linecap="round" stroke-linejoin="round"';
  return [
    `<defs>`,
    `<filter id="${id}h" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="5"/></filter>`,
    `<filter id="${id}s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`,
    `<mask id="${id}m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="290"><g fill="none" ${linhas}>`,
    `<path d="${TRONCO}" stroke="#fff" stroke-width="${36 + ARO}"/><path d="${BRACOS}" stroke="#fff" stroke-width="${24 + ARO}"/>`,
    `<path d="${CONE}" fill="#fff" stroke="#fff" stroke-width="${ARO}"/>`,
    `<path d="${TRONCO}" stroke="#000" stroke-width="36"/><path d="${BRACOS}" stroke="#000" stroke-width="24"/>`,
    `<path d="${CONE}" fill="#000" stroke="none"/>`,
    `</g></mask>`,
    `</defs>`,
    `<g fill="${TINTA}" stroke="${TINTA}" opacity="0.16" filter="url(#${id}s)" transform="translate(4 5)" ${linhas}>${tubo([28, 28], CONE_SOMBRA)}</g>`,
    `<g opacity="0.9" ${linhas}>`,
    `<g fill="${VIDRO}" stroke="${VIDRO}">${tubo([36, 24], CONE)}</g>`,
    `<g fill="${VIDRO_2}" stroke="${VIDRO_2}">${tubo([23.04, 14.4], CONE_CLARO)}</g>`,
    `</g>`,
    `<rect x="-10" y="-10" width="140" height="290" fill="${TINTA_FUNDA}" mask="url(#${id}m)"/>`,
    `<path d="${FURO}" fill="none" stroke="${TINTA}" stroke-width="10.8" ${linhas}/>`,
    `<g fill="none" stroke="${BRANCO}" stroke-opacity="0.85" stroke-linecap="round">`,
    `<path d="M47.04 46 V186 C47.94 208 52.5 230 56 244" stroke-width="2.4"/><path d="M18.8 86 V106 M86.8 112 V130" stroke-width="2.1"/>`,
    `</g>`,
    `<path d="${CONE_FURO}" fill="${TINTA}"/>`,
    `<circle cx="60" cy="262" r="10" fill="${MARCA}" filter="url(#${id}h)"/>`,
    `<circle cx="60" cy="262" r="3.1" fill="${TINTA}"/>`,
    `<circle cx="60" cy="23" r="2.5" fill="${BRANCO}"/><circle cx="26" cy="73" r="2.2" fill="${BRANCO}"/><circle cx="94" cy="99" r="2.2" fill="${BRANCO}"/>`,
  ].join('');
}

/** A silhueta cheia para 16 a 48 px: a lima atrás da ponta, o tronco, os braços e o bico, em tinta. */
function silhueta() {
  const traco = (d, largura) =>
    `<path d="${d}" fill="none" stroke="${TINTA}" stroke-width="${largura}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return [
    `<circle cx="60" cy="262" r="24" fill="${MARCA}"/>`,
    traco('M60 34 V176', 40),
    traco('M60 128 H44 A18 18 0 0 1 26 110 V84 M60 152 H76 A18 18 0 0 0 94 134 V108', 26),
    `<path d="M40 190 H80 L60 262 Z" fill="${TINTA}"/>`,
  ].join('');
}

/**
 * Um quadrado de 512: papel, com cantos arredondados (`raio`) ou até a borda (`raio` 0), e o `desenho`
 * (a caneta de pé, com a ponta em (60, 262)) girado 35° e na `escala` dada, com o centro no meio. A
 * maskable e a do iOS usam escala menor: a caneta inteira, com a lima, cabe no círculo de 40% da
 * borda, a zona segura que a plataforma garante depois de recortar.
 */
function icone({ raio, escala, desenho, centro }) {
  const [cx, cy] = centro;
  const meio = LADO / 2;
  const ponta = [meio - cx * escala, meio - cy * escala].map((n) => n.toFixed(2)).join(' ');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}">`,
    `<rect width="${LADO}" height="${LADO}" rx="${raio}" fill="${PAPEL}"/>`,
    `<g transform="translate(${ponta}) scale(${escala}) rotate(35) translate(-60 -262)">`,
    desenho,
    `</g>`,
    `</svg>`,
    '',
  ].join('');
}

const JUSTO = icone({ raio: 112, escala: 1.9, desenho: silhueta(), centro: CENTRO_DA_SILHUETA });
const caneta = () => canetaDeVidro('c');
const ARREDONDADO = icone({ raio: 112, escala: 1.7, desenho: caneta(), centro: CENTRO_DA_CANETA });
const ATE_A_BORDA = icone({ raio: 0, escala: 1.4, desenho: caneta(), centro: CENTRO_DA_CANETA });

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
