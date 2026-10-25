import type { Barramento } from '../eventos/barramento';
import type { RelogioLogico } from '../ids';
import type { NomeColecao } from '../modelo';
import type { BancoArretado } from './banco';

/**
 * Trava de escrita (D17, F4-B B4): com `motivo`, toda escrita pelas coleções falha com
 * `EscritaBloqueada` (outro aparelho está editando agora). A recepção da sincronização grava direto
 * no banco e não passa por ela. Mutável de propósito: a posse muda sem reabrir o repositório.
 */
export interface TravaDeEscrita {
  motivo: string | null;
  /** Escrita que passa mesmo travada: a que nunca sai deste aparelho (coleção só local, campos do aparelho). */
  isenta?: (escrita: EscritaPrevista) => boolean;
  /** Chamado a cada escrita recusada (a faixa de posse avisa; as telas não precisam tratar uma a uma). */
  aoBloquear?: (motivo: string) => void;
}

/** O que uma escrita vai pôr no log, antes de abrir a transação. */
export interface EscritaPrevista {
  colecao: NomeColecao;
  operacao: 'gravar' | 'atualizar' | 'remover';
  dados?: Record<string, unknown>;
}

export class EscritaBloqueada extends Error {
  constructor(readonly motivo: string) {
    super(motivo);
    this.name = 'EscritaBloqueada';
  }
}

/** Dependências de toda escrita: banco, identidade local, relógio, eventos. */
export interface Contexto {
  readonly db: BancoArretado;
  readonly usuarioId: string;
  readonly aparelhoId: string;
  readonly relogio: RelogioLogico;
  readonly eventos: Barramento;
  readonly agora: () => Date;
  readonly novoId: () => string;
  readonly trava: TravaDeEscrita;
}
