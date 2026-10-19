// Lacunas sugeridas por regra (sem IA): números, prazos, vedações e negações. A pessoa só confirma.
import type { Intervalo } from '../../core/modelo';
import type { Marcacao } from '../../core/modelo';
import { normalizarOcultos } from './servico';

/** No máximo, tantas sugestões: esconder tudo vira cartão impossível de responder. */
const MAXIMO_DE_SUGESTOES = 6;

/** Borda de palavra que entende acentos (o `\b` do JS só conhece ASCII). */
const palavra = (fonte: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${fonte})(?![\\p{L}\\p{N}])`, 'giu');

const UNIDADE = '(?:dias?|mes(?:es)?|mês|anos?|horas?|semanas?)(?: (?:úteis|corridos))?';
const EXTENSO =
  'um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta|quarenta|sessenta|noventa|cem';

/** Da regra mais valiosa (número, prazo) à mais comum (negação): a ordem decide o corte. */
const REGRAS: readonly RegExp[] = [
  // Prazos e quantias: "30 dias", "cinco anos", "2/3", "50%".
  palavra(`\\d+(?:[.,]\\d+)*\\s*(?:${UNIDADE}|%)`),
  palavra(`(?:${EXTENSO})\\s+${UNIDADE}`),
  palavra(
    '(?:um|dois|três|quatro|cinco) (?:terços?|quartos?|quintos?)|metade|maioria (?:absoluta|simples|qualificada)',
  ),
  palavra('\\d+(?:[.,/]\\d+)*'),
  // Vedações e cabimento.
  palavra(
    'vedad[oa]s?|vedação|proibid[oa]s?|incabíveis?|inadmissíve(?:l|is)|imprescritíve(?:l|is)|inafiançáve(?:l|is)',
  ),
  palavra('é cabíve(?:l|is)|são cabíveis|cabe(?:rá)?|não cabe'),
  // Negação: a mais frequente, por último.
  palavra('não|nunca|jamais'),
];

/** Os trechos que a regra sugere esconder, em ordem de aparição e sem sobreposição. */
export function sugerirOcultos(texto: string): Intervalo[] {
  const escolhidos: Intervalo[] = [];
  for (const regra of REGRAS) {
    for (const m of texto.matchAll(regra)) {
      const achado = { inicio: m.index, fim: m.index + m[0].length };
      const cobre = escolhidos.some((e) => achado.inicio < e.fim && achado.fim > e.inicio);
      if (!cobre && escolhidos.length < MAXIMO_DE_SUGESTOES) escolhidos.push(achado);
    }
  }
  return normalizarOcultos(texto, escolhidos);
}

/**
 * Os grifos do dispositivo como trechos escondidos de uma Frase feita com o texto aparado.
 * `textoGravado`: o texto do dispositivo como as âncoras o conhecem; o aparo do início desloca
 * as âncoras. Grifo fora do texto (versão trocada) é ignorado.
 */
export function ocultosDosGrifos(
  textoGravado: string,
  grifos: readonly Pick<Marcacao, 'tipo' | 'status' | 'ancora'>[],
): { texto: string; ocultos: Intervalo[] } {
  const texto = textoGravado.trim();
  const deslocamento = textoGravado.length - textoGravado.trimStart().length;
  const ocultos = grifos
    .filter((g) => g.tipo === 'grifo' && g.status !== 'pendente')
    .map((g) => ({ inicio: g.ancora.inicio - deslocamento, fim: g.ancora.fim - deslocamento }));
  return { texto, ocultos: normalizarOcultos(texto, ocultos) };
}
