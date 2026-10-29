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
  /** Só no tipo `ciclo`: o bloco do Ciclo que a Sessão vai trabalhar (alvo.id = Ciclo). */
  blocoOrdem?: number;
  /**
   * Só em `leitura_salva` com Mapa da norma (decisão de 27/10/2026): o Agora é o próximo trecho que
   * mais cai, não o resto da seção. `continuar` guarda a leitura de onde parou, a alternativa.
   */
  trecho?: {
    /** Endereço do primeiro artigo do trecho (`?ir=` do Leitor). */
    endereco: string;
    /** "art. 2º" ou "arts. 3º a 4º". */
    rotulo: string;
    continuar: { razao: string; estimativaMin?: number };
  };
}

/** Um dos três começos concretos do estado vazio (nenhum material ainda). */
export interface ComecoSugerido {
  id: 'escolher_concurso' | 'ler_norma' | 'registrar_erro';
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
 * Ordem do pacote A1: revisão vencida → leitura salva → vazio com três começos. Implementada em
 * `proxima-acao.ts`.
 */
export type EscolherProximaAcao = (
  repo: Repositorio,
  hoje: DataCivil,
  opcoes?: OpcoesProximaAcao,
) => Promise<ResultadoProximaAcao>;
