import type { NoDaLeitura } from './leitor';

/**
 * Minutos por artigo na estimativa do "Continuar leitura" (redesign, fatia 4). Palpite de partida
 * para um artigo de tamanho médio; ajustável pelo uso real, como o `SEGUNDOS_POR_CARTAO` do Recall.
 */
export const MINUTOS_POR_ARTIGO = 1;

/** Tipos que abrem uma divisão da norma: a "seção" da estimativa vai até a próxima do mesmo nível. */
const DIVISOES = new Set(['parte', 'livro', 'titulo', 'capitulo', 'secao', 'subsecao', 'anexo']);

/**
 * Quantos artigos faltam, a partir do nó `indice`, até o fim da divisão em que ele está (a mais
 * próxima acima dele) ou até o fim da norma, se não há divisão. O próprio artigo conta, se for um.
 */
export function artigosAteOFimDaSecao(nos: readonly NoDaLeitura[], indice: number): number {
  if (indice < 0 || indice >= nos.length) return 0;
  let nivelDaDivisao: number | undefined;
  for (let i = indice; i >= 0; i--) {
    const no = nos[i];
    if (no && DIVISOES.has(no.dispositivo.tipo)) {
      nivelDaDivisao = no.nivel;
      break;
    }
  }
  let artigos = 0;
  for (let i = indice; i < nos.length; i++) {
    const no = nos[i];
    if (!no) break;
    const divisao = DIVISOES.has(no.dispositivo.tipo);
    // Uma divisão do mesmo nível ou acima encerra a seção (a própria, se o ponto está nela, não).
    if (i > indice && divisao && nivelDaDivisao !== undefined && no.nivel <= nivelDaDivisao) break;
    if (no.dispositivo.tipo === 'artigo') artigos++;
  }
  return artigos;
}

/** Minutos até o fim da seção, arredondados para cima; nunca menos de 1. */
export function minutosAteOFimDaSecao(nos: readonly NoDaLeitura[], indice: number): number {
  return Math.max(1, Math.ceil(artigosAteOFimDaSecao(nos, indice) * MINUTOS_POR_ARTIGO));
}
