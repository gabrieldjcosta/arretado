// Contrato da Próxima ação (F3-A, pacote A1). Só tipos e a assinatura; o pacote A1 implementa.
// Domínio puro: lê o Repositório, não grava e não depende de tela.
import type { AlvoDeAcao, OrigemDaAcao } from '../../core/modelo';
import type { DataCivil } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

/** O que o Hoje sugere fazer agora: uma só coisa, com a razão em palavras simples. */
export interface ProximaAcao {
  /** Mesmo vocabulário gravado na Sessão (`Sessao.origemDaAcao.tipo`). */
  tipo: OrigemDaAcao['tipo'];
  alvo: AlvoDeAcao;
  /** Por que esta ação, em uma frase ("3 cartões vencidos"). Nunca culpa nem cobra. */
  razao: string;
  /** Minutos prováveis; ausente quando não há base honesta para estimar. */
  estimativaMin?: number;
}

/** Um dos três começos concretos do estado vazio (nenhum material ainda). */
export interface ComecoSugerido {
  id: 'adicionar_material' | 'escolher_materia' | 'sessao_curta';
  rotulo: string;
  /** Rota do app que o começo abre. */
  para: string;
}

export type ResultadoProximaAcao =
  | { tipo: 'acao'; acao: ProximaAcao }
  | { tipo: 'vazio'; comecos: readonly [ComecoSugerido, ComecoSugerido, ComecoSugerido] };

export interface OpcoesProximaAcao {
  /** "Escolher outra coisa": tipos que a pessoa dispensou agora (não grava nada). */
  excluir?: readonly OrigemDaAcao['tipo'][];
}

/**
 * Ordem do pacote A1: revisão vencida → leitura salva → vazio com três começos. Não implementado
 * no P0.
 */
export type EscolherProximaAcao = (
  repo: Repositorio,
  hoje: DataCivil,
  opcoes?: OpcoesProximaAcao,
) => Promise<ResultadoProximaAcao>;

export const escolherProximaAcao: EscolherProximaAcao = () =>
  Promise.reject(new Error('escolherProximaAcao: não implementado (pacote A1)'));
