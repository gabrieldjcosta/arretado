// Busca dentro da norma (F2, 11.6; Parte 2 §10.6, Leitor). O Ctrl+F do navegador só acha o que está
// desenhado, e a lista do leitor é virtualizada: a busca é o caminho para o texto fora da tela.
// Duas buscas puras: por endereço ("112", "§ 2º do 112", "art. 5º, LXXIV"), que dá o endereço
// canônico (8.2–8.4) a procurar no índice `[normaId+endereco]`, e por texto, sem acento e sem caixa,
// sobre a `chaveDeCasamento` (8.1), com os offsets do texto exibido.
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';
import type { NormaAberta } from './leitor';
import { chaveDeCasamento } from './normalizacao';

// ---------------------------------------------------------------------------------------------
// Por endereço
// ---------------------------------------------------------------------------------------------

type Tipo = 'artigo' | 'paragrafo' | 'inciso' | 'alinea' | 'item';

/** Ordem na árvore (regra 6): o endereço vai do artigo ao item, qualquer que seja a ordem do texto. */
const DEGRAU: Record<Tipo, number> = { artigo: 0, paragrafo: 1, inciso: 2, alinea: 3, item: 4 };

interface Componente {
  tipo: Tipo;
  segmento: string;
}

/** Um pedaço sem a palavra do tipo ("112", "LXXIV", "b"): o tipo sai do contexto. */
interface Solto {
  tipo?: undefined;
  numero?: string;
  romano?: string;
  letra?: string;
}

const ROMANO = /^m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/u;
const ehRomano = (s: string) => s !== '' && ROMANO.test(s);

// Número de artigo, parágrafo ou item: "112", "1.000", "9o" (o ordinal já dobrado), "9-a", "359-m-a".
// O sufixo pode vir sem o traço ("9A").
const NUMERO = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)o?((?:\s*-\s*[a-z]|[a-z])*)`;
const ARTIGO = new RegExp(String.raw`^(?:art(?:igo)?s?\.?\s*)(?:${NUMERO}|(unico))$`, 'u');
const PARAGRAFO = new RegExp(String.raw`^(?:§+|par(?:agrafo)?\.?)\s*(?:${NUMERO}|(unico))$`, 'u');
const INCISO = /^inc(?:iso)?\.?\s*([ivxlcdm]+)((?:\s*-\s*[a-z])*)$/u;
const ALINEA = /^(?:al(?:inea)?\.?\s*)([a-z])((?:\s*-\s*[a-z])*)\)?$/u;
const ITEM = new RegExp(String.raw`^it(?:em)?\.?\s*${NUMERO}$`, 'u');
const SOLTO_NUMERO = new RegExp(String.raw`^${NUMERO}$`, 'u');
const SOLTO_ROMANO = /^([ivxlcdm]+)((?:\s*-\s*[a-z])*)$/u;
const SOLTO_LETRA = /^([a-z])((?:\s*-\s*[a-z])*)\)?$/u;
// Bloco com numeração própria (8.4): o ADCT da CF e as disposições transitórias (LC-SP 988).
const BLOCO: readonly [RegExp, string][] = [
  [/^(?:o\s+|no\s+)?adct$/u, 'adct'],
  [/^(?:as\s+)?disposicoes\s+(?:constitucionais\s+)?transitorias$/u, 'dt'],
];

const sufixo = (s: string | undefined) => (s ?? '').replace(/[\s-]/gu, '').toUpperCase();
const numero = (n: string) => n.replace(/\./gu, '');

/** Um pedaço já dobrado (`dobrar`) e aparado. `null`: não é endereço; `undefined`: ignorar. */
function lerPedaco(p: string): Componente | Solto | { bloco: string } | null | undefined {
  if (p === '' || p === 'caput' || p === 'o caput') return undefined;
  for (const [regex, bloco] of BLOCO) if (regex.test(p)) return { bloco };
  let m = ARTIGO.exec(p);
  if (m) {
    return {
      tipo: 'artigo',
      segmento: m[3] ? 'artUnico' : `art${numero(m[1] ?? '')}${sufixo(m[2])}`,
    };
  }
  m = PARAGRAFO.exec(p);
  if (m) {
    return {
      tipo: 'paragrafo',
      segmento: m[3] ? 'parUnico' : `par${numero(m[1] ?? '')}${sufixo(m[2])}`,
    };
  }
  if (p === 'p.u.' || p === 'p. u.') {
    return { tipo: 'paragrafo', segmento: 'parUnico' };
  }
  m = INCISO.exec(p);
  if (m) {
    const romano = m[1] ?? '';
    return ehRomano(romano)
      ? { tipo: 'inciso', segmento: `inc${romano.toUpperCase()}${sufixo(m[2])}` }
      : null;
  }
  m = ALINEA.exec(p);
  if (m) return { tipo: 'alinea', segmento: `al${(m[1] ?? '').toUpperCase()}${sufixo(m[2])}` };
  m = ITEM.exec(p);
  if (m) return { tipo: 'item', segmento: `it${numero(m[1] ?? '')}${sufixo(m[2])}` };
  m = SOLTO_NUMERO.exec(p);
  if (m) return { numero: `${numero(m[1] ?? '')}${sufixo(m[2])}` };
  m = SOLTO_ROMANO.exec(p);
  if (m && ehRomano(m[1] ?? '')) {
    const romano = `${(m[1] ?? '').toUpperCase()}${sufixo(m[2])}`;
    const so = m[1]?.length === 1 ? m[1] : undefined;
    return so ? { romano, letra: `${so.toUpperCase()}${sufixo(m[2])}` } : { romano };
  }
  m = SOLTO_LETRA.exec(p);
  if (m) return { letra: `${(m[1] ?? '').toUpperCase()}${sufixo(m[2])}` };
  return null;
}

/**
 * "do", "da", "de", "no", "na", "em" e a vírgula separam os pedaços, e o espaço antes de "§" ou
 * da palavra do tipo ("112 § 1"); o "e" não (seria outro endereço).
 */
const SEPARADOR =
  /\s*,\s*|\s+(?:d[oae]s?|n[oa]s?|em)\s+|\s+(?=§|(?:art(?:igo)?|par(?:agrafo)?|inc(?:iso)?|al(?:inea)?|it(?:em)?)\b)/u;

/**
 * Lê um endereço escrito como na lei, nos dois sentidos: do artigo ao item ("art. 5º, LXXIV";
 * "112, § 2º"; "art. 26, II, a") e do item ao artigo ("§ 2º do 112"; "inciso II do art. 26";
 * "alínea b do inciso II do art. 26"). Número sozinho é artigo ("112", "9-A"); o romano solto depois
 * do artigo ou do parágrafo é inciso, e a letra solta, alínea; "caput" é ignorado (o inciso do caput
 * fica direto no artigo); "do ADCT" põe o prefixo do bloco ("adct.art76"). Devolve os endereços
 * canônicos possíveis, do mais provável ao menos: a letra que também é romano ("art. 5º, i") dá os
 * dois. Vazio se o texto não é um endereço (texto comum, pedaço que não se lê, artigo ausente, ou o
 * mesmo tipo duas vezes). Pura: não sabe que dispositivos a norma tem (ver `resolverEndereco`).
 */
export function analisarEndereco(texto: string): string[] {
  const dobrado = dobrar(chaveDeCasamento(texto))
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/[.;:]$/u, '');
  if (dobrado === '' || dobrado.length > 120) return [];
  const pedacos = dobrado.split(SEPARADOR).map((p) => p.replace(/["']/gu, '').trim());
  let bloco: string | undefined;
  const fixos: Componente[] = [];
  const soltos: Solto[] = [];
  const ordem: (Componente | Solto)[] = [];
  for (const p of pedacos) {
    const lido = lerPedaco(p);
    if (lido === null) return [];
    if (lido === undefined) continue;
    if ('bloco' in lido) {
      if (bloco !== undefined) return [];
      bloco = lido.bloco;
      continue;
    }
    ordem.push(lido);
    if (lido.tipo === undefined) soltos.push(lido);
    else fixos.push(lido);
  }
  if (ordem.length === 0) return [];

  // Cada pedaço solto vira um ou dois tipos, conforme o que já há (e, na escrita do artigo ao item,
  // conforme o que veio antes dele). As combinações vão em ordem: a primeira opção de cada pedaço
  // primeiro.
  let combinacoes: Componente[][] = [[]];
  const usados = new Set(fixos.map((c) => c.tipo));
  let anterior: Tipo | undefined;
  for (const pedaco of ordem) {
    if (pedaco.tipo !== undefined) {
      anterior = pedaco.tipo;
      continue;
    }
    const opcoes = opcoesDoSolto(pedaco, usados, anterior);
    if (opcoes.length === 0) return [];
    combinacoes = combinacoes.flatMap((c) => opcoes.map((o) => [...c, o]));
    anterior = opcoes[0]?.tipo;
    for (const o of opcoes.slice(0, 1)) usados.add(o.tipo);
  }

  const enderecos: string[] = [];
  for (const soltosLidos of combinacoes) {
    const todosOs = [...fixos, ...soltosLidos].sort((a, b) => DEGRAU[a.tipo] - DEGRAU[b.tipo]);
    const tipos = new Set(todosOs.map((c) => c.tipo));
    if (tipos.size !== todosOs.length || !tipos.has('artigo')) continue;
    const caminho = todosOs.map((c) => c.segmento).join('.');
    const endereco = bloco === undefined ? caminho : `${bloco}.${caminho}`;
    if (!enderecos.includes(endereco)) enderecos.push(endereco);
  }
  return enderecos;
}

function opcoesDoSolto(
  solto: Solto,
  usados: ReadonlySet<Tipo>,
  anterior: Tipo | undefined,
): Componente[] {
  const opcoes: Componente[] = [];
  const livre = (t: Tipo) => !usados.has(t);
  if (solto.numero !== undefined) {
    // Número: o artigo, se ainda não há; depois dele, o item (da alínea ou do inciso).
    if (livre('artigo')) opcoes.push({ tipo: 'artigo', segmento: `art${solto.numero}` });
    else if (
      livre('item') &&
      (anterior === 'alinea' || anterior === 'inciso' || usados.has('alinea'))
    ) {
      opcoes.push({ tipo: 'item', segmento: `it${solto.numero}` });
    }
    return opcoes;
  }
  const depoisDoInciso = anterior === 'inciso' || anterior === 'alinea' || usados.has('inciso');
  if (solto.romano !== undefined && livre('inciso') && !depoisDoInciso) {
    opcoes.push({ tipo: 'inciso', segmento: `inc${solto.romano}` });
  }
  if (solto.letra !== undefined && livre('alinea')) {
    opcoes.push({ tipo: 'alinea', segmento: `al${solto.letra}` });
  }
  return opcoes;
}

export interface EnderecoResolvido {
  /** O endereço achado na norma: o pedido ou, se ele não existe, o ancestral mais próximo que existe. */
  endereco: string;
  /** O endereço pedido (o primeiro possível), quando não existe e a busca leva ao ancestral. */
  faltou?: string;
}

/**
 * O primeiro endereço possível que a norma tem; se nenhum existe, o ancestral mais próximo do
 * primeiro ("§ 9º do 112" sem o § 9º leva ao art. 112, com `faltou`). Sem nenhum, `undefined`.
 */
export function resolverEndereco(
  possiveis: readonly string[],
  existe: (endereco: string) => boolean,
): EnderecoResolvido | undefined {
  const achado = possiveis.find(existe);
  if (achado !== undefined) return { endereco: achado };
  const [primeiro] = possiveis;
  if (primeiro === undefined) return undefined;
  const segmentos = primeiro.split('.');
  for (let n = segmentos.length - 1; n > 0; n--) {
    const ancestral = segmentos.slice(0, n).join('.');
    if (existe(ancestral)) return { endereco: ancestral, faltou: primeiro };
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Por texto
// ---------------------------------------------------------------------------------------------

// Dobra de um caractere, sem mudar o comprimento (os offsets do texto exibido continuam valendo).
const DOBRA_ESPECIAL: Record<string, string> = { º: 'o', ª: 'a', '°': 'o', ' ': ' ' };
const dobras = new Map<string, string>();
function dobrarCaractere(c: string): string {
  let d = dobras.get(c);
  if (d === undefined) {
    const base = DOBRA_ESPECIAL[c] ?? c.normalize('NFD')[0] ?? c;
    const minuscula = base.toLowerCase();
    d = /\s/u.test(minuscula) ? ' ' : minuscula.length === 1 ? minuscula : base;
    dobras.set(c, d);
  }
  return d;
}

/**
 * Sem acento, sem caixa, com "º"/"ª" como "o"/"a" e todo espaço (quebra de linha da pena) como " ",
 * com o mesmo comprimento: o caractere `i` do resultado é o `i` da entrada. Aplicada sobre a
 * `chaveDeCasamento` (travessões e aspas já unificados).
 */
export function dobrar(texto: string): string {
  let saida = '';
  for (let i = 0; i < texto.length; i++) saida += dobrarCaractere(texto.charAt(i));
  return saida;
}

/** A chave de busca do texto exibido: `dobrar(chaveDeCasamento(texto))`, mesmo comprimento. */
export const chaveDeBusca = (texto: string) => dobrar(chaveDeCasamento(texto));

/** O que se procura: a chave, com os espaços colapsados e aparada. Vazio não busca. */
export const consultaDeBusca = (texto: string) => chaveDeBusca(texto).replace(/\s+/gu, ' ').trim();

export interface TextoBuscavel {
  /** Índice do nó em `NormaAberta.nos`. */
  indice: number;
  /** O texto exibido (os trechos sem o tachado). */
  texto: string;
  /** `chaveDeBusca(texto)`, com os espaços seguidos colapsados num só, e o mapa para o exibido. */
  chave: string;
  inicioNoTexto: readonly number[];
}

export interface Achado {
  indice: number;
  texto: string;
  /** O trecho achado em `texto` (`texto.slice(inicio, fim)`). */
  inicio: number;
  fim: number;
}

export interface ResultadoDaBusca {
  /** Quantos achados há na norma (um dispositivo pode ter vários). */
  total: number;
  /** Os primeiros `limite` achados, em ordem de leitura. */
  achados: Achado[];
}

/** Status cujo texto o leitor mostra direto (o revogado e o de eficácia cessada ficam recolhidos). */
const STATUS_BUSCAVEL = new Set(['vigente', 'renumerado', 'novo', 'vetado']);

/**
 * Prepara a busca por texto: lê todos os textos da versão aberta (o leitor só tem os da tela) e
 * guarda a chave de cada nó com texto à vista: o texto vigente sem o tachado, do dispositivo, do
 * nó estrutural e da rubrica (o `nome`, que o leitor desenha na linha do pai). Ficam de fora as
 * redações anteriores, as notas de vigência e os dispositivos revogados (recolhidos no leitor).
 */
export async function prepararBusca(
  repo: Repositorio,
  aberta: NormaAberta,
): Promise<TextoBuscavel[]> {
  const textos = await todos(repo.colecao('textosDispositivo'), {
    indice: 'versaoId',
    de: aberta.versao.id,
    ate: aberta.versao.id,
  });
  const porDispositivo = new Map(textos.map((t) => [t.dispositivoId, t]));
  const buscaveis: TextoBuscavel[] = [];
  aberta.nos.forEach((no, indice) => {
    if (!STATUS_BUSCAVEL.has(no.dispositivo.status)) return;
    const trechos = porDispositivo.get(no.dispositivo.id)?.trechos ?? [];
    const texto = trechos
      .filter((t) => !t.tachado)
      .map((t) => t.texto)
      .join('');
    if (texto.trim() === '') return;
    buscaveis.push({ indice, texto, ...chaveColapsada(texto) });
  });
  return buscaveis;
}

/** A chave com os espaços seguidos num só e, para cada caractere dela, o offset no texto exibido. */
function chaveColapsada(texto: string): { chave: string; inicioNoTexto: number[] } {
  const dobrado = chaveDeBusca(texto);
  let chave = '';
  const inicioNoTexto: number[] = [];
  for (let i = 0; i < dobrado.length; i++) {
    const c = dobrado.charAt(i);
    if (c === ' ' && chave.endsWith(' ')) continue;
    chave += c;
    inicioNoTexto.push(i);
  }
  inicioNoTexto.push(dobrado.length);
  return { chave, inicioNoTexto };
}

/** Os achados da consulta, em ordem de leitura; a consulta passa por `consultaDeBusca`. */
export function buscarTexto(
  buscaveis: readonly TextoBuscavel[],
  consulta: string,
  limite: number,
): ResultadoDaBusca {
  const alvo = consultaDeBusca(consulta);
  const achados: Achado[] = [];
  let total = 0;
  if (alvo === '') return { total, achados };
  for (const b of buscaveis) {
    let de = b.chave.indexOf(alvo);
    while (de !== -1) {
      total += 1;
      if (achados.length < limite) {
        const inicio = b.inicioNoTexto[de] ?? 0;
        // O fim é o do último caractere achado mais um (no texto, o espaço colapsado pode ser vários).
        const fim = (b.inicioNoTexto[de + alvo.length - 1] ?? inicio) + 1;
        achados.push({ indice: b.indice, texto: b.texto, inicio, fim });
      }
      de = b.chave.indexOf(alvo, de + alvo.length);
    }
  }
  return { total, achados };
}
