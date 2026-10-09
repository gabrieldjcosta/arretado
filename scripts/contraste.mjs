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

/** [primeiro plano, fundo, mínimo, descrição]. 4,5 = texto; 3 = traço ou ícone (WCAG 1.4.11). */
export function pares() {
  const p = [];
  for (const f of FUNDOS) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['depois', f, 4.5]);
  }
  for (const f of ['fundo', 'superficie']) {
    p.push(
      ['primaria', f, 4.5],
      ['perigo', f, 4.5],
      ['sucesso', f, 4.5],
      ['foco', f, 3],
      ['estrela', f, 3],
      ['progresso', f, 3],
      ...DESTAQUES.map((d) => [d, f, 3]),
    );
  }
  p.push(
    ['primaria-texto', 'primaria', 4.5],
    ['perigo-texto', 'perigo', 4.5],
    ['aviso-texto', 'aviso-fundo', 4.5],
    ['agora-texto', 'agora', 4.5],
  );
  for (const g of GRIFOS) p.push(['texto', g, 4.5], ['texto-atenuado', g, 4.5]);
  return p;
}

/** Resultado de cada par num tema; a camada translúcida do modo foco sai de `texto` por baixo. */
export function medir(tema) {
  const cor = (n) => {
    if (!(n in tema)) throw new Error(`token ausente: ${n}`);
    return rgb(tema[n]);
  };
  const linhas = pares().map(([fg, bg, minimo]) => {
    const valor = razao(cor(fg), cor(bg));
    return { fg, bg, minimo, valor, ok: valor >= minimo };
  });
  // Modo foco: o rótulo atenuado sobre a camada a 85%, com a letra do texto bem atrás.
  const camada = sobre(cor('superficie-translucida'), cor('texto'));
  const valor = razao(cor('texto-atenuado'), camada);
  linhas.push({
    fg: 'texto-atenuado',
    bg: 'superficie-translucida/texto',
    minimo: 4.5,
    valor,
    ok: valor >= 4.5,
  });
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
