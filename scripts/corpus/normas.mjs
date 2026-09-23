// Corpus de normas reais para testar o estruturador da F2 (atividades 7.1 e 7.2).
// Texto de lei é domínio público (Lei 9.610/98, art. 8º, IV): as páginas ficam no repositório,
// byte a byte como a fonte as entregou, com charset, data e hash no manifesto. Ao lado de cada
// página ficam os derivados: o colar dela no Chromium (`*.colado.html` e `*.colado.txt`, 7.2) e o
// gabarito (`*.gabarito.json`, 7.3).
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { TextDecoder } from 'node:util';

/**
 * Identificação honesta do cliente. O Planalto derruba a conexão (ECONNRESET) com o
 * User-Agent padrão do Node, mas aceita qualquer um iniciado por `Mozilla/5.0`.
 */
export const USER_AGENT = 'Mozilla/5.0 (compatible; arretado-corpus/1.0; estudo pessoal)';

export const NOME_MANIFESTO = 'manifesto.json';

const DESCRICAO =
  'Páginas oficiais, byte a byte como a fonte as entregou, e o colar de cada uma no Chromium, ' +
  'para os testes do estruturador (F2). Gerado por scripts/corpus-normas.mjs e ' +
  'scripts/corpus-colar.mjs; não editar à mão.';

/** @param {string} id */
export const nomeColadoHtml = (id) => `${id}.colado.html`;
/** @param {string} id */
export const nomeColadoTexto = (id) => `${id}.colado.txt`;
/** @param {string} id */
export const nomeGabarito = (id) => `${id}.gabarito.json`;

/** Abaixo disso a resposta é página de erro, não norma. */
const TAMANHO_MINIMO = 20_000;

/**
 * @typedef {object} NormaDoCorpus
 * @property {string} id Nome do arquivo (sem extensão) e chave no manifesto.
 * @property {string} titulo
 * @property {'portao' | 'apoio' | 'estresse'} papel `portao` = critério de ≥ 95% da F2.
 * @property {'todas-as-redacoes' | 'compilado'} variante No Planalto, a página simples traz
 *   as redações anteriores tachadas; a "compilado" traz só o texto vigente.
 * @property {string} url
 * @property {string[]} marcadores Trechos (minúsculas, espaço simples) que só aparecem se a
 *   página for a norma certa **e** estiver decodificada com o charset certo.
 */

/** @type {readonly NormaDoCorpus[]} */
export const NORMAS = [
  {
    id: 'lep',
    titulo: 'Lei nº 7.210/1984 — Lei de Execução Penal',
    papel: 'portao',
    variante: 'todas-as-redacoes',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
    marcadores: ['lei de execução penal', 'art. 1º'],
  },
  {
    id: 'lep-compilado',
    titulo: 'Lei nº 7.210/1984 — Lei de Execução Penal (compilado)',
    papel: 'apoio',
    variante: 'compilado',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l7210compilado.htm',
    marcadores: ['lei de execução penal', 'art. 1º'],
  },
  {
    id: 'cp',
    titulo: 'Decreto-Lei nº 2.848/1940 — Código Penal',
    papel: 'portao',
    variante: 'todas-as-redacoes',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm',
    marcadores: ['código penal', 'anterioridade da lei'],
  },
  {
    id: 'cp-compilado',
    titulo: 'Decreto-Lei nº 2.848/1940 — Código Penal (compilado)',
    papel: 'apoio',
    variante: 'compilado',
    url: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
    marcadores: ['código penal', 'anterioridade da lei'],
  },
  {
    id: 'lc80',
    titulo: 'Lei Complementar nº 80/1994 — Lei Orgânica da Defensoria Pública',
    papel: 'apoio',
    variante: 'todas-as-redacoes',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp80.htm',
    marcadores: ['defensoria pública da união', 'organiza a defensoria'],
  },
  {
    id: 'lc-sp-988',
    titulo: 'Lei Complementar paulista nº 988/2006 — Defensoria Pública do Estado de São Paulo',
    papel: 'apoio',
    variante: 'todas-as-redacoes',
    url: 'https://www.al.sp.gov.br/repositorio/legislacao/lei.complementar/2006/lei.complementar-988-09.01.2006.html',
    // A ALESP escreve o ordinal com sinal de grau ("Artigo 1°", "N° 988").
    marcadores: ['organiza a defensoria pública do estado', 'artigo 1°'],
  },
  {
    id: 'cf',
    titulo: 'Constituição da República Federativa do Brasil de 1988',
    papel: 'estresse',
    variante: 'todas-as-redacoes',
    url: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
    marcadores: ['constituição da república federativa do brasil', 'ato das disposições'],
  },
];

/**
 * @typedef {'bom' | 'cabecalho' | 'meta' | 'utf8-valido' | 'padrao-windows-1252'} OrigemCharset
 */

/**
 * Charset da página, na ordem: BOM → cabeçalho HTTP → `<meta>` → UTF-8 válido → windows-1252.
 * O Planalto não declara charset em lugar nenhum e grava em windows-1252; a ALESP declara UTF-8.
 * @param {Uint8Array} bytes
 * @param {string | null | undefined} contentType
 * @returns {{ charset: string, origem: OrigemCharset }}
 */
export function detectarCharset(bytes, contentType) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { charset: 'utf-8', origem: 'bom' };
  }
  const doCabecalho = rotuloSuportado(
    /charset\s*=\s*["']?([\w:.-]+)/i.exec(contentType ?? '')?.[1],
  );
  if (doCabecalho) return { charset: doCabecalho, origem: 'cabecalho' };
  const inicio = new TextDecoder('windows-1252').decode(bytes.subarray(0, 16_384));
  const daMeta = rotuloSuportado(/<meta[^>]+charset\s*=\s*["']?\s*([\w:.-]+)/i.exec(inicio)?.[1]);
  if (daMeta) return { charset: daMeta, origem: 'meta' };
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { charset: 'utf-8', origem: 'utf8-valido' };
  } catch {
    return { charset: 'windows-1252', origem: 'padrao-windows-1252' };
  }
}

/**
 * Nome canônico do charset (como o `TextDecoder` o entende), ou `undefined` se desconhecido.
 * @param {string | undefined} rotulo
 * @returns {string | undefined}
 */
function rotuloSuportado(rotulo) {
  if (!rotulo) return undefined;
  try {
    return new TextDecoder(rotulo.trim().toLowerCase()).encoding;
  } catch {
    return undefined;
  }
}

/**
 * @param {Uint8Array} bytes
 * @param {string} charset
 * @returns {string}
 */
export function decodificar(bytes, charset) {
  return new TextDecoder(charset).decode(bytes);
}

/** @param {Uint8Array} bytes */
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Hash do conteúdo sem os elementos `<script>`. As duas fontes injetam um script diferente a
 * cada requisição (Planalto: `f5_cspm` do firewall F5, depois do `</html>`; ALESP: agente do
 * Dynatrace com ids aleatórios), então o hash dos bytes muda sem a norma mudar. É este hash que
 * decide se a fonte foi alterada. Seguro em qualquer charset: `<script` e `</script>` são ASCII,
 * e bytes de sequências multibyte do UTF-8 nunca coincidem com ASCII.
 * @param {Uint8Array} bytes
 */
export function sha256Conteudo(bytes) {
  const semScripts = Buffer.from(bytes)
    .toString('latin1')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
  return sha256Hex(Buffer.from(semScripts, 'latin1'));
}

const ENTIDADES = /** @type {Record<string, string>} */ ({
  nbsp: ' ',
  amp: '&',
  quot: '"',
  lt: '<',
  gt: '>',
  ordm: 'º',
  ordf: 'ª',
  sect: '§',
  deg: '°',
  aacute: 'á',
  agrave: 'à',
  acirc: 'â',
  atilde: 'ã',
  eacute: 'é',
  ecirc: 'ê',
  iacute: 'í',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  uacute: 'ú',
  ccedil: 'ç',
  Aacute: 'Á',
  Atilde: 'Ã',
  Eacute: 'É',
  Ecirc: 'Ê',
  Iacute: 'Í',
  Oacute: 'Ó',
  Otilde: 'Õ',
  Uacute: 'Ú',
  Ccedil: 'Ç',
});

/**
 * Texto visível aproximado, só para conferir marcadores: sem scripts, estilos nem tags,
 * entidades comuns decodificadas, espaços colapsados e em minúsculas.
 * @param {string} html
 * @returns {string}
 */
export function textoParaConferencia(html) {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => caractere(parseInt(String(h), 16)))
    .replace(/&#(\d+);/g, (_, d) => caractere(Number(d)))
    .replace(/&([a-z]+);/gi, (m, nome) => ENTIDADES[String(nome)] ?? m)
    .replace(/[\s\u00a0]+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

/**
 * Entidade numérica → caractere; fora do Unicode vira espaço (o navegador mostraria U+FFFD).
 * @param {number} codigo
 */
function caractere(codigo) {
  return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : ' ';
}

/**
 * Página "todas as redações" tem ao menos isso de tachados; "compilado", menos.
 * No corpus de 23/09/2026: todas as redações de 89 (LEP) a 1.357 (CP); compiladas 0 e 6.
 */
export const LIMIAR_TACHADOS = 20;

/**
 * Elementos tachados com conteúdo: `<strike>`, `<del>`, estilo `line-through` e `<s>` que não
 * seja só ordinal. No Planalto o `<s>` é decorativo (`<s>º</s>`); na ALESP é a marca real de
 * redação revogada. Serve para conferir a variante declarada da página.
 * @param {string} html
 * @returns {number}
 */
export function contarTachados(html) {
  const semScripts = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
  const strike = (semScripts.match(/<(strike|del)\b/gi) ?? []).length;
  const estilo = (semScripts.match(/line-through/gi) ?? []).length;
  const s = [...semScripts.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s\s*>/gi)].filter((m) => {
    const conteudo = textoParaConferencia(m[1] ?? '').trim();
    return conteudo.length > 1 && !/^[ºª°]$/.test(conteudo);
  }).length;
  return strike + estilo + s;
}

/**
 * Confere que os bytes são a norma esperada, decodificada com o charset certo, e na variante
 * declarada (com ou sem as redações anteriores tachadas).
 * @param {NormaDoCorpus} norma
 * @param {Uint8Array} bytes
 * @param {string} charset
 * @returns {string[]} problemas encontrados (vazio = ok)
 */
export function conferirConteudo(norma, bytes, charset) {
  /** @type {string[]} */
  const problemas = [];
  if (bytes.length < TAMANHO_MINIMO) {
    problemas.push(`${norma.id}: só ${String(bytes.length)} bytes — provável página de erro`);
  }
  const html = decodificar(bytes, charset);
  if (html.includes('\uFFFD')) {
    problemas.push(`${norma.id}: caractere de substituição (U+FFFD) — charset ${charset} errado?`);
  }
  const texto = textoParaConferencia(html);
  for (const marcador of norma.marcadores) {
    if (!texto.includes(marcador)) {
      problemas.push(`${norma.id}: marcador "${marcador}" ausente — página ou charset errados`);
    }
  }
  const tachados = contarTachados(html);
  if (norma.variante === 'todas-as-redacoes' && tachados < LIMIAR_TACHADOS) {
    problemas.push(
      `${norma.id}: só ${String(tachados)} tachados — não parece a página com todas as redações`,
    );
  }
  if (norma.variante === 'compilado' && tachados >= LIMIAR_TACHADOS) {
    problemas.push(`${norma.id}: ${String(tachados)} tachados — não parece a página compilada`);
  }
  return problemas;
}

/**
 * @typedef {object} EntradaManifesto
 * @property {string} id
 * @property {string} titulo
 * @property {NormaDoCorpus['papel']} papel
 * @property {NormaDoCorpus['variante']} variante
 * @property {string} url
 * @property {string} urlFinal Depois de redirecionamentos.
 * @property {string} arquivo
 * @property {string} charset
 * @property {OrigemCharset} origemCharset
 * @property {number} bytes
 * @property {string} sha256 Dos bytes exatos do arquivo (integridade).
 * @property {string} sha256Conteudo Sem `<script>` (decide se a fonte mudou; ver `sha256Conteudo`).
 * @property {string} obtidoEm Instante ISO 8601 UTC da última mudança de conteúdo.
 */

/**
 * @typedef {object} ArquivoDerivado
 * @property {string} arquivo
 * @property {number} bytes
 * @property {string} sha256
 */

/**
 * Colar da página no Chromium (7.2): o `text/html` e o `text/plain` que o evento `paste` entrega,
 * gravados em UTF-8. Amarrado à versão da página pelo `sha256Conteudo` dela: se a fonte mudar,
 * o colado fica desatualizado e a verificação pede nova captura.
 * @typedef {object} EntradaColado
 * @property {string} id O da norma de origem.
 * @property {string} sha256ConteudoOrigem `sha256Conteudo` da página no momento da captura.
 * @property {string} navegador Ex.: `chromium 141.0.7390.37`.
 * @property {string} plataforma `process.platform` da captura (a serialização pode variar).
 * @property {string} capturadoEm Instante ISO 8601 UTC da última mudança da captura.
 * @property {ArquivoDerivado} html
 * @property {ArquivoDerivado} texto
 */

/**
 * @typedef {object} Manifesto
 * @property {1} versao
 * @property {string} descricao
 * @property {EntradaManifesto[]} normas
 * @property {EntradaColado[]} [colados]
 */

/** @returns {Manifesto} */
export function manifestoVazio() {
  return { versao: 1, descricao: DESCRICAO, normas: [], colados: [] };
}

/**
 * Nova entrada, ou a anterior intacta se o conteúdo não mudou (rodar de novo não gera diff;
 * o arquivo antigo, com o script volátil da primeira captura, é mantido).
 * @param {EntradaManifesto | undefined} anterior
 * @param {Omit<EntradaManifesto, 'obtidoEm'>} nova
 * @param {string} agora
 * @returns {{ entrada: EntradaManifesto, mudou: boolean }}
 */
export function atualizarEntrada(anterior, nova, agora) {
  const mesmaFonte =
    anterior !== undefined &&
    anterior.sha256Conteudo === nova.sha256Conteudo &&
    anterior.url === nova.url &&
    anterior.urlFinal === nova.urlFinal &&
    anterior.charset === nova.charset &&
    anterior.titulo === nova.titulo &&
    anterior.papel === nova.papel &&
    anterior.variante === nova.variante;
  if (mesmaFonte) return { entrada: anterior, mudou: false };
  return { entrada: { ...nova, obtidoEm: agora }, mudou: true };
}

/**
 * Nova captura, ou a anterior intacta se a origem e os bytes capturados não mudaram.
 * @param {EntradaColado | undefined} anterior
 * @param {Omit<EntradaColado, 'capturadoEm'>} nova
 * @param {string} agora
 * @returns {{ entrada: EntradaColado, mudou: boolean }}
 */
export function atualizarColado(anterior, nova, agora) {
  const mesma =
    anterior !== undefined &&
    anterior.sha256ConteudoOrigem === nova.sha256ConteudoOrigem &&
    anterior.html.arquivo === nova.html.arquivo &&
    anterior.html.sha256 === nova.html.sha256 &&
    anterior.texto.arquivo === nova.texto.arquivo &&
    anterior.texto.sha256 === nova.texto.sha256;
  if (mesma) return { entrada: anterior, mudou: false };
  return { entrada: { ...nova, capturadoEm: agora }, mudou: true };
}

/**
 * Manifesto em JSON estável (ordem do catálogo; LF no fim).
 * @param {Manifesto} manifesto
 * @returns {string}
 */
export function serializarManifesto(manifesto) {
  const ordem = new Map(NORMAS.map((n, i) => [n.id, i]));
  /** @param {{ id: string }} a @param {{ id: string }} b */
  const peloCatalogo = (a, b) => (ordem.get(a.id) ?? Infinity) - (ordem.get(b.id) ?? Infinity);
  const normas = [...manifesto.normas].sort(peloCatalogo);
  const colados = [...(manifesto.colados ?? [])].sort(peloCatalogo);
  return `${JSON.stringify({ versao: 1, descricao: DESCRICAO, normas, colados }, null, 2)}\n`;
}

/**
 * Arquivos da pasta que o manifesto não explica: nem página, nem colado registrado, nem
 * gabarito de norma do catálogo.
 * @param {readonly string[]} nomes
 * @param {Manifesto} manifesto
 * @returns {string[]}
 */
export function arquivosForaDoManifesto(nomes, manifesto) {
  const conhecidos = new Set([
    NOME_MANIFESTO,
    ...manifesto.normas.map((e) => e.arquivo),
    ...(manifesto.colados ?? []).flatMap((c) => [c.html.arquivo, c.texto.arquivo]),
    ...NORMAS.map((n) => nomeGabarito(n.id)),
  ]);
  return nomes.filter((nome) => !conhecidos.has(nome));
}

/**
 * O que o `npm run corpus` completo apaga: só sobras dos formatos que os scripts gravam
 * (`.html`, `.txt`). Colados registrados e gabaritos ficam.
 * @param {readonly string[]} nomes
 * @param {Manifesto} manifesto
 * @returns {string[]}
 */
export function arquivosParaApagar(nomes, manifesto) {
  return arquivosForaDoManifesto(nomes, manifesto).filter((nome) => /\.(html|txt)$/.test(nome));
}

/**
 * Fração mínima do texto visível da página que o colado precisa ter. No corpus de 23/09/2026 o
 * colado tem de 99,8% a 100%; bem menos que isso é seleção cortada (p. ex. no `</html>` que o
 * CP e a CF trazem logo no início, com a lei inteira depois).
 */
export const LIMIAR_COMPLETUDE = 0.98;

/**
 * Confere a captura do colar: norma certa e inteira nos dois formatos, sem caractere de
 * substituição (página servida com o charset errado) e sem tachado perdido — cada `<strike>`,
 * `<del>`, `line-through` e `<s>` com texto da página precisa chegar ao `text/html` colado,
 * senão o estruturador não acha as redações anteriores.
 * @param {NormaDoCorpus} norma
 * @param {{ html: string, texto: string }} colado
 * @param {string} htmlFonte A página de origem, já decodificada.
 * @returns {string[]} problemas (vazio = ok)
 */
export function conferirColado(norma, colado, htmlFonte) {
  /** @type {string[]} */
  const problemas = [];
  const rotulo = `${norma.id} (colado)`;
  const tamanhoDaPagina = textoParaConferencia(htmlFonte).trim().length;
  const textos = {
    html: textoParaConferencia(colado.html),
    texto: colado.texto.replace(/[\s\u00a0]+/g, ' ').toLocaleLowerCase('pt-BR'),
  };
  for (const [formato, texto] of Object.entries(textos)) {
    if (texto.trim() === '') {
      problemas.push(`${rotulo}: ${formato} vazio`);
      continue;
    }
    if (texto.includes('\uFFFD')) {
      problemas.push(
        `${rotulo}: caractere de substituição (U+FFFD) no ${formato} — charset errado ao servir?`,
      );
    }
    for (const marcador of norma.marcadores) {
      if (!texto.includes(marcador)) {
        problemas.push(`${rotulo}: marcador "${marcador}" ausente do ${formato}`);
      }
    }
    const fracao = texto.trim().length / tamanhoDaPagina;
    if (fracao < LIMIAR_COMPLETUDE) {
      problemas.push(
        `${rotulo}: o ${formato} tem só ${(fracao * 100).toFixed(1)}% do texto da página — ` +
          'seleção cortada?',
      );
    }
  }
  const naPagina = contarTachados(htmlFonte);
  const noColado = contarTachados(colado.html);
  if (noColado < naPagina) {
    problemas.push(
      `${rotulo}: ${String(noColado)} tachados, a página tem ${String(naPagina)} — ` +
        'o colar perdeu redações anteriores',
    );
  }
  return problemas;
}

/**
 * Lê o manifesto; ausente → vazio.
 * @param {string} diretorio
 * @returns {Promise<Manifesto>}
 */
export async function lerManifesto(diretorio) {
  try {
    return /** @type {Manifesto} */ (
      JSON.parse(await readFile(join(diretorio, NOME_MANIFESTO), 'utf8'))
    );
  } catch (excecao) {
    if (/** @type {NodeJS.ErrnoException} */ (excecao).code === 'ENOENT') return manifestoVazio();
    throw excecao;
  }
}

/**
 * Verificação sem rede: toda norma do catálogo tem entrada, arquivo e colado; tamanho, hash e
 * conteúdo batem com o manifesto; o colado é da versão atual da página. Usada pelo `npm test`
 * e por `--verificar`.
 * @param {string} diretorio
 * @returns {Promise<string[]>} problemas (vazio = corpus íntegro)
 */
export async function verificarCorpus(diretorio) {
  const manifesto = await lerManifesto(diretorio);
  /** @type {string[]} */
  const problemas = [];
  const porId = new Map(manifesto.normas.map((e) => [e.id, e]));
  const coladoPorId = new Map((manifesto.colados ?? []).map((c) => [c.id, c]));
  for (const norma of NORMAS) {
    const entrada = porId.get(norma.id);
    if (!entrada) {
      problemas.push(`${norma.id}: ausente do manifesto`);
      continue;
    }
    if (entrada.url !== norma.url) {
      problemas.push(`${norma.id}: URL do manifesto difere do catálogo — rode o script de novo`);
    }
    /** @type {Uint8Array} */
    let bytes;
    try {
      bytes = await readFile(join(diretorio, entrada.arquivo));
    } catch {
      problemas.push(`${norma.id}: arquivo ${entrada.arquivo} não encontrado`);
      continue;
    }
    if (bytes.length !== entrada.bytes) {
      problemas.push(
        `${norma.id}: ${String(bytes.length)} bytes no disco, ${String(entrada.bytes)} no manifesto ` +
          '(fim de linha convertido pelo git?)',
      );
    }
    if (sha256Hex(bytes) !== entrada.sha256) {
      problemas.push(`${norma.id}: hash difere do manifesto`);
    }
    if (sha256Conteudo(bytes) !== entrada.sha256Conteudo) {
      problemas.push(`${norma.id}: hash do conteúdo difere do manifesto`);
    }
    problemas.push(...conferirConteudo(norma, bytes, entrada.charset));
    const colado = coladoPorId.get(norma.id);
    if (!colado) {
      problemas.push(`${norma.id}: sem colado — rode npm run corpus:colar`);
      continue;
    }
    if (colado.sha256ConteudoOrigem !== entrada.sha256Conteudo) {
      problemas.push(
        `${norma.id}: colado capturado de outra versão da página — rode npm run corpus:colar`,
      );
      continue;
    }
    const conteudos = await lerColado(diretorio, colado, problemas);
    if (conteudos) {
      problemas.push(...conferirColado(norma, conteudos, decodificar(bytes, entrada.charset)));
    }
  }
  const conhecidos = new Set(NORMAS.map((n) => n.id));
  for (const entrada of manifesto.normas) {
    if (!conhecidos.has(entrada.id)) {
      problemas.push(`${entrada.id}: está no manifesto mas saiu do catálogo — rode npm run corpus`);
    }
  }
  for (const colado of manifesto.colados ?? []) {
    if (!conhecidos.has(colado.id)) {
      problemas.push(`${colado.id}: colado de norma fora do catálogo — rode npm run corpus`);
    }
  }
  for (const nome of arquivosForaDoManifesto(await readdir(diretorio), manifesto)) {
    problemas.push(`${nome}: arquivo fora do manifesto — rode npm run corpus`);
  }
  return problemas;
}

/**
 * Lê os dois arquivos do colado conferindo tamanho, hash e UTF-8; acrescenta os problemas.
 * @param {string} diretorio
 * @param {EntradaColado} colado
 * @param {string[]} problemas
 * @returns {Promise<{ html: string, texto: string } | undefined>} os textos, se ambos legíveis
 */
async function lerColado(diretorio, colado, problemas) {
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  /** @type {Partial<Record<'html' | 'texto', string>>} */
  const conteudos = {};
  for (const formato of /** @type {const} */ (['html', 'texto'])) {
    const { arquivo, bytes: esperado, sha256 } = colado[formato];
    /** @type {Uint8Array} */
    let bytes;
    try {
      bytes = await readFile(join(diretorio, arquivo));
    } catch {
      problemas.push(`${colado.id}: arquivo ${arquivo} não encontrado`);
      continue;
    }
    if (bytes.length !== esperado) {
      problemas.push(
        `${arquivo}: ${String(bytes.length)} bytes no disco, ${String(esperado)} no manifesto ` +
          '(fim de linha convertido pelo git?)',
      );
    }
    if (sha256Hex(bytes) !== sha256) problemas.push(`${arquivo}: hash difere do manifesto`);
    try {
      conteudos[formato] = utf8.decode(bytes);
    } catch {
      problemas.push(`${arquivo}: não é UTF-8 válido`);
    }
  }
  const { html, texto } = conteudos;
  return html !== undefined && texto !== undefined ? { html, texto } : undefined;
}

/**
 * O arquivo da entrada (página ou arquivo de colado) existe no disco e tem os bytes registrados?
 * @param {string} diretorio
 * @param {{ arquivo: string, sha256: string }} entrada
 * @returns {Promise<boolean>}
 */
export async function arquivoConfere(diretorio, entrada) {
  try {
    return sha256Hex(await readFile(join(diretorio, entrada.arquivo))) === entrada.sha256;
  } catch {
    return false;
  }
}
