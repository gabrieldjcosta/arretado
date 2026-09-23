// Arquivos derivados das páginas do corpus (F2): a captura do "colar da página" (atividade 7.2)
// e o gabarito conferido (7.3). Cada um fica amarrado ao `sha256Conteudo` da página de origem:
// se a fonte mudar (`npm run corpus`), o `npm test` acusa o derivado desatualizado.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  NORMAS,
  arquivoConfere,
  ehDerivado,
  lerManifesto,
  sha256Hex,
  textoParaConferencia,
} from './normas.mjs';

export const NOME_INDICE_COLADOS = 'colados.json';
export const SUFIXO_COLADO_HTML = '.colado.html';
export const SUFIXO_COLADO_TEXTO = '.colado.txt';
export const SUFIXO_GABARITO = '.gabarito.json';

/**
 * @typedef {object} ArquivoDerivado
 * @property {string} arquivo
 * @property {number} bytes
 * @property {string} sha256
 */

/**
 * @typedef {object} EntradaColado
 * @property {string} id Mesmo id da página no manifesto.
 * @property {string} origemSha256Conteudo `sha256Conteudo` da página capturada (a amarração).
 * @property {ArquivoDerivado} html `text/html` do evento `paste`, gravado em UTF-8.
 * @property {ArquivoDerivado} texto `text/plain` do mesmo evento (reserva do colar; 8.8).
 * @property {string} navegador Ex.: `chromium 141.0.7390.37`.
 * @property {string} plataforma `process.platform` de quem capturou (a serialização varia).
 * @property {string} capturadoEm Instante ISO 8601 UTC da última mudança da captura.
 */

/**
 * @typedef {object} IndiceColados
 * @property {1} versao
 * @property {string} descricao
 * @property {EntradaColado[]} colados
 */

/** @returns {IndiceColados} */
export function indiceVazio() {
  return {
    versao: 1,
    descricao:
      'Captura do "colar da página" no Chromium (selecionar tudo, copiar, colar), a partir dos ' +
      'bytes do corpus, sem rede. Gerado por scripts/corpus-colar.mjs; não editar à mão.',
    colados: [],
  };
}

/**
 * Lê o índice dos colados; ausente → vazio.
 * @param {string} diretorio
 * @returns {Promise<IndiceColados>}
 */
export async function lerColados(diretorio) {
  try {
    return /** @type {IndiceColados} */ (
      JSON.parse(await readFile(join(diretorio, NOME_INDICE_COLADOS), 'utf8'))
    );
  } catch (excecao) {
    if (/** @type {NodeJS.ErrnoException} */ (excecao).code === 'ENOENT') return indiceVazio();
    throw excecao;
  }
}

/**
 * Índice em JSON estável (ordem do catálogo; LF no fim).
 * @param {IndiceColados} indice
 * @returns {string}
 */
export function serializarColados(indice) {
  const ordem = new Map(NORMAS.map((n, i) => [n.id, i]));
  const colados = [...indice.colados].sort(
    (a, b) => (ordem.get(a.id) ?? Infinity) - (ordem.get(b.id) ?? Infinity),
  );
  return `${JSON.stringify({ ...indice, colados }, null, 2)}\n`;
}

/**
 * Nova entrada, ou a anterior intacta se a captura deu os mesmos bytes da mesma origem (rodar
 * de novo não gera diff, nem se só o navegador ou a plataforma mudaram).
 * @param {EntradaColado | undefined} anterior
 * @param {Omit<EntradaColado, 'capturadoEm'>} nova
 * @param {string} agora
 * @returns {{ entrada: EntradaColado, mudou: boolean }}
 */
export function atualizarColado(anterior, nova, agora) {
  const mesma =
    anterior !== undefined &&
    anterior.origemSha256Conteudo === nova.origemSha256Conteudo &&
    anterior.html.arquivo === nova.html.arquivo &&
    anterior.html.sha256 === nova.html.sha256 &&
    anterior.texto.arquivo === nova.texto.arquivo &&
    anterior.texto.sha256 === nova.texto.sha256;
  if (mesma) return { entrada: anterior, mudou: false };
  return { entrada: { ...nova, capturadoEm: agora }, mudou: true };
}

/**
 * Descreve um derivado para o índice.
 * @param {string} arquivo
 * @param {Uint8Array} bytes
 * @returns {ArquivoDerivado}
 */
export function descreverArquivo(arquivo, bytes) {
  return { arquivo, bytes: bytes.length, sha256: sha256Hex(bytes) };
}

/**
 * Confere o conteúdo capturado: é a norma certa (marcadores), sem U+FFFD (a página foi servida
 * com o charset certo) e no formato esperado de cada tipo.
 * @param {string} id
 * @param {string} html
 * @param {string} texto
 * @returns {string[]} problemas (vazio = ok)
 */
export function conferirCaptura(id, html, texto) {
  const norma = NORMAS.find((n) => n.id === id);
  if (!norma) return [`${id}: fora do catálogo`];
  /** @type {string[]} */
  const problemas = [];
  for (const [rotulo, conteudo] of /** @type {const} */ ([
    ['html', html],
    ['texto', texto],
  ])) {
    if (conteudo.length === 0) {
      problemas.push(`${id}: colado sem ${rotulo}`);
      continue;
    }
    if (conteudo.includes('\uFFFD')) {
      problemas.push(`${id}: caractere de substituição (U+FFFD) no ${rotulo} — charset errado?`);
    }
    const visivel = textoParaConferencia(conteudo);
    for (const marcador of norma.marcadores) {
      if (!visivel.includes(marcador)) {
        problemas.push(`${id}: marcador "${marcador}" ausente do ${rotulo} colado`);
      }
    }
  }
  if (html.length > 0 && !/<(p|div|table)\b/i.test(html)) {
    problemas.push(`${id}: o html colado não tem marcação — veio só texto?`);
  }
  return problemas;
}

/**
 * @param {string} diretorio
 * @param {ArquivoDerivado} descrito
 * @param {string} id
 * @returns {Promise<{ problemas: string[], conteudo: string | null }>}
 */
async function lerDerivado(diretorio, descrito, id) {
  /** @type {Uint8Array} */
  let bytes;
  try {
    bytes = await readFile(join(diretorio, descrito.arquivo));
  } catch {
    return { problemas: [`${id}: arquivo ${descrito.arquivo} não encontrado`], conteudo: null };
  }
  /** @type {string[]} */
  const problemas = [];
  if (bytes.length !== descrito.bytes) {
    problemas.push(
      `${id}: ${descrito.arquivo} com ${String(bytes.length)} bytes no disco, ` +
        `${String(descrito.bytes)} no índice (fim de linha convertido pelo git?)`,
    );
  }
  if (sha256Hex(bytes) !== descrito.sha256) {
    problemas.push(`${id}: hash de ${descrito.arquivo} difere do índice`);
  }
  try {
    return { problemas, conteudo: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { problemas: [...problemas, `${id}: ${descrito.arquivo} não é UTF-8`], conteudo: null };
  }
}

/**
 * Verificação sem rede dos derivados, usada pelo `npm test` e por `npm run corpus -- --verificar`:
 * - toda norma do catálogo tem colado, capturado da versão atual da página, com os bytes do
 *   índice e o conteúdo conferido;
 * - todo gabarito é de uma norma do catálogo e foi feito sobre a versão atual da página;
 * - nenhum derivado sobra na pasta nem no índice.
 * @param {string} diretorio
 * @returns {Promise<string[]>} problemas (vazio = derivados íntegros)
 */
export async function verificarDerivados(diretorio) {
  const manifesto = await lerManifesto(diretorio);
  const indice = await lerColados(diretorio);
  const paginas = new Map(manifesto.normas.map((e) => [e.id, e]));
  const colados = new Map(indice.colados.map((e) => [e.id, e]));
  /** @type {string[]} */
  const problemas = [];
  for (const norma of NORMAS) {
    const colado = colados.get(norma.id);
    if (!colado) {
      problemas.push(`${norma.id}: sem colado — rode npm run corpus:colar`);
      continue;
    }
    if (colado.origemSha256Conteudo !== paginas.get(norma.id)?.sha256Conteudo) {
      problemas.push(
        `${norma.id}: colado capturado de outra versão da página — rode npm run corpus:colar`,
      );
    }
    const html = await lerDerivado(diretorio, colado.html, norma.id);
    const texto = await lerDerivado(diretorio, colado.texto, norma.id);
    problemas.push(...html.problemas, ...texto.problemas);
    if (html.conteudo !== null && texto.conteudo !== null) {
      problemas.push(...conferirCaptura(norma.id, html.conteudo, texto.conteudo));
    }
  }
  const conhecidos = new Set(NORMAS.map((n) => n.id));
  for (const entrada of indice.colados) {
    if (!conhecidos.has(entrada.id)) {
      problemas.push(`${entrada.id}: colado de norma fora do catálogo — rode npm run corpus:colar`);
    }
  }
  const referenciados = new Set(indice.colados.flatMap((e) => [e.html.arquivo, e.texto.arquivo]));
  for (const nome of await readdir(diretorio)) {
    if (nome.endsWith(SUFIXO_GABARITO)) {
      problemas.push(...(await conferirGabarito(diretorio, nome, paginas)));
    } else if (ehDerivado(nome) && !referenciados.has(nome)) {
      problemas.push(`${nome}: colado fora do índice — rode npm run corpus:colar`);
    }
  }
  return problemas;
}

/**
 * Amarração do gabarito (7.3) à página e aos colados de onde ele saiu (o da norma e o da
 * compilada): o conteúdo em si é conferido pelo Gabriel e usado pela regressão da 8.9. Gabarito
 * nunca é apagado por script.
 * @param {string} diretorio
 * @param {string} nome
 * @param {Map<string, { sha256Conteudo: string }>} paginas
 * @returns {Promise<string[]>}
 */
async function conferirGabarito(diretorio, nome, paginas) {
  const id = nome.slice(0, -SUFIXO_GABARITO.length);
  const pagina = paginas.get(id);
  if (!pagina || !NORMAS.some((n) => n.id === id)) {
    return [`${nome}: gabarito de norma fora do catálogo`];
  }
  /** @type {unknown} */
  let gabarito;
  try {
    gabarito = JSON.parse(await readFile(join(diretorio, nome), 'utf8'));
  } catch {
    return [`${nome}: não é JSON válido`];
  }
  const origem =
    typeof gabarito === 'object' && gabarito !== null && 'origemSha256Conteudo' in gabarito
      ? gabarito.origemSha256Conteudo
      : undefined;
  if (origem !== pagina.sha256Conteudo) {
    return [`${nome}: feito sobre outra versão da página — refazer a conferência (7.3)`];
  }
  const colados =
    typeof gabarito === 'object' && gabarito !== null && 'origemSha256Colados' in gabarito
      ? /** @type {Record<string, unknown>} */ (gabarito.origemSha256Colados)
      : undefined;
  if (!colados || Object.keys(colados).length === 0) {
    return [`${nome}: sem origemSha256Colados — rode npm run corpus:gabarito`];
  }
  /** @type {string[]} */
  const problemas = [];
  for (const [arquivo, sha256] of Object.entries(colados)) {
    if (typeof sha256 !== 'string' || !(await arquivoConfere(diretorio, { arquivo, sha256 }))) {
      problemas.push(`${nome}: feito sobre outro ${arquivo} — rode npm run corpus:gabarito`);
    }
  }
  return problemas;
}
