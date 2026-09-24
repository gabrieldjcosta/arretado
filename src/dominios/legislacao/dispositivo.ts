// Parágrafo, inciso, alínea e item (regra 6): o rótulo no começo da linha e o segmento do
// endereço (glossário §12, decidido na 8.4). Tudo casa na chave (mesmos índices do texto). Formas do
// corpus (colados de corpus/normas/, 24/09/2026): "§ 1º -", "§ 1º.", "§ 10.", "§ 5.º" (CDC), "§ 2 As"
// (LC 80, sem ordinal), "§ 2º-B.", "§ 2º -A Considera-se" (CP e ECA, espaço antes do hífen),
// "Parágrafo único."; "I -", "III -jurídica" (LEP), "III --" (CF), "VI-A -", "I-A o Conselho" e
// "IV as ilhas…;" (CF, sem hífen); "a)", "c ) os nascidos" (CF), "b)houve" (CP); "1.", "1)" (ECA),
// "1 -" (ALESP). Medidas em `planos/F2.md` › "Fatos do estruturador (8.4)".
import type { Linha } from './linhas';
import { separarNotasFinais } from './notas';

export type TipoDeDispositivo = 'paragrafo' | 'inciso' | 'alinea' | 'item';

/** Profundidade na hierarquia por sequência (o artigo é 0): o novo fica sob o último de nível menor. */
export const PROFUNDIDADE: Record<TipoDeDispositivo | 'artigo', number> = {
  artigo: 0,
  paragrafo: 1,
  inciso: 2,
  alinea: 3,
  item: 4,
};

export interface RotuloDeDispositivo {
  tipo: TipoDeDispositivo;
  /** Segmento do endereço: `par2`, `par2A`, `parUnico`, `incIII`, `incVIA`, `alB`, `it1`. */
  segmento: string;
  /** Rótulo de exibição: "§ 1º", "§ 10", "§ 2º-A", "Parágrafo único", "VI-A", "b)", "1.". */
  rotulo: string;
  /** Onde o texto começa, depois do separador. */
  fim: number;
}

/**
 * Sufixo com o hífen colado à letra, com ou sem espaço antes ("§ 2º-A", "§ 2º -A Considera-se");
 * com espaço dos dois lados o traço é separador ("§ 1º - A execução"). Sem hífen, só a letra colada
 * seguida de separador ("§ 1ºA."), como no artigo.
 */
const SUFIXO = String.raw`((?: ?-[A-Z](?!\p{L}))+|[A-Z](?= *[.:-]| *$))?`;

const PARAGRAFO = new RegExp(
  String.raw`^§ *(\d{1,3})(?: ?º|\.º)?${SUFIXO}(?: *\.(?!\d))? *(?:[-:] *)?`,
  'u',
);
const PARAGRAFO_UNICO =
  /^(?:Par[áa]grafo|PAR[ÁA]GRAFO) +(?:[úu]nico|[ÚU]nico|[ÚU]NICO)(?!\p{L})(?: *[.:])?(?: *-)? */u;
/**
 * Numeral (validado abaixo) e sufixo; depois, hífen (um ou dois; "III -jurídica" sem espaço) ou,
 * sem hífen, espaço antes de minúscula: com sufixo, basta isso ("I-A o Conselho"); sem ele, a linha
 * precisa terminar como inciso (";", ":" ou "."; CF: "IV as ilhas fluviais…;"), senão "I ncidência"
 * (capitular separada, CP de 1940) seria inciso.
 */
const INCISO = /^([IVXLCDM]+)((?: ?-[A-Z](?!\p{L}))*)(?:( *-+ *)| +(?=\p{Ll}))/u;
const ROMANO_VALIDO = /^M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;
const ALINEA = /^([a-z])((?:-[A-Z](?!\p{L}))*) *\) */u;
/** "1.", "1)" (Planalto) ou "1 -" (ALESP); "1.000" e "6º)" (citação, ECA) não são item. */
const ITEM = /^(\d{1,3})((?:-[A-Z](?!\p{L}))*) *(?:[.)](?!\d) *(?:-+ *)?|-+ *)(?=\S)/u;

/**
 * Regra 6: rótulo de parágrafo, inciso, alínea ou item no começo da linha. Rótulo antigo tachado
 * ao lado do novo (ALESP: "~~X~~ XI - outras…", "~~Parágrafo único~~ § 1º - …"): vale o de fora
 * do tachado, e o `fim` conta a partir do começo da linha.
 */
export function lerRotuloDeDispositivo(l: Linha): RotuloDeDispositivo | undefined {
  const depois = inicioForaDoTachado(l);
  if (depois > 0) {
    const r = lerNaChave(l, depois);
    if (r) return r;
  }
  return lerNaChave(l, 0);
}

function lerNaChave(l: Linha, inicio: number): RotuloDeDispositivo | undefined {
  const chave = l.chave.slice(inicio);
  let m = PARAGRAFO.exec(chave);
  if (m) {
    const [lido, numero = '', sufixo] = m;
    const n = Number(numero);
    const letras = letrasDoSufixo(sufixo);
    return {
      tipo: 'paragrafo',
      segmento: `par${String(n)}${letras}`,
      rotulo: `§ ${String(n)}${n < 10 ? 'º' : ''}${rotuloDoSufixo(letras)}`,
      fim: inicio + lido.length,
    };
  }
  m = PARAGRAFO_UNICO.exec(chave);
  if (m)
    return {
      tipo: 'paragrafo',
      segmento: 'parUnico',
      rotulo: 'Parágrafo único',
      fim: inicio + m[0].length,
    };
  m = INCISO.exec(chave);
  if (m) {
    const [lido, numeral = '', sufixo, hifen] = m;
    const letras = letrasDoSufixo(sufixo);
    if (
      ROMANO_VALIDO.test(numeral) &&
      (hifen !== undefined || letras !== '' || terminaComoInciso(l))
    )
      return {
        tipo: 'inciso',
        segmento: `inc${numeral}${letras}`,
        rotulo: `${numeral}${rotuloDoSufixo(letras)}`,
        fim: inicio + lido.length,
      };
    return undefined;
  }
  m = ALINEA.exec(chave);
  if (m) {
    const [lido, letra = '', sufixo] = m;
    const letras = letrasDoSufixo(sufixo);
    return {
      tipo: 'alinea',
      segmento: `al${letra.toUpperCase()}${letras}`,
      rotulo: `${letra}${rotuloDoSufixo(letras)})`,
      fim: inicio + lido.length,
    };
  }
  m = ITEM.exec(chave);
  if (m) {
    const [lido, numero = '', sufixo] = m;
    const letras = letrasDoSufixo(sufixo);
    return {
      tipo: 'item',
      segmento: `it${String(Number(numero))}${letras}`,
      rotulo: `${String(Number(numero))}${rotuloDoSufixo(letras)}.`,
      fim: inicio + lido.length,
    };
  }
  return undefined;
}

const letrasDoSufixo = (sufixo: string | undefined) => (sufixo ?? '').replace(/[\s-]/g, '');
const rotuloDoSufixo = (letras: string) => (letras ? '-' + letras.split('').join('-') : '');

/** O texto sem as notas do fim termina como inciso (";", ":" ou "."). */
function terminaComoInciso(l: Linha): boolean {
  const { fim } = separarNotasFinais(l);
  return /[;:.]$/.test(l.chave.slice(0, fim).trimEnd());
}

/** Linha que começa por um trecho tachado: onde começa o texto de fora dele (0 se não começa). */
function inicioForaDoTachado(l: Linha): number {
  let pos = 0;
  let tachou = false;
  for (const t of l.trechos) {
    if (t.tachado && /\S/.test(t.texto)) tachou = true;
    else if (/\S/.test(t.texto)) break;
    pos += t.texto.length;
  }
  if (!tachou) return 0;
  while (pos < l.chave.length && /\s/.test(l.chave.charAt(pos))) pos++;
  return pos < l.chave.length ? pos : 0;
}
