// Normalização (F2, atividade 8.1; Parte 2 §10.6, regra 1): primeiro passo do estruturador, sobre
// os blocos do sanitizador (HTML) ou de `textoParaBlocos` (texto puro). Troca só a codificação,
// nunca a letra da lei: entidades, caracteres de controle e invisíveis, acentos decompostos, hífen
// suave, espaços e as formas do ordinal. Aspas e travessões ficam como na fonte no texto exibido e
// se unificam na chave de casamento (1:1), que as regras seguintes e a busca usam. Casos medidos
// no corpus: `planos/F2.md` › "Fatos da normalização".
import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';

export interface RelatorioNormalizacao {
  /** Referências de caractere (`&nbsp;`, `&#150;`) decodificadas, numa passada só. */
  entidades: number;
  /** Hífens suaves (U+00AD) encontrados. */
  hifensSuaves: number;
  /**
   * O que eles viraram, decidido pela norma inteira: `hifen` (no Planalto o U+00AD está no lugar
   * do hífen: "incumbindo-lhe", "far-se-á") ou `silabico` (hifenização de Word ou PDF: somem).
   */
  hifenSuave: 'hifen' | 'silabico';
  /** Ordinais trocados pela forma canônica (º, ª) ou ajustados à formatação do número. */
  ordinais: number;
  /** U+FFFD no resultado: caractere perdido antes de chegar aqui (anomalia `caractere_perdido`). */
  perdidos: number;
}

export interface ResultadoNormalizacao {
  /** Mesmo tamanho e ordem da entrada: bloco que fica vazio continua na lista, sem trechos. */
  blocos: Bloco[];
  relatorio: RelatorioNormalizacao;
}

/** Normaliza uma linha de texto (espaços colapsados e aparados). Texto com quebras: `textoParaBlocos` antes. */
export function normalizar(texto: string): string {
  const [bloco] = normalizarBlocos([{ trechos: [{ texto }] }]).blocos;
  return (bloco?.trechos ?? []).map((t) => t.texto).join('');
}

/**
 * Chave de casamento: mesmo comprimento do texto normalizado (os offsets coincidem), com os
 * travessões e hífens tipográficos como "-" e as aspas e apóstrofos como `"` e `'`. Serve às regex
 * de rótulo e nota (8.3–8.6) e à busca (11.6); nunca é exibida.
 */
export function chaveDeCasamento(texto: string): string {
  return texto.replace(TRACOS, '-').replace(ASPAS_DUPLAS, '"').replace(ASPAS_SIMPLES, "'");
}

/** Regra 1 sobre os blocos, preservando tachado, ênfase e link de cada caractere. */
export function normalizarBlocos(blocos: readonly Bloco[]): ResultadoNormalizacao {
  const marcas = new Marcas();
  const relatorio: RelatorioNormalizacao = {
    entidades: 0,
    hifensSuaves: 0,
    hifenSuave: 'hifen',
    ordinais: 0,
    perdidos: 0,
  };

  // 1ª passada: o que independe do resto da norma.
  const marcados = blocos.map((bloco) => {
    const m = marcas.marcar(bloco);
    relatorio.entidades += substituir(m, ENTIDADE, decodificarEntidade, primeiro);
    substituir(m, C1, (c) => WINDOWS_1252[c[0].charCodeAt(0) - 0x80] ?? '', primeiro);
    substituir(m, CONTROLE, () => '', primeiro);
    substituir(m, INVISIVEIS, () => '', primeiro);
    // Antes do hífen suave, que some quando está colado a outro hífen.
    substituir(m, HIFENS_UNICODE, () => '-', primeiro);
    nfc(m);
    return m;
  });

  // O hífen suave se decide pela norma inteira. Composto em minúscula ("salário-família") conta
  // como hífen quando a palavra da direita também aparece solta na norma.
  const palavras = new Set<string>();
  for (const m of marcados) {
    for (const [palavra] of m.texto.matchAll(PALAVRA_SOLTA)) palavras.add(palavra.toLowerCase());
  }
  let entreLetras = 0;
  let claros = 0;
  for (const m of marcados) {
    relatorio.hifensSuaves += contar(m.texto, HIFEN_SUAVE_UM);
    for (const c of m.texto.matchAll(HIFEN_SUAVE_ENTRE_LETRAS)) {
      entreLetras += 1;
      if (hifenClaro(m.texto, c.index + 1, palavras)) claros += 1;
    }
  }
  // Silábico só com evidência: 4 ou mais entre letras e menos da metade com cara de hífen.
  relatorio.hifenSuave = entreLetras >= 4 && claros * 2 < entreLetras ? 'silabico' : 'hifen';

  // 2ª passada: hífens, espaços e ordinais.
  const saida = marcados.map((m) => {
    // Na ponta do bloco (só espaço ou hífen suave antes ou depois) ou colado a outro hífen, some.
    const primeiroVisivel = m.texto.search(/[^\s\u00AD]/);
    let depoisDoUltimo = m.texto.length;
    while (depoisDoUltimo > 0 && /[\s\u00AD]/.test(m.texto.charAt(depoisDoUltimo - 1)))
      depoisDoUltimo -= 1;
    substituir(
      m,
      HIFEN_SUAVE,
      (c, texto) => {
        const fim = c.index + c[0].length;
        if (relatorio.hifenSuave === 'silabico') return '';
        if (c.index < primeiroVisivel || fim > depoisDoUltimo) return '';
        if (texto[c.index - 1] === '-' || texto[fim] === '-') return '';
        return '-';
      },
      anterior,
    );
    nfc(m);
    substituir(
      m,
      ESPACOS,
      (c, texto) => (c.index === 0 || c.index + c[0].length === texto.length ? '' : ' '),
      (m, ini, fim) => marcas.comum(m.marcas[ini - 1], m.marcas[fim]),
    );
    for (const [re, forma] of ORDINAIS)
      relatorio.ordinais += substituir(m, re, () => forma, anterior);
    // Listas ("§§ 1 o , 2 o e 3 o"): cada troca habilita a seguinte.
    for (let i = 0; i < 20; i++) {
      const trocas = substituir(m, ORDINAL_EM_LISTA, () => 'º', anterior);
      relatorio.ordinais += trocas;
      if (trocas === 0) break;
    }
    // O ordinal passou a ter a formatação do número: o espaço ao lado é recalculado.
    substituir(
      m,
      / /g,
      () => ' ',
      (m, ini, fim) => marcas.comum(m.marcas[ini - 1], m.marcas[fim]),
    );
    relatorio.perdidos += contar(m.texto, PERDIDO);
    return { trechos: paraTrechos(m) };
  });

  return { blocos: saida, relatorio };
}

// ── Texto com uma marca (tachado, ênfase, link) por unidade de código ──────────────────────────

interface Marca {
  tachado?: true;
  enfase?: true;
  link?: string;
}

interface Marcado {
  texto: string;
  /** `marcas[i]` é a formatação de `texto[i]`; objetos internados (mesma formatação = mesmo objeto). */
  marcas: Marca[];
}

class Marcas {
  private readonly internadas = new Map<string, Marca>();

  internar(tachado: boolean, enfase: boolean, link: string | undefined): Marca {
    const chave = `${tachado ? 't' : ''}${enfase ? 'e' : ''}|${link ?? ''}`;
    let marca = this.internadas.get(chave);
    if (!marca) {
      marca = {};
      if (tachado) marca.tachado = true;
      if (enfase) marca.enfase = true;
      if (link !== undefined) marca.link = link;
      this.internadas.set(chave, marca);
    }
    return marca;
  }

  marcar(bloco: Bloco): Marcado {
    let texto = '';
    const marcas: Marca[] = [];
    for (const t of bloco.trechos) {
      const marca = this.internar(t.tachado === true, t.enfase === true, t.link);
      texto += t.texto;
      for (let i = 0; i < t.texto.length; i++) marcas.push(marca);
    }
    return { texto, marcas };
  }

  /** Formatação que os dois vizinhos de um espaço têm em comum (o espaço não cria nem quebra tachado). */
  comum(a: Marca | undefined, b: Marca | undefined): Marca {
    return this.internar(
      a?.tachado === true && b?.tachado === true,
      a?.enfase === true && b?.enfase === true,
      a?.link !== undefined && a.link === b?.link ? a.link : undefined,
    );
  }
}

type MarcaDaTroca = (m: Marcado, inicio: number, fim: number) => Marca;

/** A troca herda a formatação do caractere anterior (o número do ordinal, a letra do hífen). */
const anterior: MarcaDaTroca = (m, ini) => (m.marcas[ini - 1] ?? m.marcas[ini]) as Marca;
/** A troca herda a formatação do primeiro caractere trocado. */
const primeiro: MarcaDaTroca = (m, ini) => (m.marcas[ini] ?? m.marcas[ini - 1]) as Marca;

/** Aplica `re` (global) e devolve quantas trocas mudaram o texto ou a formatação. */
function substituir(
  m: Marcado,
  re: RegExp,
  troca: (casamento: RegExpExecArray, texto: string) => string,
  marcaDaTroca: MarcaDaTroca,
): number {
  let mudancas = 0;
  let texto = '';
  const marcas: Marca[] = [];
  let pos = 0;
  for (const c of m.texto.matchAll(re)) {
    const ini = c.index;
    const fim = ini + c[0].length;
    const novo = troca(c, m.texto);
    const marca = marcaDaTroca(m, ini, fim);
    let mudou = novo !== c[0];
    for (let i = ini; !mudou && i < fim; i++) mudou = m.marcas[i] !== marca;
    if (mudou) mudancas += 1;
    texto += m.texto.slice(pos, ini) + novo;
    for (let i = pos; i < ini; i++) marcas.push(m.marcas[i] as Marca);
    for (let i = 0; i < novo.length; i++) marcas.push(marca);
    pos = fim;
  }
  if (mudancas === 0) return 0;
  texto += m.texto.slice(pos);
  for (let i = pos; i < m.texto.length; i++) marcas.push(m.marcas[i] as Marca);
  m.texto = texto;
  m.marcas = marcas;
  return mudancas;
}

function paraTrechos(m: Marcado): Trecho[] {
  const trechos: Trecho[] = [];
  let ini = 0;
  for (let i = 1; i <= m.texto.length; i++) {
    if (i < m.texto.length && m.marcas[i] === m.marcas[ini]) continue;
    const marca = m.marcas[ini] as Marca;
    const trecho: Trecho = { texto: m.texto.slice(ini, i) };
    if (marca.tachado) trecho.tachado = true;
    if (marca.enfase) trecho.enfase = true;
    if (marca.link !== undefined) trecho.link = marca.link;
    trechos.push(trecho);
    ini = i;
  }
  return trechos;
}

function contar(texto: string, re: RegExp): number {
  return texto.match(re)?.length ?? 0;
}

// ── Entidades e caracteres de controle ────────────────────────────────────────────────────────

const ENTIDADE = /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,31}));/g;

/** Nomes do Latin-1 do HTML, de U+00A0 a U+00FF, na ordem. */
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn ' +
  'sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave ' +
  'Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ' +
  'ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN ' +
  'szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave ' +
  'iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc ' +
  'uuml yacute thorn yuml';

const NOMEADAS = new Map<string, number>([
  ...LATIN1.split(' ').map((nome, i): [string, number] => [nome, 0xa0 + i]),
  ['quot', 0x22],
  ['amp', 0x26],
  ['apos', 0x27],
  ['lt', 0x3c],
  ['gt', 0x3e],
  ['OElig', 0x152],
  ['oelig', 0x153],
  ['Scaron', 0x160],
  ['scaron', 0x161],
  ['Yuml', 0x178],
  ['fnof', 0x192],
  ['circ', 0x2c6],
  ['tilde', 0x2dc],
  ['ensp', 0x2002],
  ['emsp', 0x2003],
  ['thinsp', 0x2009],
  ['zwnj', 0x200c],
  ['zwj', 0x200d],
  ['lrm', 0x200e],
  ['rlm', 0x200f],
  ['ndash', 0x2013],
  ['mdash', 0x2014],
  ['lsquo', 0x2018],
  ['rsquo', 0x2019],
  ['sbquo', 0x201a],
  ['ldquo', 0x201c],
  ['rdquo', 0x201d],
  ['bdquo', 0x201e],
  ['dagger', 0x2020],
  ['Dagger', 0x2021],
  ['bull', 0x2022],
  ['hellip', 0x2026],
  ['permil', 0x2030],
  ['prime', 0x2032],
  ['Prime', 0x2033],
  ['lsaquo', 0x2039],
  ['rsaquo', 0x203a],
  ['euro', 0x20ac],
  ['trade', 0x2122],
  ['minus', 0x2212],
]);

/** Referência numérica inválida vira U+FFFD (como no HTML5); nome desconhecido fica como está. */
function decodificarEntidade(c: RegExpExecArray): string {
  const [todo, decimal, hexa, nome] = c;
  if (nome !== undefined) {
    const codigo = NOMEADAS.get(nome);
    return codigo === undefined ? todo : String.fromCodePoint(codigo);
  }
  const codigo = decimal !== undefined ? Number(decimal) : parseInt(hexa ?? '', 16);
  if (codigo === 0 || codigo > 0x10ffff || (codigo >= 0xd800 && codigo <= 0xdfff)) return '\uFFFD';
  // De 128 a 159 (C1) o passo seguinte aplica a tabela windows-1252, como o HTML5.
  return String.fromCodePoint(codigo);
}

/**
 * C1 (U+0080–U+009F) só aparece em windows-1252 lido como latin1 (ou em `&#150;`): vale o
 * caractere do windows-1252 (U+0096 é o travessão "–"); as 5 posições sem caractere somem.
 */
const C1 = /[\u0080-\u009f]/g;
// prettier-ignore
const WINDOWS_1252 = [
  '\u20AC', '', '\u201A', '\u0192', '\u201E', '\u2026', '\u2020', '\u2021',
  '\u02C6', '\u2030', '\u0160', '\u2039', '\u0152', '', '\u017D', '',
  '', '\u2018', '\u2019', '\u201C', '\u201D', '\u2022', '\u2013', '\u2014',
  '\u02DC', '\u2122', '\u0161', '\u203A', '\u0153', '', '\u017E', '\u0178',
];

/** C0 e DEL, fora tab e quebras (que são espaço). */
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u0008\u000e-\u001f\u007f]/g;

/** Formatação invisível: larguras zero, marcas de direção, BOM, CGJ, separador mongol. */
const INVISIVEIS =
  /[\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Letra (ou marca solta) com as marcas combinantes que a seguem: a unidade do NFC. */
const AGLOMERADO = /\p{M}+|\P{M}\p{M}*/gu;

function nfc(m: Marcado): void {
  if (m.texto.normalize('NFC') !== m.texto) {
    substituir(m, AGLOMERADO, (c) => c[0].normalize('NFC'), primeiro);
  }
}

const PERDIDO = /\uFFFD/g;

// ── Hífens e espaços ──────────────────────────────────────────────────────────────────────────

const HIFEN_SUAVE = /\u00AD+/g;
const HIFEN_SUAVE_UM = /\u00AD/g;
const HIFEN_SUAVE_ENTRE_LETRAS = /(?<=\p{L})\u00AD(?=\p{L})/gu;
/** Depois do hífen suave, ênclise e mesóclise ("incumbindo-lhe", "far-se-á") ou maiúscula ("Estado-Maior"). */
const HIFEN_CLARO_DEPOIS =
  /(?:se|lhes?|[oa]s?|l[oa]s?|n[oa]s?|me|te|vos|á|ão|ás|ei|emos|eis|ia|ias|íamos|íeis|iam)(?!\p{L})|\p{Lu}/uy;
const PALAVRA_A_DIREITA = /\p{L}+/uy;
/** Palavra de 4 letras ou mais sem hífen de nenhum lado ("família", "doença"). */
const PALAVRA_SOLTA = /(?<![\p{L}\u00AD-])\p{L}{4,}(?![\p{L}\u00AD-])/gu;

/** O que começa em `depois` (logo após um hífen suave entre letras) tem cara de hífen verdadeiro? */
function hifenClaro(texto: string, depois: number, palavras: ReadonlySet<string>): boolean {
  HIFEN_CLARO_DEPOIS.lastIndex = depois;
  if (HIFEN_CLARO_DEPOIS.test(texto)) return true;
  PALAVRA_A_DIREITA.lastIndex = depois;
  const palavra = PALAVRA_A_DIREITA.exec(texto)?.[0] ?? '';
  return palavra.length >= 4 && palavras.has(palavra.toLowerCase());
}

/** U+2010 e U+2011 são o próprio hífen (artefato de editor); os demais traços ficam como vieram. */
const HIFENS_UNICODE = /[\u2010\u2011]/g;

/** Todo espaço (NBSP, espaços largos, tab, quebras, U+2028/U+2029): um só, nunca nas pontas. */
const ESPACOS = /\s+/g;

// ── Ordinais ──────────────────────────────────────────────────────────────────────────────────
// A marca segue o número: herda a formatação dele (o `<s>º</s>` decorativo do Planalto e o
// `<sup><u>o</u></sup>` perdem o tachado e a ênfase próprios). Sem espaço antes de pontuação,
// "N.º" e "1. o" ficam como estão; "O"/"A" maiúsculos depois de número nunca são ordinal.

const ORDINAIS: [RegExp, string][] = [
  // Número + º ou ᵒ, com um espaço de sobra ("§ 3 º").
  [/(?<!\d,\d{0,9})(?<=\d) ?[\u00BA\u1D52]/gu, 'º'],
  // Grau (°, ˚) só depois de um algarismo de 1 a 9 ("Artigo 1°", "em 1° grau"): "45°", "1,5°" e
  // "37°C" são grau de verdade.
  [/(?<=(?<![\d,])[1-9]) ?[\u00B0\u02DA](?! ?[CF](?!\p{L}))/gu, 'º'],
  [/(?<!\d,\d{0,9})(?<=\d) ?[ª\u1D43]/gu, 'ª'],
  // Com o ponto da fonte, que fica: "§ 2.°" e "n.°" viram "§ 2.º" e "n.º"; "n.o 8.078", "n.º 8.078".
  [/(?<=(?:(?<![\d,])[1-9]|(?<![\p{L}\d])[nN])\.) ?[\u00B0\u02DA\u1D52](?! ?[CF](?!\p{L}))/gu, 'º'],
  [/(?<=(?<![\p{L}\d])[nN]\.)o(?=s? ?\d)/gu, 'º'],
  // "N°", "n°", "nº" antes de número ou romano.
  [/(?<=(?<![\p{L}\d])[nN]) ?[º\u00B0\u02DA\u1D52](?=s?\.? ?[\dIVXLC])/gu, 'º'],
  // "1o" (o <sup>o</sup> sem o sup): até 3 algarismos, sem letra, ponto, vírgula ou barra antes.
  [/(?<=(?<![\p{L}\d.,/])\d{1,3})o(?![\p{L}\d])/gu, 'º'],
  // "§ 3 o", "Art. 6 o": só de 1 a 9 depois de rótulo ("1993 o eleitorado" não é ordinal).
  [/(?<=(?:^|[\s(])(?:[Aa]rt(?:igo|s)?\.?|ARTIGO|ARTS?\.?|§§?) ?[1-9]) o(?![\p{L}\d])/gu, 'º'],
  // "Lei no 8.072", "Lei n o 8.069", "DECRETO-LEI No 2.848". Contração fica: "no 1º trimestre",
  // "nesta Lei nos 2 (dois) anos".
  [
    /(?<=(?:^|[\s(-])(?:Leis?|LEIS?|Decreto|DECRETO|Legislativo|LEGISLATIVO|Complementar|COMPLEMENTAR|Constitucional|CONSTITUCIONAL|Provisória|PROVISÓRIA|Resolução|RESOLUÇÃO|Portaria|PORTARIA|Emenda|EMENDA|Súmula|SÚMULA|Ato|ATO) [nN]) ?o(?=s? \d[\d.]*(?![\d.]|[ºª\u00B0]| \(\p{Ll}))/gu,
    'º',
  ],
  // "2a instância", "da 1a, 2a e 3a Regiões" (o <sup>a</sup> sem o sup); nunca "77 a 82" nem "1a)".
  [/(?<=(?<![\p{L}\d.,/])\d{1,3})a(?![\p{L}\d)])/gu, 'ª'],
];

/** Continuação de lista: "§§ 1º , 2 o e 3 o", "§§ 1º a 3 o". */
const ORDINAL_EM_LISTA = /(?<=[1-9]º ?(?:,|e|a|ou) ?[1-9]) o(?![\p{L}\d])/gu;

// ── Chave de casamento ────────────────────────────────────────────────────────────────────────

const TRACOS = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;
const ASPAS_DUPLAS = /[\u00AB\u00BB\u201C-\u201F\u2033]/g;
const ASPAS_SIMPLES = /[`\u00B4\u2018-\u201B\u2032]/g;
