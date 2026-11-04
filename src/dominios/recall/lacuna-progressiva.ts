// A lacuna que cresce com a revisão (ideia 3 de "Fio que ensina", 04/11/2026). O cartão de lacuna
// nasce escondendo só o trecho que a pessoa escolheu (nível 0). A cada acerto o cartão sobe de caixa
// e, junto, mais palavras de conteúdo somem da frente, até restar a frase quase em branco; errar
// derruba a caixa e a lacuna volta a encolher. O nível sai da caixa do cartão: nada novo no esquema,
// nada gravado, e a frente guardada no cartão continua sendo a do nível 0.
import type { Cartao, Intervalo } from '../../core/modelo';
import { normalizarOcultos, textoComLacunas } from './servico';

/** O último nível: todas as palavras de conteúdo escondidas. */
export const NIVEL_MAXIMO_DA_LACUNA = 3;
/** Número de qualquer tamanho ("16", "30", "1.001"): na lei é o que mais cai, então some primeiro. */
const NUMERO = /\p{N}+(?:[.,]\p{N}+)*/gu;
/** Palavra de conteúdo: pelo menos cinco letras. */
const PALAVRA = /\p{L}{5,}/gu;

/** O nível da lacuna na caixa 1 a 6: caixa 1 = o que a pessoa escolheu; até o nível máximo. */
export function nivelDaLacuna(caixa: number): number {
  return Math.max(0, Math.min(NIVEL_MAXIMO_DA_LACUNA, Math.floor(caixa) - 1));
}

/**
 * Os trechos escondidos no nível: os da pessoa mais uma fatia das palavras de conteúdo que sobram
 * (um terço, dois terços, todas): os números de qualquer tamanho primeiro, depois as palavras mais
 * longas, e no empate as primeiras do texto.
 */
export function ocultosDoNivel(
  texto: string,
  base: readonly Intervalo[],
  nivel: number,
): Intervalo[] {
  const escolhidos = normalizarOcultos(texto, base);
  const n = Math.max(0, Math.min(NIVEL_MAXIMO_DA_LACUNA, Math.floor(nivel)));
  if (n === 0) return escolhidos;
  const achar = (re: RegExp) =>
    [...texto.matchAll(re)]
      .map((m) => ({ inicio: m.index, fim: m.index + m[0].length }))
      .filter((p) => !escolhidos.some((o) => p.inicio < o.fim && p.fim > o.inicio));
  // Primeiro os números, na ordem do texto; depois as palavras, das mais longas às mais curtas.
  const numeros = achar(NUMERO);
  const palavras = achar(PALAVRA).sort(
    (a, b) => b.fim - b.inicio - (a.fim - a.inicio) || a.inicio - b.inicio,
  );
  const ordem = [...numeros, ...palavras];
  const quantas = Math.min(
    ordem.length,
    Math.max(1, Math.round((ordem.length * n) / NIVEL_MAXIMO_DA_LACUNA)),
  );
  return normalizarOcultos(texto, [...escolhidos, ...ordem.slice(0, quantas)]);
}

/**
 * A frente que a Revisão mostra. Só cresce a lacuna de um cartão que ainda é o que foi criado: com
 * a frente editada à mão, ou sem o texto inteiro no verso, fica a frente guardada.
 */
export function frenteDaRevisao(cartao: Cartao): string {
  const { verso, ocultos } = cartao;
  if (cartao.tipo !== 'lacuna' || verso === null || !ocultos?.length) return cartao.frente;
  if (textoComLacunas(verso, ocultos) !== cartao.frente) return cartao.frente;
  const nivel = nivelDaLacuna(cartao.caixa);
  return nivel === 0
    ? cartao.frente
    : textoComLacunas(verso, ocultosDoNivel(verso, ocultos, nivel));
}

/** O cartão mostra mais lacuna do que a pessoa escolheu. */
export function lacunaCresceu(cartao: Cartao): boolean {
  return frenteDaRevisao(cartao) !== cartao.frente;
}
