// Razão de contraste WCAG dos pares de tokens de `src/apresentacao/estilos.css`, nos dois temas.
// Sem dependência. Uso: `node scripts/contraste.mjs [--tudo]` (sai com 1 se algum par reprovar).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

const FUNDOS = ['fundo', 'superficie', 'superficie-2', 'quente'];
const SUPERFICIES = ['fundo', 'superficie'];
const GRIFOS = ['grifo-1', 'grifo-2', 'grifo-3'];
const DESTAQUES = ['destaque-prazo', 'destaque-condicao', 'destaque-absoluto', 'destaque-pena'];

/** [primeiro plano, fundo, mínimo]. 4,5 = texto; 3 = traço, ícone ou contorno (WCAG 1.4.11). */
export function pares() {
  const p = [];
  for (const f of FUNDOS) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['link', f, 4.5]);
  }
  for (const f of SUPERFICIES) {
    p.push(
      ['titulo', f, 4.5],
      ['perigo', f, 4.5],
      ['sucesso', f, 4.5],
      ['lugar', f, 3],
      ['foco', f, 3],
      ['estrela', f, 3],
      ['cacto', f, 3],
      ['andamento', f, 3],
      ['borda-campo', f, 3],
      // O botão de vidro sai da areia e da cal sem borda (D-D7).
      ['acao', f, 3],
      // O ponto de luz e a Estrela: o contorno na tinta é o que os separa do fundo.
      ['ponto-contorno', f, 3],
      ['estrela-contorno', f, 3],
      // O traço de seleção em volta do que acabou de ser escolhido: tinta de dia, luz à noite.
      ['fio-selecao', f, 3],
      ...DESTAQUES.map((d) => [d, f, 3]),
    );
  }
  p.push(
    ['sucesso', 'superficie-2', 4.5],
    // O trilho da barra de progresso é a superfície 2.
    ['andamento', 'superficie-2', 3],
    ['borda-forte', 'superficie', 3],
    // O caramelo é só o sol e o miolo das flores do quadro do cacto, sobre a cal (não sobre a areia).
    ['caramelo', 'superficie', 3],
  );
  // Palco do modo foco: a penumbra da página e a luz do cartão.
  for (const f of ['penumbra', 'luz-do-cartao']) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['link', f, 4.5]);
  }
  p.push(
    ['perigo-texto', 'perigo', 4.5],
    ['aviso-texto', 'aviso-fundo', 4.5],
    // Botão primário: vidro com texto branco; à noite, vidro claro com o texto da noite (D-D7).
    ['acao-texto', 'acao', 4.5],
    ['bloco-acao-texto', 'bloco-acao', 4.5],
    ['bloco-acao', 'bloco-fundo', 3],
    // A folha do Agora: o texto, o atenuado e o anel de foco próprio.
    ['bloco-texto', 'bloco-fundo', 4.5],
    ['bloco-atenuado', 'bloco-fundo', 4.5],
    ['bloco-foco', 'bloco-fundo', 3],
    // Onde estou (área e aba atuais, em cal) e o marcado (tinta cheia).
    ['atual-texto', 'atual-fundo', 4.5],
    // A estrutura da norma (P4): o nome da seção, atenuado, sobre a cal de "onde estou".
    ['texto-atenuado', 'atual-fundo', 4.5],
    ['selecionado-texto', 'selecionado-fundo', 4.5],
    ['selecionado-atenuado', 'selecionado-fundo', 4.5],
    ['texto', 'tinta-lugar', 4.5],
    ['texto-atenuado', 'tinta-lugar', 4.5],
  );
  for (const g of GRIFOS) p.push(['texto', g, 4.5], ['texto-atenuado', g, 4.5]);
  return p;
}

/** Resolve um valor de token (hex, rgb, var(--x), color-mix em srgb) para { r, g, b, a }. */
function resolver(tema, texto) {
  const t = texto.trim();
  const v = /^var\(--([\w-]+)\)$/.exec(t);
  if (v) {
    if (!(v[1] in tema)) throw new Error(`token ausente: ${v[1]}`);
    return resolver(tema, tema[v[1]]);
  }
  const m = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*(.+)\)$/.exec(t);
  if (m) return misturar(resolver(tema, m[1]), Number(m[2]), resolver(tema, m[3]));
  return rgb(t);
}

/** Mistura `a` (com `pct` %) sobre `base`, como `color-mix(in srgb, a pct%, base)`. */
const misturar = (a, pct, base) => ({
  r: a.r * (pct / 100) + base.r * (1 - pct / 100),
  g: a.g * (pct / 100) + base.g * (1 - pct / 100),
  b: a.b * (pct / 100) + base.b * (1 - pct / 100),
  a: 1,
});

/** Resultado de cada par num tema, mais as camadas compostas (régua, modo foco, texto branco). */
export function medir(tema) {
  const cor = (n) => {
    if (!(n in tema)) throw new Error(`token ausente: ${n}`);
    return resolver(tema, tema[n]);
  };
  const linhas = pares().map(([fg, bg, minimo]) => {
    const valor = razao(cor(fg), cor(bg));
    return { fg, bg, minimo, valor, ok: valor >= minimo };
  });
  const juntar = (fg, bg, minimo, valor) =>
    linhas.push({ fg, bg, minimo, valor, ok: valor >= minimo });

  // Modo foco: o rótulo atenuado sobre a camada a 90%, com a letra do texto bem atrás.
  const camada = sobre(cor('superficie-translucida'), cor('texto'));
  juntar(
    'texto-atenuado',
    'superficie-translucida/texto',
    4.5,
    razao(cor('texto-atenuado'), camada),
  );

  // Régua de leitura (--regua-fundo: tinta a 6%): texto e atenuado sobre ela,
  // na superfície e no fundo; os sublinhados dos destaques também passam por baixo dela.
  for (const f of SUPERFICIES) {
    const regua = sobre(cor('regua-fundo'), cor(f));
    juntar('texto', `regua-fundo sobre ${f}`, 4.5, razao(cor('texto'), regua));
    juntar('texto-atenuado', `regua-fundo sobre ${f}`, 4.5, razao(cor('texto-atenuado'), regua));
    juntar('regua-barra', `regua-fundo sobre ${f}`, 3, razao(cor('regua-barra'), regua));
    for (const d of DESTAQUES) juntar(d, `regua-fundo sobre ${f}`, 3, razao(cor(d), regua));
  }

  // O anel do ponto do Dia que ainda não foi feito (tinta a 55%): contorno de 3:1 sobre o fundo
  // e sobre a superfície, onde os pontos podem ficar.
  for (const f of SUPERFICIES) {
    juntar('ponto-apagado', f, 3, razao(sobre(cor('ponto-apagado'), cor(f)), cor(f)));
  }

  // D-D7: os pares do contrato da direção, com os valores fixos da paleta.
  const branco = { r: 255, g: 255, b: 255, a: 1 };
  juntar('tinta', 'areia', 4.5, razao(cor('tinta'), cor('areia')));
  juntar('branco', 'vidro', 4.5, razao(branco, cor('vidro')));
  juntar('noite-tinta', 'noite-folha', 4.5, razao(cor('noite-tinta'), cor('noite-folha')));
  juntar('noite', 'noite-vidro', 4.5, razao(cor('noite'), cor('noite-vidro')));
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
