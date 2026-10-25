// Repetição espaçada em 6 caixas fixas (D10; Parte 2 §8.2 ex. 4 e §10.5).
import { dataCivil, diferencaEmDias, somarDias } from '../../core/datas';
import type { DataCivil, Faixa, RespostaFrase, RespostaRevisao } from '../../core/modelo';

/** Intervalo em dias de cada caixa (1 a 6). */
export const INTERVALOS = [1, 3, 7, 15, 30, 60] as const;
export const CAIXA_MAXIMA = INTERVALOS.length;

export function intervaloDaCaixa(caixa: number): number {
  const i = Math.min(Math.max(Math.trunc(caixa), 1), CAIXA_MAXIMA) - 1;
  return INTERVALOS[i] ?? 1;
}

/** A prova do Concurso ativo e, quando o item aponta para um Ponto, a faixa dele (AP-03). */
export interface Prova {
  data: DataCivil;
  faixa?: Faixa | undefined;
}

/** Quantos dias antes da prova fica a passada final dos Pontos de faixa Altíssima e Alta. */
export const PASSADA_FINAL_DIAS = 7;

/**
 * Nenhuma Revisão nova cai depois da prova, e os itens de faixa Altíssima e Alta passam pelo menos
 * uma vez na última semana (dentro das últimas três). Só limita o que está sendo agendado agora:
 * datas já marcadas não são reescritas. Sem prova, ou com a prova hoje ou já passada, nada muda.
 */
export function limitarPelaProva(proxima: DataCivil, hoje: DataCivil, prova?: Prova): DataCivil {
  if (!prova || prova.data <= hoje) return proxima;
  const amanha = somarDias(hoje, 1);
  const ultimoDia = max(somarDias(prova.data, -1), amanha);
  let alvo = proxima;
  if (prova.faixa === 'altissima' || prova.faixa === 'alta') {
    const passada = somarDias(prova.data, -PASSADA_FINAL_DIAS);
    if (passada > hoje && alvo > passada) alvo = passada;
  }
  return alvo > ultimoDia ? ultimoDia : alvo;
}

const max = (a: string, b: string) => (a > b ? a : b);

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
  prova?: Prova,
): Agendamento {
  const caixaDepois =
    resposta === 'errei'
      ? 1
      : resposta === 'dificil'
        ? estado.caixa
        : Math.min(estado.caixa + 1, CAIXA_MAXIMA);
  return {
    caixaDepois,
    proximaDepois: limitarPelaProva(somarDias(hoje, intervaloDaCaixa(caixaDepois)), hoje, prova),
    atrasoDias: Math.max(0, diferencaEmDias(estado.proximaRevisao, hoje)),
  };
}

export interface AgendamentoDeFrase {
  proximaDepois: string;
  atrasoDias: number;
}

/**
 * Frase não tem caixa: o intervalo anterior é a distância entre a última revisão e a data marcada
 * (1 dia quando nunca foi revisada). "Li" sobe para o próximo degrau de {@link INTERVALOS};
 * "De novo" volta para 1 dia. Atraso não penaliza.
 */
export function agendarFrase(
  estado: { proximaRevisao: string; ultimaRevisao?: string },
  resposta: RespostaFrase,
  hoje: string,
  prova?: Prova,
): AgendamentoDeFrase {
  const atrasoDias = Math.max(0, diferencaEmDias(estado.proximaRevisao, hoje));
  if (resposta === 'de_novo') {
    return { proximaDepois: limitarPelaProva(somarDias(hoje, 1), hoje, prova), atrasoDias };
  }
  const anterior = estado.ultimaRevisao
    ? Math.max(1, diferencaEmDias(dataCivil(new Date(estado.ultimaRevisao)), estado.proximaRevisao))
    : 1;
  const proximo = INTERVALOS.find((i) => i > anterior) ?? 60;
  return { proximaDepois: limitarPelaProva(somarDias(hoje, proximo), hoje, prova), atrasoDias };
}
