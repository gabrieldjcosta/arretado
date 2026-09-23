// Repetição espaçada em 6 caixas fixas (D10; Parte 2 §8.2 ex. 4 e §10.5).
import { diferencaEmDias, somarDias } from '../../core/datas';
import type { RespostaRevisao } from '../../core/modelo';

/** Intervalo em dias de cada caixa (1 a 6). */
export const INTERVALOS = [1, 3, 7, 15, 30, 60] as const;
export const CAIXA_MAXIMA = INTERVALOS.length;

export function intervaloDaCaixa(caixa: number): number {
  const i = Math.min(Math.max(Math.trunc(caixa), 1), CAIXA_MAXIMA) - 1;
  return INTERVALOS[i] ?? 1;
}

export interface Agendamento {
  caixaDepois: number;
  proximaDepois: string;
  /** Dias de atraso na hora da revisão (informativo; atraso não penaliza). */
  atrasoDias: number;
}

/**
 * "Errei" → caixa 1; "Difícil" → mantém a caixa (mesmo intervalo); "Fácil" → caixa + 1
 * (até a 6). A próxima revisão conta a partir do dia da revisão.
 */
export function agendar(
  estado: { caixa: number; proximaRevisao: string },
  resposta: RespostaRevisao,
  hoje: string,
): Agendamento {
  const caixaDepois =
    resposta === 'errei'
      ? 1
      : resposta === 'dificil'
        ? estado.caixa
        : Math.min(estado.caixa + 1, CAIXA_MAXIMA);
  return {
    caixaDepois,
    proximaDepois: somarDias(hoje, intervaloDaCaixa(caixaDepois)),
    atrasoDias: Math.max(0, diferencaEmDias(estado.proximaRevisao, hoje)),
  };
}
