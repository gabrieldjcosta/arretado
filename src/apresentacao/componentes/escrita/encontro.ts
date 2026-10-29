// O encontro da luz com o Zé (D-D10, M3b): na primeira vez a Abertura leva a luz do nome até o pé esquerdo
// do Zé das Boas-vindas, que a Chegada oferece. Quem oferece e quem espera não se conhecem: passam por um
// `Encontro`, que o `ProvedorDaAbertura` guarda e entrega por contexto (como a vez da escrita). A oferta pode
// chegar antes ou depois de a Abertura pedir; sem oferta no prazo, a luz pousa no cabeçalho, como na M2.

/** Onde o pé esquerdo do Zé está na tela (pixels da janela) e o raio que a luz da caneta tem aí. */
export interface PeDoZe {
  x: number;
  y: number;
  raio: number;
}

export interface OfertaDaChegada {
  /** Onde o pé está agora, ou `null` se o Zé não está à vista (a tela baixa o esconde, por exemplo). */
  medirPe: () => PeDoZe | null;
  /**
   * A luz pousou: a Chegada se revela e o Zé começa a se desenhar, no mesmo quadro em que a luz da
   * Abertura sai de cena e a da caneta do Zé assume.
   */
  receber: () => void;
}

export interface Encontro {
  /** A Chegada se oferece. Devolve quem retira a oferta (ao sair da tela, ou se perder a vez). */
  oferecer: (oferta: OfertaDaChegada) => () => void;
  /** Espera a oferta por até `ms`; `null` se o prazo passa ou se o `sinal` aborta. */
  esperar: (ms: number, sinal: AbortSignal) => Promise<OfertaDaChegada | null>;
}

export function criarEncontro(): Encontro {
  let oferta: OfertaDaChegada | null = null;
  const esperando = new Set<(chegou: OfertaDaChegada) => void>();
  return {
    oferecer(nova) {
      oferta = nova;
      // Cada espera se tira do conjunto ao responder.
      for (const responder of [...esperando]) responder(nova);
      return () => {
        if (oferta === nova) oferta = null;
      };
    },
    esperar(ms, sinal) {
      return new Promise((resolver) => {
        if (oferta) {
          resolver(oferta);
          return;
        }
        if (sinal.aborted) {
          resolver(null);
          return;
        }
        const acabar = (resposta: OfertaDaChegada | null) => {
          clearTimeout(relogio);
          sinal.removeEventListener('abort', aoAbortar);
          esperando.delete(responder);
          resolver(resposta);
        };
        const responder = (chegou: OfertaDaChegada) => {
          acabar(chegou);
        };
        const aoAbortar = () => {
          acabar(null);
        };
        const relogio = setTimeout(aoAbortar, ms);
        sinal.addEventListener('abort', aoAbortar, { once: true });
        esperando.add(responder);
      });
    },
  };
}
