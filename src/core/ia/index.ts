// Porta da IA opcional (plano-mestre §8, A2; T22, T23). Reservada nas Frases 1 com implementação
// nula: IA desligada = app idêntico, e sem rede o recurso some. Toda sugestão chega como Proposta
// que a pessoa aceita, edita ou descarta (R4); a chave do modelo fica só no Worker (T18).

/** Sugestão da IA: nunca vira dado sozinha; quem aceita grava com `origemTipo: 'ia'`. */
export interface Proposta<T> {
  valor: T;
  /** De onde veio o texto analisado (proveniência do rascunho aceito). */
  fonte?: string;
}

export interface ServicoDeIA {
  /** `false` = os botões de IA nem aparecem (sem direito na conta, sem rede ou desligada). */
  readonly disponivel: boolean;
  /** Questão ou trecho → frase correta proposta (A2, "questões → frases"). */
  proporFrase(texto: string, sinal?: AbortSignal): Promise<Proposta<string> | null>;
}

/** Implementação vigente: não há IA. Nunca chama a rede. */
export const SERVICO_DE_IA_NULO: ServicoDeIA = {
  disponivel: false,
  proporFrase: () => Promise.resolve(null),
};
