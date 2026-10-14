// Razão de contraste WCAG dos pares de tokens de `src/apresentacao/estilos.css`, nos dois temas.
// Sem dependência. Uso: `node scripts/contraste.mjs [--tudo]` (sai com 1 se algum par reprovar).
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CSS = path.join(import.meta.dirname, '..', 'src', 'apresentacao', 'estilos.css');

/** Corpo do primeiro bloco que começa em `abertura` (com chaves aninhadas contadas). */
function bloco(css, abertura) {
  const i = css.indexOf(abertura);
  if (i < 0) throw new Error(`bloco não encontrado: ${abertura}`);
  const ini = css.indexOf('{', i) + 1;
  let prof = 1;
  let j = ini;
  while (prof > 0 && j < css.length) {
    if (css[j] === '{') prof++;
    else if (css[j] === '}') prof--;
    j++;
  }
  return css.slice(ini, j - 1);
}

function declaracoes(corpo) {
  const t = {};
  for (const m of corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) t[m[1].slice(2)] = m[2].trim();
  return t;
}

/** Os três blocos de valores de tema do arquivo. */
export function lerTemas(css = readFileSync(CSS, 'utf8')) {
  const claro = declaracoes(bloco(css, ':root {'));
  const escuroSistema = declaracoes(
    bloco(bloco(css, '@media (prefers-color-scheme: dark)'), ':root:not('),
  );
  const escuroManual = declaracoes(bloco(css, ":root[data-tema='escuro']"));
  return { claro, escuroSistema, escuroManual };
}

function rgb(valor) {
  const hex = /^#([0-9a-f]{6})$/i.exec(valor);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const f = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)%\s*)?\)$/.exec(valor);
  if (f) return { r: +f[1], g: +f[2], b: +f[3], a: f[4] === undefined ? 1 : +f[4] / 100 };
  throw new Error(`cor não reconhecida: ${valor}`);
}

const sobre = (c, fundo) => ({
  r: c.r * c.a + fundo.r * (1 - c.a),
  g: c.g * c.a + fundo.g * (1 - c.a),
  b: c.b * c.a + fundo.b * (1 - c.a),
  a: 1,
});

function luminancia({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function razao(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const FUNDOS = ['fundo', 'superficie', 'superficie-2'];
const GRIFOS = ['grifo-1', 'grifo-2', 'grifo-3'];
const DESTAQUES = ['destaque-prazo', 'destaque-condicao', 'destaque-absoluto', 'destaque-pena'];
const TONS = ['cacto', 'caramelo', 'ceu', 'anil', 'ameixa', 'turquesa'];

/** [primeiro plano, fundo, mínimo]. 4,5 = texto; 3 = traço, ícone ou contorno (WCAG 1.4.11). */
export function pares() {
  const p = [];
  for (const f of FUNDOS) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['link', f, 4.5]);
  }
  for (const f of ['fundo', 'superficie']) {
    p.push(
      ['cacto-texto', f, 4.5],
      ['perigo', f, 4.5],
      ['sucesso', f, 4.5],
      ['foco', f, 3],
      ['estrela', f, 3],
      ['cacto', f, 3],
      ['borda-campo', f, 3],
      ...DESTAQUES.map((d) => [d, f, 3]),
      ...TONS.map((t) => [`tom-${t}`, f, 3]),
    );
  }
  // O verde-cacto também desenha o contorno do item selecionado dentro do trilho das abas.
  p.push(['cacto', 'superficie-2', 3]);
  // Palco do modo foco: a penumbra da página e a luz do cartão.
  for (const f of ['penumbra', 'luz-do-cartao']) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['link', f, 4.5]);
  }
  p.push(
    ['perigo-texto', 'perigo', 4.5],
    ['aviso-texto', 'aviso-fundo', 4.5],
    ['acao-texto', 'acao', 4.5],
    // Bloco-herói: o texto, o atenuado e o anel de foco próprio (o global não passa no verde).
    ['bloco-texto', 'bloco-fundo', 4.5],
    ['bloco-atenuado', 'bloco-fundo', 4.5],
    ['bloco-foco', 'bloco-fundo', 3],
    ['selecionado-texto', 'selecionado-fundo', 4.5],
    ['realce-texto', 'realce-fundo', 4.5],
    ['texto', 'realce-fundo', 4.5],
    ...TONS.map((t) => ['tom-icone', `tom-${t}`, 4.5]),
  );
  for (const g of GRIFOS) p.push(['texto', g, 4.5], ['texto-atenuado', g, 4.5]);
  return p;
}

/** Mistura `a` (com `pct` %) sobre `base`, como `color-mix(in srgb, a pct%, base)`. */
const misturar = (a, pct, base) => ({
  r: a.r * (pct / 100) + base.r * (1 - pct / 100),
  g: a.g * (pct / 100) + base.g * (1 - pct / 100),
  b: a.b * (pct / 100) + base.b * (1 - pct / 100),
  a: 1,
});

/** Resultado de cada par num tema, mais as camadas compostas (vidro, tinta, modo foco). */
export function medir(tema) {
  const cor = (n) => {
    if (!(n in tema)) throw new Error(`token ausente: ${n}`);
    return rgb(tema[n]);
  };
  const linhas = pares().map(([fg, bg, minimo]) => {
    const valor = razao(cor(fg), cor(bg));
    return { fg, bg, minimo, valor, ok: valor >= minimo };
  });
  const juntar = (fg, bg, minimo, valor) =>
    linhas.push({ fg, bg, minimo, valor, ok: valor >= minimo });

  // Modo foco: o rótulo atenuado sobre a camada a 85%, com a letra do texto bem atrás.
  const camada = sobre(cor('superficie-translucida'), cor('texto'));
  juntar(
    'texto-atenuado',
    'superficie-translucida/texto',
    4.5,
    razao(cor('texto-atenuado'), camada),
  );

  // Botão primário em vidro: o preenchimento a 90% deixa o fundo passar; o pior fundo é o mais
  // escuro (o bloco-herói e a penumbra no claro), e o texto continua sólido.
  const acao90 = { ...cor('acao'), a: 0.9 };
  for (const f of ['bloco-fundo', 'penumbra', 'fundo', 'superficie']) {
    juntar(
      'acao-texto',
      `acao a 90% sobre ${f}`,
      4.5,
      razao(cor('acao-texto'), sobre(acao90, cor(f))),
    );
  }

  // Vidro secundário (tinta a 6% ou 7%): texto e atenuado sobre cada fundo; no bloco-herói, a
  // película creme a 12% sobre o verde.
  for (const f of FUNDOS) {
    const vidro = sobre(cor('vidro'), cor(f));
    juntar('texto', `vidro sobre ${f}`, 4.5, razao(cor('texto'), vidro));
    juntar('texto-atenuado', `vidro sobre ${f}`, 4.5, razao(cor('texto-atenuado'), vidro));
  }
  const noBloco = sobre(cor('vidro-no-bloco'), cor('bloco-fundo'));
  juntar(
    'bloco-texto',
    'vidro-no-bloco sobre bloco-fundo',
    4.5,
    razao(cor('bloco-texto'), noBloco),
  );
  juntar(
    'bloco-atenuado',
    'vidro-no-bloco sobre bloco-fundo',
    4.5,
    razao(cor('bloco-atenuado'), noBloco),
  );

  // Tinta do cacto (callout "Frase correta", ícone de lista, linha selecionada): texto, atenuado e
  // verde-texto sobre a mistura, na superfície e no fundo.
  const pctCacto = Number(/(\d+)%/.exec(tema['tinta-cacto'])?.[1]);
  for (const f of ['superficie', 'fundo']) {
    const tinta = misturar(cor('cacto'), pctCacto, cor(f));
    for (const fg of ['texto', 'texto-atenuado', 'cacto-texto']) {
      juntar(fg, `tinta-cacto sobre ${f}`, 4.5, razao(cor(fg), tinta));
    }
  }

  // Seis tons de matéria: o texto do tom sobre a tinta dele (esfera a --tom-tinta, na superfície
  // e no fundo).
  const pctTom = Number.parseFloat(tema['tom-tinta']);
  for (const t of TONS) {
    for (const f of ['superficie', 'fundo']) {
      const tinta = misturar(cor(`tom-${t}`), pctTom, cor(f));
      juntar(`tom-${t}-texto`, `tinta do tom sobre ${f}`, 4.5, razao(cor(`tom-${t}-texto`), tinta));
    }
  }
  return linhas;
}

export function reprovados() {
  const { claro, escuroSistema, escuroManual } = lerTemas();
  const resultado = [];
  const escuro = { ...claro, ...escuroManual };
  for (const [nome, tema] of [
    ['claro', claro],
    ['escuro', escuro],
  ]) {
    for (const l of medir(tema)) resultado.push({ tema: nome, ...l });
  }
  return { resultado, escuroSistema, escuroManual };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { resultado } = reprovados();
  const tudo = process.argv.includes('--tudo');
  let falhas = 0;
  for (const l of resultado) {
    if (!l.ok) falhas++;
    if (tudo || !l.ok) {
      console.log(
        `${l.ok ? 'ok ' : 'FALHA'} ${l.tema.padEnd(6)} ${l.fg} / ${l.bg}: ${l.valor.toFixed(2)} (mín. ${l.minimo})`,
      );
    }
  }
  console.log(falhas ? `${falhas} par(es) reprovado(s)` : 'contraste: todos os pares passam');
  process.exitCode = falhas ? 1 : 0;
}
