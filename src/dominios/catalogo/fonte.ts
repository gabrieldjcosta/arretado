import type { CarreiraDoCatalogo, IndiceDoCatalogo } from './esquemas';

/**
 * Porta do catálogo. O app só fala com ela; hoje a implementação lê os JSON versionados no próprio
 * app (sem rede), e uma fonte remota entra depois trocando a classe.
 */
export interface FonteDoCatalogo {
  /** O índice validado: todas as carreiras, disponíveis ou não. */
  listar(): Promise<IndiceDoCatalogo>;
  /** Uma carreira disponível, validada pelo esquema. */
  obter(slug: string): Promise<CarreiraDoCatalogo>;
}

export type MotivoCatalogoIndisponivel = 'nao_encontrado' | 'indisponivel' | 'formato_invalido';

export class CatalogoIndisponivel extends Error {
  constructor(
    readonly motivo: MotivoCatalogoIndisponivel,
    detalhe?: string,
  ) {
    super(
      detalhe
        ? `Catálogo indisponível (${motivo}): ${detalhe}`
        : `Catálogo indisponível (${motivo})`,
    );
    this.name = 'CatalogoIndisponivel';
  }
}
