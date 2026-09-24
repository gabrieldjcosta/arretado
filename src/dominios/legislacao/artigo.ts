// Artigo (regra 5) e rubrica, o nome do artigo (regra 4). Tudo casa na chave (mesmos índices do
// texto). Casos do corpus (colados de corpus/normas/, 24/09/2026): "Art. 1º -", "Art 67.",
// "Art.246.", "Art. 60.Nos…", "Art. 216-A .", "Art. 359-M-A.", "Artigo 1º -" (ALESP), a capitular
// "A rt. 334" (CP, tachado); rubricas do CP ("Anterioridade da Lei", "Lugar do crime (Redação
// dada…)", "(VETADO) (Incluído…)", "DISPOSIÇÕES FINAIS"). Medidas em `planos/F2.md` › "Fatos do
// estruturador (8.3)".
import { ehCaixaAlta, type Linha } from './linhas';
import { lerNotasDaLinha, separarNotasFinais } from './notas';
import type { NotaDeVigencia } from './rascunho';

export interface InicioDeArtigo {
  /** `art9A`, `art1000`, `artUnico` (o estruturador acrescenta o prefixo do bloco: `adct.art1`). */
  endereco: string;
  /** Rótulo de exibição: "Art. 1º", "Art. 10", "Art. 1.000", "Art. 9º-A", "Art. único". */
  rotulo: string;
  /** Onde o texto começa, depois do separador. */
  fim: number;
}

/**
 * Palavra ("Art.", "Art", "Artigo", em maiúscula ou com a capitular separada: "A rt."), número
 * (com milhar) ou "único", ordinal, sufixo e separador. O sufixo tem o hífen colado ("9º-A",
 * "359-M-A") ou, sem hífen, a letra colada seguida de separador ("9ºA."): com espaço em volta, o
 * traço é separador ("Art. 1º - A execução"; fatos da normalização). "art." em minúscula é
 * citação, nunca artigo.
 */
const INICIO =
  /^(?:A ?rt(?:igo)?|A ?RT(?:IGO)?)(?: *\.)? *(?:(\d{1,4}(?:\.\d{3})*)(?: ?º)?|([ÚUúu]nico|[ÚU]NICO)(?!\p{L}))((?:-[A-Z](?!\p{L}))+|[A-Z](?= *[.:-]| *$))?(?: *\.)? *(?:- *)?/u;

/** Só a palavra, com o número na linha seguinte ("Art" quebrado). */
export const ARTIGO_QUEBRADO = /^(?:A ?rt(?:igo)?|A ?RT(?:IGO)?)(?: *\.)?$/u;

export function lerInicioDeArtigo(chave: string): InicioDeArtigo | undefined {
  const m = INICIO.exec(chave);
  if (!m) return undefined;
  const [lido, numero, unico, sufixo = ''] = m;
  const letras = sufixo.replace(/-/g, '');
  const rotuloSufixo = letras ? '-' + letras.split('').join('-') : '';
  if (unico !== undefined)
    return { endereco: `artUnico${letras}`, rotulo: `Art. único${rotuloSufixo}`, fim: lido.length };
  const n = numero ?? '';
  const ordinal = Number(n.replace(/\./g, '')) < 10 ? 'º' : '';
  return {
    endereco: `art${n.replace(/\./g, '')}${letras}`,
    rotulo: `Art. ${n}${ordinal}${rotuloSufixo}`,
    fim: lido.length,
  };
}

/**
 * No corpus, a rubrica mais longa tem 110 caracteres sem as notas (CP, art. 171-A: "Fraude com a
 * utilização de ativos virtuais…"); o limite deixa folga e barra parágrafo inteiro.
 */
const MAX_RUBRICA = 160;

/**
 * Começo de dispositivo do artigo anterior, nunca rubrica: parágrafo, inciso (com hífen, ou sem
 * ele antes de minúscula: "IV as ilhas", CF), "Pena - …" e "Pena Detenção…" (CDC, sem hífen; já
 * "Pena de multa" e "Pena cumprida no estrangeiro" são rubricas do CP). Alínea, item, citação
 * entre aspas e nota da ALESP ("- …") não começam em maiúscula. Sem `i`: com ele, "Mil…" e
 * "Civil…" seriam numeral romano.
 */
const DISPOSITIVO =
  /^(?:Par[áa]grafo [úu]nico|PAR[ÁA]GRAFO [ÚU]NICO|[IVXLCDM]+(?:-[A-Z])?(?: *-| +\p{Ll})|(?:Pena|PENA) *[-:]|Pena +(?:[Rr]eclus|[Dd]eten|[Pp]ris|[Mm]ulta)\p{L}*(?!\p{L}))/u;

/** "(VETADO)" no lugar da rubrica (CP, arts. 359-O, 359-Q e 359-U). */
const RUBRICA_VETADA = /^\(VETAD[OA]\)\.?$/iu;

export interface Rubrica {
  /** Onde o texto da rubrica acaba (as notas vêm depois). */
  fim: number;
  notas: NotaDeVigencia[];
  /**
   * Heurística (regra 12, confiança média): termina em ponto (CP, art. 218-B: "…ou de
   * vulnerável.") ou está em caixa alta ("DISPOSIÇÕES FINAIS", título sem rótulo antes do art. 360
   * do CP). No corpus não há outro caso; fora dele, a frase final do artigo anterior poderia
   * passar por rubrica.
   */
  duvidosa: boolean;
}

/**
 * Regra 4: linha que pode ser a rubrica do artigo seguinte. Quem chama confirma (o artigo vem logo
 * depois, só com notas e tachado no meio) ou devolve a linha ao artigo anterior.
 */
export function lerRubrica(l: Linha): Rubrica | undefined {
  if (
    l.tachada ||
    l.texto.length > 8 * MAX_RUBRICA ||
    ARTIGO_QUEBRADO.test(l.chave) ||
    lerNotasDaLinha(l)
  )
    return undefined;
  const { fim, notas } = separarNotasFinais(l);
  const chave = l.chave.slice(0, fim).trim();
  if (chave.length === 0 || chave.length > MAX_RUBRICA) return undefined;
  const vetada = RUBRICA_VETADA.test(chave);
  if (!vetada && (!/^\p{Lu}/u.test(chave) || DISPOSITIVO.test(chave))) return undefined;
  // Frase que continua: é texto do artigo anterior.
  if (/[;:,]$/.test(chave)) return undefined;
  return { fim, notas, duvidosa: !vetada && (chave.endsWith('.') || ehCaixaAlta(chave)) };
}
