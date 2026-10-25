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

/** Entrada do log do servidor como `alteracoes` a devolve ao puxar (plano §5). */
export interface EntradaRecebida {
  seq: number;
  aparelho_id: string;
  ts: string;
  colecao: string;
  registro_id: string;
  operacao: Alteracao['operacao'];
  dados?: Record<string, unknown> | null;
  removidos?: string[] | null;
  base_ts: string | null;
  /** O servidor não avançou o registro por causa desta entrada: ela não vale para os outros aparelhos. */
  divergente: boolean;
  versao_esquema: number | null;
}

/** Estado atual de um registro no servidor (`registros`); apagado = `excluido_em` preenchido. */
export interface RegistroRemoto {
  colecao: string;
  id: string;
  ts_logico: string;
  dados: Record<string, unknown>;
  excluido_em: string | null;
}

export interface ChaveDeRegistro {
  colecao: string;
  id: string;
}

export interface ServidorDeSincronizacao {
  /** Envio idempotente: o mesmo lote duas vezes tem o efeito de um (índice único no servidor). */
  enviarLote(
    aparelhoId: string,
    versaoEsquema: number,
    entradas: EntradaDeEnvio[],
  ): Promise<RespostaDeEnvio>;
  /** Entradas com `seq` acima de `depoisDe`, em ordem de `seq`; `operacao` restringe a um tipo. */
  puxarLog(
    depoisDe: number,
    limite: number,
    operacao?: Alteracao['operacao'],
  ): Promise<EntradaRecebida[]>;
  /** O registro como o servidor o tem hoje (`null` = nunca existiu). */
  lerRegistro(colecao: string, id: string): Promise<RegistroRemoto | null>;
  /** Maior `seq` do log do usuário; ler antes de baixar `registros` (aparelho novo, plano §1). */
  instantaneoInicio(): Promise<number>;
  /** Página de `registros` por `(colecao, id)` crescente, a partir de `depois` (exclusivo). */
  puxarRegistros(depois: ChaveDeRegistro | null, limite: number): Promise<RegistroRemoto[]>;
  /** Avisa o servidor até onde este aparelho já recebeu (base da poda, B5). */
  registrarSincronia(aparelhoId: string, seqRecebido: number, versaoEsquema: number): Promise<void>;
}
