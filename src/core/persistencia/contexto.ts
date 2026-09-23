import type { Barramento } from '../eventos/barramento';
import type { RelogioLogico } from '../ids';
import type { BancoArretado } from './banco';

/** Dependências de toda escrita: banco, identidade local, relógio, eventos. */
export interface Contexto {
  readonly db: BancoArretado;
  readonly usuarioId: string;
  readonly aparelhoId: string;
  readonly relogio: RelogioLogico;
  readonly eventos: Barramento;
  readonly agora: () => Date;
  readonly novoId: () => string;
}
