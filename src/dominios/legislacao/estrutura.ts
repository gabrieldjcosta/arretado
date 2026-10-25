// Hierarquia estrutural (regra 3): o rótulo do nó (PARTE, LIVRO, TÍTULO, CAPÍTULO, SEÇÃO,
// SUBSEÇÃO + numeral) e o segmento do endereço. A palavra aceita qualquer caixa ("Seção I" na LEP,
// "Título I" no ECA); o numeral romano, só maiúsculo ("Parte civil" não é nó). Com sufixo
// ("CAPÍTULO II-A", "Seção V-A": fatos do gabarito). Casos: `planos/F2.md` › "Fatos do gabarito".
import type { Linha } from './linhas';

export type TipoEstrutural = 'parte' | 'livro' | 'titulo' | 'capitulo' | 'secao' | 'subsecao';

/** Profundidade: um nó fica sob o último nó de nível menor (nível ausente é permitido). */
export const NIVEL: Record<TipoEstrutural, number> = {
  parte: 0,
  livro: 1,
  titulo: 2,
  capitulo: 3,
  secao: 4,
  subsecao: 5,
};

/** Prefixo do segmento no endereço (`parteEspecial.tit6.cap1`; glossário §12). */
const PREFIXO: Record<TipoEstrutural, string> = {
  parte: 'parte',
  livro: 'liv',
  titulo: 'tit',
  capitulo: 'cap',
  secao: 'sec',
  subsecao: 'subsec',
};

export interface RotuloEstrutural {
  tipo: TipoEstrutural;
  /** Como veio ("CAPÍTULO II-A", "Seção I", "PARTE GERAL"). */
  rotulo: string;
  /** Segmento do endereço ("cap2A", "sec1", "parteGeral", "titUnico"). */
  segmento: string;
  /** Onde começa o resto da linha (nome ou nota na mesma linha), depois do separador. */
  resto: number;
}

const PALAVRA = /^(parte|livro|t[ií]tulo|cap[ií]tulo|subse[cç][aã]o|se[cç][aã]o) +(?=\S)/iu;
// Ordinal por extenso ("LIVRO PRIMEIRO" do CTN, "PARTE SEGUNDA" do Código Eleitoral) e "LIVRO COMPLEMENTAR" do CC.
const NUMERAL =
  /^(GERAL|Geral|ESPECIAL|Especial|COMPLEMENTAR|Complementar|(?:PRIMEIR|SEGUND|TERCEIR|QUART|QUINT|SEXT|S[ÉE]TIM|OITAV|NON|D[ÉE]CIM)[OA]|(?:Primeir|Segund|Terceir|Quart|Quint|Sext|S[ée]tim|Oitav|Non|D[ée]cim)[oa]|[IVXLCDM]+|\d{1,3}|[ÚU]NIC[OA]|[ÚU]nic[oa])(?:-([A-Z]))?(?=$|[\s.:\-(])/u;
const SEPARADOR = /^\s*(?:[-.:]\s*)?/;

const TIPO: Record<string, TipoEstrutural> = {
  parte: 'parte',
  livro: 'livro',
  titulo: 'titulo',
  capitulo: 'capitulo',
  secao: 'secao',
  subsecao: 'subsecao',
};

/** Rótulo estrutural no começo da linha; `undefined` se a linha não abre nó. */
export function lerRotuloEstrutural(linha: Linha): RotuloEstrutural | undefined {
  if (linha.tachada) return undefined;
  const p = PALAVRA.exec(linha.chave);
  if (!p?.[1]) return undefined;
  const depois = linha.chave.slice(p[0].length);
  const n = NUMERAL.exec(depois);
  if (!n?.[1]) return undefined;
  const tipo = TIPO[semAcento(p[1]).toLowerCase()];
  if (tipo === undefined) return undefined;
  const fimRotulo = p[0].length + n[0].length;
  const resto = fimRotulo + (SEPARADOR.exec(linha.chave.slice(fimRotulo))?.[0].length ?? 0);
  return {
    tipo,
    rotulo: linha.texto.slice(0, fimRotulo),
    segmento: PREFIXO[tipo] + numeral(n[1]) + (n[2] ?? ''),
    resto,
  };
}

function numeral(bruto: string): string {
  const n = semAcento(bruto).toLowerCase();
  const palavra = PALAVRA_NUMERAL[n];
  if (palavra !== undefined) return palavra;
  const ordinal = ORDINAIS.findIndex((o) => n.startsWith(o));
  if (ordinal >= 0) return String(ordinal + 1);
  if (/^\d+$/.test(n)) return String(Number(n));
  return String(romano(bruto));
}

const PALAVRA_NUMERAL: Record<string, string> = {
  geral: 'Geral',
  especial: 'Especial',
  complementar: 'Complementar',
  unico: 'Unico',
  unica: 'Unico',
};

/** Raiz do ordinal por extenso, na ordem: "primeir" (primeiro, primeira) vale 1, "segund" vale 2… */
const ORDINAIS = [
  'primeir',
  'segund',
  'terceir',
  'quart',
  'quint',
  'sext',
  'setim',
  'oitav',
  'non',
  'decim',
];

const VALOR: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Romano → número ("XIV" → 14). */
export function romano(texto: string): number {
  let total = 0;
  for (let i = 0; i < texto.length; i++) {
    const v = VALOR[texto.charAt(i)] ?? 0;
    const prox = VALOR[texto.charAt(i + 1)] ?? 0;
    total += v < prox ? -v : v;
  }
  return total;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');
