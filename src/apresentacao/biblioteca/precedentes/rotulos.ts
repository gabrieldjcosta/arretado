import type { RotuloDoTrecho, TipoDeVinculoEntrePrecedentes } from '../../../core/modelo';

export const ROTULO_DO_TRECHO: Record<RotuloDoTrecho, string> = {
  tese: 'Tese',
  ementa: 'Ementa',
  ratio: 'Fundamento',
  dispositivo_da_decisao: 'Decisão',
};

/** Do ponto de vista de quem aponta (este → outro). */
export const VINCULO_SAINDO: Record<TipoDeVinculoEntrePrecedentes, string> = {
  relacionado: 'Relacionado a',
  cita: 'Cita',
  supera: 'Supera',
};

/** Do ponto de vista de quem é apontado (outro → este). */
export const VINCULO_ENTRANDO: Record<TipoDeVinculoEntrePrecedentes, string> = {
  relacionado: 'Relacionado a',
  cita: 'Citado por',
  supera: 'Superado por',
};
