// Prévia de remissões internas (F2, atividade 11.9; Parte 2 §10.6, Leitor). Detector puro: acha no
// texto de um dispositivo as citações a outros dispositivos ("art. 84, XIX", "§ 2º do art. 5º",
// "deste artigo", "incisos I e II") e devolve, para cada uma, o trecho do texto exibido e os
// endereços canônicos possíveis (8.2–8.4), do mais provável ao menos. Quem resolve é o leitor, pelo
// mapa endereço → nó (`resolverEndereco`, 11.6): o que não resolve fica como texto comum.
// Casa na `chaveDeBusca` (`dobrar(chaveDeCasamento(texto))`, mesmo comprimento do texto), então os
// índices valem no texto exibido. Citação seguida de outra norma ("do Código Penal", "da Lei nº…")
// é `externa` e sem endereço; "desta Lei" e "desta Constituição" são internas.
import { analisarEndereco, chaveDeBusca } from './busca';

export interface Remissao {
  /** `[inicio, fim)` em unidades de código, os mesmos índices do texto exibido. */
  inicio: number;
  fim: number;
  tipo: 'interna' | 'externa';
  /** Endereços canônicos possíveis, do mais provável ao menos; vazio se `externa`. */
  enderecos: string[];
}

type Tipo = 'artigo' | 'paragrafo' | 'inciso' | 'alinea' | 'item';
const GRAU: Record<Tipo, number> = { artigo: 0, paragrafo: 1, inciso: 2, alinea: 3, item: 4 };
const GRAU_DO_SEGMENTO: readonly [RegExp, number][] = [
  [/^art/u, 0],
  [/^par/u, 1],
  [/^inc/u, 2],
  [/^al/u, 3],
  [/^it/u, 4],
];
const grauDoSegmento = (s: string) => GRAU_DO_SEGMENTO.find(([r]) => r.test(s))?.[1] ?? 9;

interface Item {
  texto: string;
  inicio: number;
  fim: number;
}
interface Parte {
  tipo: Tipo | 'caput';
  inicio: number;
  itens: Item[];
}

const ORD = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)o?(?:\s*-\s*[a-z](?![a-z0-9]))?`;
const ROMANO = /^m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/u;
const sticky = (s: string) => new RegExp(s, 'uy');

const ITEM_DE: Record<Tipo, RegExp> = {
  artigo: sticky(ORD),
  paragrafo: sticky(`(?:${ORD}|unico(?![a-z]))`),
  inciso: sticky(String.raw`[ivxlcdm]+(?:\s*-\s*[a-z](?![a-z0-9]))?(?![a-z0-9])`),
  alinea: sticky(String.raw`[a-z](?![a-z0-9])\)?`),
  item: sticky(String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)(?![a-z0-9])`),
};
const PALAVRA: readonly [Tipo, RegExp][] = [
  ['artigo', sticky(String.raw`art(?:igos?|s?\.?)\s*`)],
  ['paragrafo', sticky(String.raw`(?:§+|paragrafos?|pars?\.)\s*`)],
  ['inciso', sticky(String.raw`(?:incisos?|incs?\.)\s*`)],
  ['alinea', sticky(String.raw`(?:alineas?|als?\.)\s*`)],
  ['item', sticky(String.raw`(?:itens|item|its?\.)\s*`)],
];
const CAPUT = sticky(String.raw`caput(?![a-z0-9])`);
const SEPARADOR_DE_LISTA = sticky(String.raw`\s*(?:,|\se|\sa|\sao)\s*`);
const SEPARADOR_DE_LISTA_ALINEA = sticky(String.raw`\s*(?:,|\se)\s*`);
const SEPARADOR_SINGULAR = sticky(String.raw`\se\s`);
const LIGACAO = sticky(String.raw`(?:\s*,?\s+d[oae]s?\s+|\s*,\s*|\s+)`);
const LIGACAO_VIRGULA = sticky(String.raw`\s*,\s*`);
const RELATIVA = sticky(
  String.raw`(?:(?:d?es?te|n?es?te|d?es?se|n?es?se)\s+(artigo|paragrafo))(?![a-z0-9])`,
);
const INICIO_DE_CITACAO =
  /(?<![a-z0-9§])(?:art(?:igos?|s?\.?)(?![a-z])|§|paragrafos?(?![a-z])|pars?\.|incisos?(?![a-z])|incs?\.|alineas?(?![a-z])|als?\.|itens(?![a-z])|item(?![a-z])|caput(?![a-z])|(?:d?es?te|n?es?te|d?es?se|n?es?se)\s+(?:artigo|paragrafo)(?![a-z0-9]))/gu;

function lerItem(tipo: Tipo, d: string, o: string, i: number): Item | undefined {
  const r = ITEM_DE[tipo];
  r.lastIndex = i;
  const m = r.exec(d);
  if (!m) return undefined;
  const texto = m[0].replace(/\)$/u, '');
  if (tipo === 'inciso' && !ROMANO.test(texto.replace(/\s*-.*$/u, ''))) return undefined;
  // A lei escreve o inciso em maiúsculas; "c" solto é alínea, não o romano 100.
  if (
    tipo === 'inciso' &&
    o.slice(i, i + texto.length) !== o.slice(i, i + texto.length).toUpperCase()
  ) {
    return undefined;
  }
  return { texto, inicio: i, fim: i + texto.length + (m[0].endsWith(')') ? 1 : 0) };
}

/** Uma parte com a palavra do tipo, ou o inciso solto depois de vírgula; `undefined` se não lê. */
function lerParte(
  d: string,
  o: string,
  i: number,
  soltoDepoisDeVirgula: boolean,
  forcado?: Tipo,
): [Parte, number] | undefined {
  CAPUT.lastIndex = i;
  if (forcado === undefined && CAPUT.test(d))
    return [{ tipo: 'caput', inicio: i, itens: [] }, i + 5];
  let tipo: Tipo | undefined = forcado;
  let primeiro = i;
  for (const [t, r] of forcado === undefined ? PALAVRA : []) {
    r.lastIndex = i;
    const m = r.exec(d);
    if (m) {
      tipo = t;
      primeiro = i + m[0].length;
      break;
    }
  }
  if (tipo === undefined) {
    if (!soltoDepoisDeVirgula) return undefined;
    tipo = 'inciso';
    primeiro = i;
  }
  const item = lerItem(tipo, d, o, primeiro);
  if (!item) return undefined;
  const itens = [item];
  let fim = item.fim;
  // Sem a palavra no plural ("§ 4º, 150"), a vírgula não faz lista: o número seguinte é de outra citação.
  const plural = /(?:§§|s)\.?\s*$/u.test(d.slice(i, primeiro));
  const separador = !plural
    ? SEPARADOR_SINGULAR
    : tipo === 'alinea'
      ? SEPARADOR_DE_LISTA_ALINEA
      : SEPARADOR_DE_LISTA;
  for (;;) {
    separador.lastIndex = fim;
    const s = separador.exec(d);
    if (!s) break;
    const proximo = lerItem(tipo, d, o, fim + s[0].length);
    if (!proximo) break;
    itens.push(proximo);
    fim = proximo.fim;
  }
  return [{ tipo, inicio: i, itens }, fim];
}

type Cauda = { tipo: 'interna' | 'externa'; bloco?: string; fim: number };

const CAUDA = sticky(String.raw`\s*,?\s+d[oae]s?\s+`);
const CAUDA_INTERNA = sticky(
  String.raw`(?:(?:d?es?ta|d?es?te)\s+(?:lei|constituicao|codigo|estatuto|decreto|regulamento|consolidacao)(?:\s+complementar)?)(?![a-z])`,
);
const CAUDA_ADCT = sticky(
  String.raw`(?:adct|ato\s+das\s+disposicoes\s+constitucionais\s+transitorias)(?![a-z])`,
);
const CAUDA_MESMO = sticky(String.raw`mesm[oa]\s+(?:artigo|paragrafo)(?![a-z])`);
const CAUDA_EXTERNA = sticky(
  String.raw`(?:mesm[ao]\s+)?(?:constituicao|lei|codigo|decreto|estatuto|regulamento|consolidacao|medida\s+provisoria|resolucao|portaria|tratado|convencao|regimento|emenda)(?![a-z])`,
);

function lerCauda(d: string, i: number): Cauda | undefined {
  CAUDA.lastIndex = i;
  const c = CAUDA.exec(d);
  if (!c) return undefined;
  const j = i + c[0].length;
  for (const [r, f] of [
    [CAUDA_INTERNA, (m: string, fim: number): Cauda => ({ tipo: 'interna', fim: fim + m.length })],
    [
      CAUDA_ADCT,
      (m: string, fim: number): Cauda => ({ tipo: 'interna', bloco: 'adct', fim: fim + m.length }),
    ],
    [CAUDA_MESMO, (m: string, fim: number): Cauda => ({ tipo: 'interna', fim: fim + m.length })],
    [CAUDA_EXTERNA, (m: string, fim: number): Cauda => ({ tipo: 'externa', fim: fim + m.length })],
  ] as const) {
    r.lastIndex = j;
    const m = r.exec(d);
    if (m) return f(m[0], j);
  }
  return undefined;
}

const PALAVRA_DO_TIPO: Record<Tipo, string> = {
  artigo: 'art.',
  paragrafo: '§',
  inciso: 'inciso',
  alinea: 'alinea',
  item: 'item',
};
const textoDoItem = (tipo: Tipo, item: string) =>
  tipo === 'paragrafo' && item === 'unico'
    ? 'paragrafo unico'
    : tipo === 'artigo' && item === 'unico'
      ? 'artigo unico'
      : `${PALAVRA_DO_TIPO[tipo]} ${item}`;

interface Atual {
  bloco: string[];
  caminho: string[];
}
function lerAtual(endereco: string): Atual | undefined {
  const segmentos = endereco.split('.');
  const i = segmentos.findIndex((s) => grauDoSegmento(s) === 0);
  if (i < 0) return undefined;
  return { bloco: segmentos.slice(0, i), caminho: segmentos.slice(i) };
}

/** Os prefixos do endereço atual de grau menor que `grau`, do mais longo ao mais curto (até o artigo). */
function prefixosAte(atual: Atual, grau: number): string[][] {
  const prefixos: string[][] = [];
  let n = atual.caminho.filter((s) => grauDoSegmento(s) < grau).length;
  for (; n >= 1; n--) prefixos.push([...atual.bloco, ...atual.caminho.slice(0, n)]);
  return prefixos;
}

function enderecosDe(
  partes: readonly Parte[],
  herdado: string | undefined,
  escolhidos: ReadonlyMap<Parte, Item>,
  cauda: Cauda | undefined,
  atual: Atual | undefined,
): string[] {
  const tipadas = partes.filter((p): p is Parte & { tipo: Tipo } => p.tipo !== 'caput');
  const comArtigo = tipadas.some((p) => p.tipo === 'artigo');
  const partesEmTexto = tipadas.map((p) =>
    textoDoItem(p.tipo, (escolhidos.get(p) ?? p.itens[0])?.texto ?? ''),
  );
  // "o art. 166, § 3º e § 4º": a parte sem artigo, logo depois de uma citação, herda o artigo dela.
  const texto = (
    !comArtigo && herdado !== undefined ? [herdado, ...partesEmTexto] : partesEmTexto
  ).join(', ');
  if (comArtigo || herdado !== undefined) {
    const direto = analisarEndereco(cauda?.bloco ? `${texto} do ${cauda.bloco}` : texto);
    if (cauda?.bloco || !atual || atual.bloco.length === 0) return direto;
    // Dentro do ADCT (ou das disposições transitórias), o "art. 76" sem mais nada é do próprio bloco.
    const dentro = direto.map((e) => [...atual.bloco, e].join('.'));
    return [...dentro, ...direto];
  }
  if (!atual) return [];
  const grau = Math.min(...tipadas.map((p) => GRAU[p.tipo]), 9);
  const relativos = analisarEndereco(`art. 1, ${texto}`);
  const enderecos: string[] = [];
  for (const prefixo of prefixosAte(atual, grau)) {
    for (const relativo of relativos) {
      const resto = relativo.split('.').slice(1);
      if (resto.length === 0) continue;
      const e = [...prefixo, ...resto].join('.');
      if (!enderecos.includes(e)) enderecos.push(e);
    }
  }
  return enderecos;
}

interface Contexto {
  /** Onde terminou a citação anterior e o artigo dela, para a parte sem artigo que vem colada. */
  fim: number;
  artigo?: string;
}

/**
 * Lê uma cadeia de partes a partir de `inicio` e acrescenta a(s) remissão(ões) em `saida`. Devolve
 * onde a cadeia (com a cauda) terminou e se a lista de artigos pode continuar ("arts. 37, XI, 39").
 */
function cadeia(
  d: string,
  texto: string,
  inicio: number,
  forcado: Tipo | undefined,
  atual: Atual | undefined,
  saida: Remissao[],
  ctx: Contexto,
): number {
  const partes: Parte[] = [];
  let i = inicio;
  let soltoDepoisDeVirgula = false;
  let fim = inicio;
  for (;;) {
    const lida = lerParte(
      d,
      texto,
      i,
      soltoDepoisDeVirgula,
      partes.length === 0 ? forcado : undefined,
    );
    if (!lida) break;
    const [parte, depois] = lida;
    partes.push(parte);
    fim = depois;
    LIGACAO.lastIndex = depois;
    const l = LIGACAO.exec(d);
    if (!l) break;
    LIGACAO_VIRGULA.lastIndex = depois;
    soltoDepoisDeVirgula = LIGACAO_VIRGULA.test(d);
    i = depois + l[0].length;
    // Depois da vírgula só entram partes que existem; senão a cadeia termina sem a ligação.
    if (!lerParte(d, texto, i, soltoDepoisDeVirgula)) break;
  }
  if (partes.length === 0) return inicio + 1;
  // A parte sem artigo colada à citação anterior (" e § 4º") é do artigo dela.
  const herdado = ctx.artigo !== undefined && inicio - ctx.fim <= 5 ? ctx.artigo : undefined;

  const cauda = lerCauda(d, fim);
  const depoisDeTudo = Math.max(fim, cauda?.fim ?? 0);
  const tipadas = partes.filter((p) => p.tipo !== 'caput');
  if (cauda?.tipo === 'externa') {
    if (tipadas.length > 0) saida.push({ inicio, fim, tipo: 'externa', enderecos: [] });
    return depoisDeTudo;
  }
  const artigoDaCadeia = tipadas.find((p) => p.tipo === 'artigo')?.itens.at(-1)?.texto;
  ctx.fim = depoisDeTudo;
  ctx.artigo = artigoDaCadeia !== undefined ? `art. ${artigoDaCadeia}` : herdado;
  const plural = tipadas.find((p) => p.itens.length > 1);
  const emitir = (
    inicioDe: number,
    fimDe: number,
    escolhidos: Map<Parte, Item>,
    soArtigo = false,
  ) => {
    const enderecos = enderecosDe(
      soArtigo ? [plural as Parte] : partes,
      herdado,
      escolhidos,
      cauda,
      atual,
    );
    if (enderecos.length > 0) {
      saida.push({ inicio: inicioDe, fim: fimDe, tipo: 'interna', enderecos });
    }
  };
  if (tipadas.length === 0) {
    // "do caput": o artigo em que o texto está.
    if (atual) {
      saida.push({
        inicio,
        fim,
        tipo: 'interna',
        enderecos: [[...atual.bloco, atual.caminho[0] ?? ''].join('.')],
      });
    }
  } else if (plural) {
    plural.itens.forEach((item, n) => {
      const ultimo = n === plural.itens.length - 1;
      emitir(
        n === 0 ? plural.inicio : item.inicio,
        item.fim,
        new Map([[plural, item]]),
        plural.tipo === 'artigo' && !ultimo,
      );
    });
  } else {
    emitir(inicio, fim, new Map());
  }
  // "arts. 37, XI, 39, § 4º, 150, II": depois de uma cadeia, o número solto é outro artigo da lista.
  if (
    cauda === undefined &&
    (forcado === 'artigo' || /^art(?:s|igos)/u.test(d.slice(inicio, inicio + 7)))
  ) {
    const proximo = sticky(String.raw`\s*(?:,\s*e\s+|,\s*|;\s*|\se\s+)(?=${ORD})`);
    proximo.lastIndex = fim;
    const p = proximo.exec(d);
    if (p) return -(fim + p[0].length) - 1;
  }
  return depoisDeTudo;
}

/**
 * As remissões do texto de um dispositivo. `enderecoAtual` é o endereço canônico do dispositivo
 * que contém o texto (para "deste artigo", "do caput", "deste parágrafo" e para o "inciso II"
 * sem artigo, que é do mesmo parágrafo ou do mesmo artigo). Em ordem de aparição, sem sobreposição.
 * Lista ("arts. 5º e 6º", "incisos I e II") vira uma remissão por item; a faixa ("I a III") vale
 * pelas pontas. Pura; linear no tamanho do texto.
 */
export function detectarRemissoes(texto: string, enderecoAtual: string): Remissao[] {
  const d = chaveDeBusca(texto);
  const atual = lerAtual(enderecoAtual);
  const saida: Remissao[] = [];
  const ctx: Contexto = { fim: -100 };
  INICIO_DE_CITACAO.lastIndex = 0;
  let achado: RegExpExecArray | null;
  while ((achado = INICIO_DE_CITACAO.exec(d))) {
    const inicio = achado.index;
    RELATIVA.lastIndex = inicio;
    const rel = RELATIVA.exec(d);
    if (rel) {
      INICIO_DE_CITACAO.lastIndex = inicio + rel[0].length;
      if (!atual) continue;
      const ehArtigo = rel[1] === 'artigo';
      if (!ehArtigo && !atual.caminho.some((s) => grauDoSegmento(s) === 1)) continue;
      const alvo = ehArtigo ? [atual.caminho[0] ?? ''] : (prefixosAte(atual, 2)[0] ?? []);
      saida.push({
        inicio,
        fim: inicio + rel[0].length,
        tipo: 'interna',
        enderecos: [(ehArtigo ? [...atual.bloco, ...alvo] : alvo).join('.')],
      });
      continue;
    }
    let proximo = cadeia(d, texto, inicio, undefined, atual, saida, ctx);
    // A lista de artigos continua com cadeias de artigo implícito.
    while (proximo < 0) {
      const de = -proximo - 1;
      proximo = cadeia(d, texto, de, 'artigo', atual, saida, ctx);
      if (proximo >= 0) break;
    }
    INICIO_DE_CITACAO.lastIndex = Math.max(proximo, inicio + 1);
  }
  return saida.sort((a, b) => a.inicio - b.inicio);
}
