// Linha tachada (regras 8 e 9, F2, 8.6): o que ela é (artigo, dispositivo, nó estrutural, pena,
// nota ou outra linha), as notas de fora do tachado e o trecho que vira a redação anterior. Tudo
// casa na chave (mesmos índices do texto). Formas do corpus (colados de corpus/normas/, 29/09/2026):
// "~~Art. 185 - …~~", "~~Art. 350 - …~~ (Revogado pela Lei nº 13.869, de 2019) (Vigência)",
// "§ 2º ~~texto~~ (Revogado…)", "III ~~- classistas…~~ (Revogado…)", "c~~) os nascidos…~~", a
// capitular "A~~rt. 76.~~" e "A ~~rt. 334…~~", o pedaço do rótulo separado por um espaço ("I ~~V -
// abrigo;~~", ECA, art. 90; "I ~~I - ocorrer…~~", CP, art. 45), "~~Pena - …~~ (Revogado…)",
// "~~- Artigo 9º com redação dada pela…~~" (ALESP) e "~~TÍTULO IV~~". Medidas em `planos/F2.md` ›
// "Fatos do estruturador (8.6)".
import type { Trecho } from '../../core/seguranca/sanitizador';
import { lerInicioDeArtigo, lerRubrica, type InicioDeArtigo } from './artigo';
import { lerRotuloDeDispositivo, type RotuloDeDispositivo } from './dispositivo';
import { lerRotuloEstrutural, type RotuloEstrutural } from './estrutura';
import { aparar, recortar, type Linha } from './linhas';
import { chaveDeCasamento } from './normalizacao';
import { lerNotasDaLinha, separarNotasFinais } from './notas';
import type { NotaDeVigencia, RedacaoAnterior } from './rascunho';

/**
 * "Pena - …", "Pena: …" e "Pena Detenção…" (CDC, sem hífen) continuam o último dispositivo;
 * "Pena de multa" e "Pena cumprida no estrangeiro" são rubricas do CP.
 */
export const PENA =
  /^(?:Penas?|PENAS?) *[-:]|^Penas? +(?:[Rr]eclus|[Dd]eten|[Pp]ris|[Mm]ulta)\p{L}*(?!\p{L})/u;

export type TipoDaTachada = 'estrutural' | 'artigo' | 'dispositivo' | 'pena' | 'nota' | 'outra';

export interface LinhaTachada {
  tipo: TipoDaTachada;
  /**
   * A linha em que o rótulo foi lido: a própria ou, com o pedaço do rótulo separado do tachado
   * por um espaço ("I ~~V - abrigo;~~"), a linha sem esse espaço ("IV - abrigo;").
   */
  linha: Linha;
  artigo?: InicioDeArtigo;
  dispositivo?: RotuloDeDispositivo;
  estrutural?: RotuloEstrutural;
  /** Notas depois do último trecho tachado ("(Revogado pela Lei…) (Vigência)"): são da linha, não da redação. */
  notasFora: NotaDeVigencia[];
  /** Regra 9: nota de revogação fora do tachado, sem texto vigente. */
  revoga: boolean;
  /** A redação: a linha até o fim do tachado (rótulo de fora, texto e notas tachadas), sem as notas de fora. */
  trechos: Trecho[];
  /** Parece rubrica (linha curta em maiúscula, sem ";" nem ":" no fim): o nome antigo do dispositivo seguinte. */
  rubrica: boolean;
}

/** Onde acaba o último trecho tachado com texto. */
function fimDoTachado(l: Linha): number {
  let pos = 0;
  let fim = 0;
  for (const t of l.trechos) {
    pos += t.texto.length;
    if (t.tachado && /\S/.test(t.texto)) fim = pos - (t.texto.length - t.texto.trimEnd().length);
  }
  return fim;
}

/**
 * Pedaço do rótulo fora do tachado, separado dele por um espaço ("I ~~V - abrigo;~~", ECA, art. 90;
 * "I ~~I - ocorrer…~~", CP, art. 45): a linha sem o espaço, para o rótulo ser lido inteiro.
 */
function semEspacoNoRotulo(l: Linha): Linha | undefined {
  const m = /^([IVXLC]+) (?=\S)/u.exec(l.chave);
  const pedaco = m?.[1];
  if (!m || pedaco === undefined) return undefined;
  const fora = recortar(l.trechos, 0, pedaco.length);
  const depois = recortar(l.trechos, m[0].length, m[0].length + 1);
  if (fora.some((t) => t.tachado) || !depois.every((t) => t.tachado)) return undefined;
  const trechos = [...fora, ...recortar(l.trechos, m[0].length, l.texto.length)];
  const texto = pedaco + l.texto.slice(m[0].length);
  return { ...l, trechos, texto, chave: chaveDeCasamento(texto) };
}

/**
 * Inciso com sufixo sem hífen nem separador, todo tachado (CF, art. 93: "~~VIIIA a remoção a
 * pedido…~~", o VIII-A antigo): a linha com o hífen, para o rótulo ser lido.
 */
function comHifenNoSufixo(l: Linha): Linha | undefined {
  const m = /^([IVXLC]+)([A-Z]) (?=\p{Ll})/u.exec(l.chave);
  const numeral = m?.[1];
  if (!m || numeral === undefined || recortar(l.trechos, 0, m[0].length).some((t) => !t.tachado))
    return undefined;
  const trechos = [
    ...recortar(l.trechos, 0, numeral.length),
    { texto: '-', tachado: true as const },
    ...recortar(l.trechos, numeral.length, l.texto.length),
  ];
  const texto = `${numeral}-${l.texto.slice(numeral.length)}`;
  return { ...l, trechos, texto, chave: chaveDeCasamento(texto) };
}

/**
 * A redação de uma linha tachada (a linha até o fim do tachado) e as notas de fora do tachado,
 * sem ler o que ela é (o texto bruto do anexo tachado, regra 11, não se estrutura).
 */
export function tachadoENotasFora(l: Linha): Pick<LinhaTachada, 'trechos' | 'notasFora'> {
  const fim = fimDoTachado(l);
  return {
    trechos: aparar(recortar(l.trechos, 0, fim)),
    notasFora: fim < l.texto.length ? separarNotasFinais(l, fim).notas : [],
  };
}

/** Lê a linha tachada (`linha.tachada`); `artigo` é o que `lerInicioDeArtigo` já achou na chave. */
export function lerLinhaTachada(l: Linha, artigo = lerInicioDeArtigo(l.chave)): LinhaTachada {
  const { trechos, notasFora } = tachadoENotasFora(l);
  const base = {
    notasFora,
    revoga: notasFora.some((n) => n.tipo === 'revogado'),
    trechos,
    rubrica: false,
  };
  const estrutural = lerRotuloEstrutural({ ...l, tachada: false });
  if (estrutural) return { ...base, tipo: 'estrutural', linha: l, estrutural };
  if (artigo) return { ...base, tipo: 'artigo', linha: l, artigo };
  const dispositivo = lerRotuloDeDispositivo(l);
  if (dispositivo) return { ...base, tipo: 'dispositivo', linha: l, dispositivo };
  for (const junta of [semEspacoNoRotulo(l), comHifenNoSufixo(l)]) {
    if (!junta) continue;
    const a = lerInicioDeArtigo(junta.chave);
    if (a) return { ...base, tipo: 'artigo', linha: junta, artigo: a };
    const d = lerRotuloDeDispositivo(junta);
    if (d) return { ...base, tipo: 'dispositivo', linha: junta, dispositivo: d };
  }
  if (PENA.test(l.chave)) return { ...base, tipo: 'pena', linha: l };
  if (/^[-–] \S/u.test(l.chave) || lerNotasDaLinha(l)) return { ...base, tipo: 'nota', linha: l };
  return {
    ...base,
    tipo: 'outra',
    linha: l,
    rubrica: lerRubrica({ ...l, tachada: false }) !== undefined,
  };
}

/** Redação anterior de uma linha tachada: nasce confirmada (regra 8, `tachado`). */
export function redacaoDe(
  trechos: Trecho[],
  inicio: number,
  fim: number,
  nota?: string,
): RedacaoAnterior {
  return {
    trechos,
    ...(nota ? { nota } : {}),
    origemDeteccao: 'tachado',
    confirmada: true,
    linhas: { inicio, fim },
  };
}

/** Limite de `RedacaoAnterior.nota` (modelo). */
const MAX_NOTA = 2_000;

/** Acrescenta as notas (texto) à nota da redação, separadas por espaço, até o limite do modelo. */
export function anotar(redacao: RedacaoAnterior, notas: readonly { texto: string }[]): void {
  if (notas.length === 0) return;
  const atual = redacao.nota ?? '';
  if (atual.length >= MAX_NOTA) return;
  const novas = notas.map((n) => n.texto).join(' ');
  redacao.nota = (atual ? `${atual} ${novas}` : novas).slice(0, MAX_NOTA);
}

/** Texto do dispositivo revogado sem mais nada ("(Revogado)", "Revogado.", ALESP "Revogado."). */
export const SO_REVOGADO = /^\(?\s*revogad[oa]s?\s*\)?[\s.;,:]*$/iu;
/** Texto do dispositivo vetado ("(VETADO)", "VETADO.", "Vetado", ALESP "vetado."). */
export const SO_VETADO = /^\(?\s*vetad[oa]s?\s*\)?[\s.;,:]*$/iu;
