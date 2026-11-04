// Gera o CSS do Arretado novo (o Fio) a partir do mockup que o Gabriel aprovou
// (docs/design/fio/mockup-aprovado.html). O mockup é a fonte: a cara do app é ELE, não uma leitura dele.
//
// O que a troca faz, e só isto (para a regra do mockup valer literalmente dentro do app):
//   - classes ganham o prefixo `m-` (`.acao` vira `.m-acao`), ids também, e as propriedades
//     personalizadas ganham `--m-` (`--ponto` vira `--m-ponto`), para nada colidir com o CSS do resto do app;
//   - `:root` vira `.m-fio` (a raiz do Arretado novo) e `:root[data-mundo="dia"]` vira `.m-fio[data-mundo="dia"]`;
//   - `.leve` (a classe que o mockup põe na página, o <html>, em aparelho fraco) vira `.m-fio.m-leve`: quem a leva no app é a raiz;
//   - seletor que começa por elemento (`button`, `h1`, `*`, `[hidden]`) fica dentro de `.m-fio`;
//   - `html`/`body` (a página do protótipo), `.controles` e `.nota` (a barra e a nota do protótipo) não entram.
// Desvio do mockup NUNCA se faz aqui nem no arquivo gerado: vai em `ajustes.css`, com o motivo ao lado.
//
// Uso: `node scripts/fio-mockup-css.mjs` regrava o arquivo; `--check` falha se ele não bate com o mockup.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ORIGEM = 'docs/design/fio/mockup-aprovado.html';
export const DESTINO = 'src/apresentacao/fio/mockup/mockup.css';

/** Seletores do protótipo que não existem no app: a página, a barra de controles e a nota de rodapé. */
const NAO_ENTRAM = [/^html\b/, /^body\b/, /^\.controles\b/, /^\.nota\b/];

/** O CSS do mockup: o `<style>` que abre com o comentário do conceito. */
export function extrairCss(html) {
  const blocos = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const css = blocos.find((b) => b.includes('Conceito: tudo é fio'));
  if (!css) throw new Error('o mockup não tem o bloco de CSS esperado');
  return css;
}

/** Divide `texto` nas vírgulas de fora de parênteses e colchetes. */
function dividirVirgulas(texto) {
  const partes = [];
  let fundo = 0;
  let atual = '';
  for (const c of texto) {
    if (c === '(' || c === '[') fundo += 1;
    if (c === ')' || c === ']') fundo -= 1;
    if (c === ',' && fundo === 0) {
      partes.push(atual);
      atual = '';
    } else atual += c;
  }
  partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean);
}

/** Lê as regras (e os @media, recursivamente) de um trecho de CSS sem comentários. */
function lerRegras(css) {
  const nos = [];
  let i = 0;
  while (i < css.length) {
    const abre = css.indexOf('{', i);
    if (abre < 0) break;
    const cabeca = css.slice(i, abre).trim();
    let fundo = 1;
    let j = abre + 1;
    for (; j < css.length && fundo > 0; j += 1) {
      if (css[j] === '{') fundo += 1;
      else if (css[j] === '}') fundo -= 1;
    }
    const corpo = css.slice(abre + 1, j - 1);
    if (cabeca.startsWith('@')) nos.push({ arroba: cabeca, filhos: lerRegras(corpo) });
    else nos.push({ seletor: cabeca, corpo });
    i = j;
  }
  return nos;
}

/** `.acao:hover` vira `.m-acao:hover`; um seletor que não pode existir no app devolve `null`. */
export function trocarSeletor(seletor) {
  const s = seletor.trim();
  if (NAO_ENTRAM.some((re) => re.test(s))) return null;
  // :root é a raiz do Arretado novo, e a raiz é ancestral de tudo (como no protótipo). O mesmo vale para `.leve`, que o
  // mockup põe no <html> em aparelho fraco: no app a raiz do Fio leva `m-leve`.
  const daRaiz = /^:root(?![\w-])/.test(s);
  const daLeve = /^\.leve(?![\w-])/.test(s);
  let r = s.replace(/^:root(?![\w-])/, '.m-fio').replace(/^\.leve(?![\w-])/, '');
  // Classes e ids ganham o prefixo (não mexe no que está entre colchetes: `[data-mundo="dia"]`).
  r = r.replace(
    /(\[[^\]]*\])|\.([A-Za-z_][\w-]*)|#([A-Za-z_][\w-]*)/g,
    (todo, colchete, cl, id) => {
      if (colchete) return colchete;
      if (cl) return cl === 'm-fio' ? '.m-fio' : `.m-${cl}`;
      return `#m-${id}`;
    },
  );
  // TODA regra fica dentro da raiz e ganha um `.m-fio` a mais (uma classe de especificidade, para todas por igual:
  // a ordem entre as regras do mockup não muda). Assim o CSS global do app (`button:disabled`, `button:active`...)
  // não passa por cima do que o mockup declara, e o do mockup não vaza para o resto do app.
  if (daLeve) return `.m-fio.m-leve${r}`;
  return daRaiz ? `.m-fio${r}` : `.m-fio ${r}`;
}

/** As propriedades personalizadas, os ids de filtro e nada mais mudam de nome dentro do corpo. */
export function trocarCorpo(corpo) {
  return corpo
    .replace(/--([A-Za-z0-9][\w-]*)/g, '--m-$1')
    .replace(/url\(#([\w-]+)\)/g, 'url(#m-$1)');
}

function escrever(nos, recuo = '') {
  let saida = '';
  for (const no of nos) {
    if (no.arroba) {
      const dentro = escrever(no.filhos, `${recuo}  `);
      if (dentro) saida += `${recuo}${no.arroba} {\n${dentro}${recuo}}\n`;
      continue;
    }
    const seletores = dividirVirgulas(no.seletor)
      .map(trocarSeletor)
      .filter((x) => x !== null);
    if (seletores.length === 0) continue;
    const decls = no.corpo
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => `${recuo}  ${trocarCorpo(d.replace(/\s+/g, ' '))};`);
    saida += `${recuo}${seletores.join(`,\n${recuo}`)} {\n${decls.join('\n')}\n${recuo}}\n`;
  }
  return saida;
}

/** O CSS gerado, inteiro, a partir do HTML do mockup. */
export function gerarCss(html) {
  const limpo = extrairCss(html).replace(/\/\*[\s\S]*?\*\//g, '');
  const cabeca =
    '/* GERADO de docs/design/fio/mockup-aprovado.html por scripts/fio-mockup-css.mjs. NÃO EDITE.\n' +
    '   O mockup que o Gabriel aprovou é a fonte da cara do Arretado novo; para mudar algo aqui, mude o\n' +
    '   mockup (a Marca) e rode `npm run fio:css`. Desvio do mockup vai em ajustes.css, com o motivo. */\n\n';
  return cabeca + escrever(lerRegras(limpo));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const css = gerarCss(readFileSync(ORIGEM, 'utf8'));
  if (process.argv.includes('--check')) {
    if (readFileSync(DESTINO, 'utf8') !== css) {
      console.error(`${DESTINO} não bate com ${ORIGEM}. Rode: npm run fio:css`);
      process.exit(1);
    }
    console.log('CSS do Fio bate com o mockup aprovado.');
  } else {
    writeFileSync(DESTINO, css);
    console.log(`${DESTINO}: ${String(css.length)} bytes`);
  }
}
