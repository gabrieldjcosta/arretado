import type { IndiceDoAcervo, ItemDoAcervo } from './esquemas';

/**
 * Porta do acervo (spec §4). O app só fala com ela; a implementação estática lê arquivos do mesmo
 * site, e bucket ou Supabase entram depois trocando a classe, sem mexer no resto do app.
 */
export interface FonteDoAcervo {
  /** O índice validado. */
  listar(): Promise<IndiceDoAcervo>;
  /** O corpo de um item, validado pelo esquema (o hash é conferido pela adesão). */
  obter(id: string): Promise<ItemDoAcervo>;
  /**
   * Uma versão antiga do item, pelo hash (AL: os arquivos do acervo são imutáveis por hash; a
   * reidratação do log pede a versão aderida mesmo depois de publicada outra). Opcional.
   */
  obterVersao?(id: string, hash: string): Promise<ItemDoAcervo>;
}

export type MotivoFonteIndisponivel = 'sem_rede' | 'nao_encontrado' | 'formato_invalido';

export class FonteIndisponivel extends Error {
  constructor(
    readonly motivo: MotivoFonteIndisponivel,
    detalhe?: string,
  ) {
    super(
      detalhe ? `Acervo indisponível (${motivo}): ${detalhe}` : `Acervo indisponível (${motivo})`,
    );
    this.name = 'FonteIndisponivel';
  }
}
