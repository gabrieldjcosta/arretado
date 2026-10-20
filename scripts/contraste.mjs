// Razão de contraste WCAG dos pares de tokens de `src/apresentacao/estilos.css`, nos dois temas (os
// dois mundos da D-D9: o dia "Tinta e marca-texto" e a noite "Noite de mandacaru").
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
  /** @type {Record<string, string>} */
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

/**
 * [primeiro plano, fundo, mínimo]. 4,5 = texto; 3 = traço, ícone ou contorno (WCAG 1.4.11). `mundo`
 * ('dia' ou 'noite') escolhe os pares do halo do ponto de luz, que são diferentes em cada mundo.
 */
export function pares(mundo = 'dia') {
  const p = [];
  for (const f of FUNDOS) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['link', f, 4.5]);
  }
  for (const f of SUPERFICIES) {
    p.push(
      ['titulo', f, 4.5],
      ['perigo', f, 4.5],
      ['sucesso', f, 4.5],
      // A luz do mundo (tinta de dia, luz à noite) e tudo o que é apelido dela.
      ['luz', f, 3],
      ['lugar', f, 3],
      ['foco', f, 3],
      ['estrela', f, 3],
      ['cacto', f, 3],
      ['andamento', f, 3],
      // O contorno do controle (campo e botão secundário) sai do fundo com 3:1 (WCAG 1.4.11).
      ['borda-campo', f, 3],
      ['borda-botao', f, 3],
      // O botão primário sai do papel e da folha sem borda.
      ['acao', f, 3],
      // O marcado (caixa, rádio, botão ligado) é a luz cheia.
      ['selecionado-fundo', f, 3],
      // O ponto de luz e a Estrela: o contorno na luz do mundo é o que os separa do fundo.
      ['ponto-contorno', f, 3],
      ['estrela-contorno', f, 3],
      // O traço de seleção em volta do que acabou de ser escolhido: tinta de dia, luz à noite.
      ['fio-selecao', f, 3],
      ...DESTAQUES.map((d) => [d, f, 3]),
    );
  }
  // O halo do ponto de luz (a lima do dia, o âmbar da noite). De dia ele é a marca-texto atrás do
  // ponto de tinta: sozinho no papel dá 1,07:1 e não precisa (é decoração), então o par é o ponto sobre
  // o halo. À noite o próprio ponto é âmbar e se separa da noite e da serra.
  if (mundo === 'dia') p.push(['ponto-luz', 'ponto-halo', 3]);
  else for (const f of SUPERFICIES) p.push(['ponto-halo', f, 3]);
  // A caneta de vidro e o quadro do cacto (Q4): o aro e o furo de tinta da caneta e o aro do cacto se
  // separam do fundo com 3:1. O vidro em si (claro de dia, a 14% à noite) e o chão do quadro são
  // decoração, como nas pranchas, e ficam de fora. A esfera da ponta se lê sobre o halo de dia; à
  // noite o halo âmbar se separa da noite.
  for (const f of SUPERFICIES) {
    p.push(['pen-rim', f, 3], ['pen-tinta', f, 3], ['pen-tinta2', f, 3], ['quadro-aro', f, 3]);
  }
  if (mundo === 'dia') p.push(['pen-esfera', 'pen-halo', 3]);
  else for (const f of SUPERFICIES) p.push(['pen-halo', f, 3]);
  p.push(
    ['sucesso', 'superficie-2', 4.5],
    // O trilho da barra de progresso é a superfície 2.
    ['andamento', 'superficie-2', 3],
    ['borda-forte', 'superficie', 3],
  );
  // Palco do modo foco: a penumbra da página e a luz do cartão.
  for (const f of ['penumbra', 'luz-do-cartao']) {
    p.push(['texto', f, 4.5], ['texto-atenuado', f, 4.5], ['link', f, 4.5]);
  }
  p.push(
    ['perigo-texto', 'perigo', 4.5],
    ['aviso-texto', 'aviso-fundo', 4.5],
    // Botão primário: texto branco na tinta; à noite, o texto da noite na luz (D-D9). O hover também.
    ['acao-texto', 'acao', 4.5],
    ['acao-texto', 'acao-hover', 4.5],
    ['bloco-acao-texto', 'bloco-acao', 4.5],
    ['bloco-acao', 'bloco-fundo', 3],
    // A folha do Agora: o texto, o atenuado e o anel de foco próprio.
    ['bloco-texto', 'bloco-fundo', 4.5],
    ['bloco-atenuado', 'bloco-fundo', 4.5],
    ['bloco-foco', 'bloco-fundo', 3],
    // O botão secundário e o chip (D-D9, Q3): o atenuado e o perigo sobre o fundo do controle (a folha
    // de dia, a serra 2 à noite; o texto sobre ele está mais abaixo, na casca da Q2). O contorno (3:1) é
    // medido sobre o chão e a folha, acima: à noite, sobre a serra 2, ele cai a 2,7:1, e quem identifica
    // o botão é o rótulo.
    ['texto-atenuado', 'fundo-controle', 4.5],
    ['perigo', 'fundo-controle', 4.5],
    // "Onde estou" da estrutura da norma (provisório até a Q7): o texto sobre o fundo da seção atual.
    ['atual-texto', 'atual-fundo', 4.5],
    // A estrutura da norma (P4): o nome da seção, atenuado, sobre o fundo de "onde estou".
    ['texto-atenuado', 'atual-fundo', 4.5],
    ['selecionado-texto', 'selecionado-fundo', 4.5],
    ['texto', 'tinta-lugar', 4.5],
    ['texto-atenuado', 'tinta-lugar', 4.5],
    // A casca (D-D9, Q2): o rótulo da aba atual é a luz do mundo, em texto de 13 a 15 px sobre o chão;
    // o "+" do título é o texto sobre o fundo do controle; o ponto do lockup (a tinta de dia, o âmbar
    // à noite) fica sobre o chão do cabeçalho.
    ['luz', 'fundo', 4.5],
    ['texto', 'fundo-controle', 4.5],
    ['marca-ponto', 'fundo', 3],
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

/** O mundo de um tema: fundo claro é o dia, fundo escuro é a noite. */
function mundoDe(tema) {
  return luminancia(resolver(tema, tema.fundo)) > 0.5 ? 'dia' : 'noite';
}

/** Resultado de cada par num tema, mais as camadas compostas (régua, modo foco, pares da paleta). */
export function medir(tema, mundo = mundoDe(tema)) {
  const cor = (n) => {
    if (!(n in tema)) throw new Error(`token ausente: ${n}`);
    return resolver(tema, tema[n]);
  };
  const linhas = pares(mundo).map(([fg, bg, minimo]) => {
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

  // O anel do ponto do Dia que ainda não foi feito (a tinta 2 de dia, o texto 2 à noite): contorno de
  // 3:1 sobre o fundo e sobre a superfície, onde os pontos podem ficar. Composto sobre cada fundo, para
  // valer também se o token voltar a ter transparência.
  for (const f of SUPERFICIES) {
    juntar('ponto-apagado', f, 3, razao(sobre(cor('ponto-apagado'), cor(f)), cor(f)));
  }

  // D-D9: os pares do contrato, com os valores fixos da paleta de cada mundo (valem nos dois temas,
  // porque as duas paletas ficam no mesmo bloco). O filete (dia) e a borda (noite) são decoração e
  // ficam de fora: 1,22:1 e 1,85:1 no chão, de propósito. A linha da folha de dia é a `linha`, medida
  // abaixo com 3:1; a da noite é a borda, decoração. Folha e chão: 1,06:1 de dia, 1,10:1 à noite.
  const par = (fg, bg, minimo) => juntar(fg, bg, minimo, razao(cor(fg), cor(bg)));
  const branco = { r: 255, g: 255, b: 255, a: 1 };
  // Dia: tinta e tinta 2 sobre o papel e a folha; contorno do controle e linha com 3:1.
  for (const f of ['papel', 'folha']) {
    par('tinta', f, 4.5);
    par('tinta-2', f, 4.5);
    par('contorno', f, 3);
    par('linha', f, 3);
  }
  // O botão do dia (branco na tinta) e o ponto de tinta dentro do halo de lima.
  juntar('branco', 'tinta', 4.5, razao(branco, cor('tinta')));
  par('tinta', 'marca', 3);
  // Noite: texto e texto 2 sobre a noite e a serra; a linha do controle (3:1 na noite e na serra; na
  // serra 2 ela cai a 2,7:1, então não é contorno de controle sobre a serra 2); o âmbar do "onde parei".
  for (const f of ['n-noite', 'n-serra']) {
    par('n-texto', f, 4.5);
    par('n-texto-2', f, 4.5);
    par('n-linha', f, 3);
    par('n-ambar', f, 3);
    par('n-vidro', f, 3);
  }
  // O botão da noite (o texto da noite na luz).
  par('n-noite', 'n-luz', 4.5);
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
