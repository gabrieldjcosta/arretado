// Como o Hoje chama uma ação: o título da folha (em verbo) e o rótulo do botão de vidro.
import type { ProximaAcao } from '../../dominios/hoje/contrato';

/** Título em verbo: a ação primeiro, o motivo logo abaixo. */
export function tituloDaAcao(acao: ProximaAcao): string {
  return acao.tipo === 'leitura_salva' ? 'Continuar a leitura' : (acao.alvo.rotulo ?? acao.razao);
}

/**
 * O motivo na folha. Quem parou de ler já vê onde na linha de parada, logo acima da folha: ela não
 * repete.
 */
export function motivoDaAcao(acao: ProximaAcao): string | undefined {
  return acao.tipo === 'leitura_salva' ? undefined : acao.razao;
}

/** "Continuar" para quem já estava lendo; "Começar" para o resto. */
export function rotuloDoBotao(acao: ProximaAcao): string {
  return acao.tipo === 'leitura_salva' ? 'Continuar' : 'Começar';
}
