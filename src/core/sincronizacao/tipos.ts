// Porta de sincronização (F4-B, B2; plano em docs/planos/f4b-sincronizacao.md §1–§2).
// O núcleo só conhece esta interface; o Supabase entra por `integracoes/conta`.
import type { Alteracao } from '../persistencia';

/** Entrada do log local como o servidor a recebe (`arretado.enviar_lote`). */
export interface EntradaDeEnvio {
  ts: string;
  colecao: string;
  registro_id: string;
  operacao: Alteracao['operacao'];
  dados?: Record<string, unknown>;
  removidos?: string[];
  /** `ts` do registro como este aparelho o via antes da edição; `null` se criou. */
  base_ts: string | null;
}

export interface DivergenciaNoServidor {
  colecao: string;
  registro_id: string;
  /** `ts_logico` que o servidor tem hoje para o registro (`null` = não existe). */
  ts_servidor: string | null;
}

export interface RespostaDeEnvio {
  seq_max: number;
  divergentes: DivergenciaNoServidor[];
}

/**
 * Falha de uma chamada ao servidor. `definitiva` = o servidor recusou aquele conteúdo (4xx): repetir
 * não adianta e a entrada vai para a quarentena. Sem `definitiva` (rede, 5xx, sessão): tenta de novo.
 */
export class FalhaDeSincronizacao extends Error {
  constructor(
    mensagem: string,
    readonly definitiva: boolean,
  ) {
    super(mensagem);
    this.name = 'FalhaDeSincronizacao';
  }
}

export interface ServidorDeSincronizacao {
  /** Envio idempotente: o mesmo lote duas vezes tem o efeito de um (índice único no servidor). */
  enviarLote(
    aparelhoId: string,
    versaoEsquema: number,
    entradas: EntradaDeEnvio[],
  ): Promise<RespostaDeEnvio>;
}
