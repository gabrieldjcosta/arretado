/** Onde a porteira busca os cartões: os artigos lidos da matéria, escolhidos por quem hospeda. */
export interface AlvoDaPorteira {
  normaId: string;
  artigos: readonly { endereco: string; rotulo: string }[];
}
