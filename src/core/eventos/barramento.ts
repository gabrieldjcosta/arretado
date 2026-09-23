/**
 * Barramento de eventos em processo (Parte 2 §8.1): nome estável `entidade.acao`,
 * payload só com ids, entrega na ordem de emissão e depois da escrita confirmada.
 * Exceção de um assinante nunca se propaga nem impede os demais.
 */
export interface Evento {
  nome: string;
  payload: Readonly<Record<string, unknown>>;
}

export type Assinante = (evento: Evento) => void | Promise<void>;

export class Barramento {
  private readonly assinantes = new Map<string, Set<Assinante>>();
  private readonly fila: Evento[] = [];
  private entregando = false;

  constructor(
    private readonly aoFalhar: (excecao: unknown, evento: Evento) => void = (excecao, evento) => {
      console.error(`Assinante falhou ao tratar ${evento.nome}`, excecao);
    },
  ) {}

  /** Assina um evento pelo nome, ou todos com `*`. Devolve a função de cancelamento. */
  assinar(nome: string, assinante: Assinante): () => void {
    let conjunto = this.assinantes.get(nome);
    if (!conjunto) {
      conjunto = new Set();
      this.assinantes.set(nome, conjunto);
    }
    conjunto.add(assinante);
    return () => conjunto.delete(assinante);
  }

  /** Enfileira e entrega em ordem; eventos emitidos durante a entrega vão para o fim da fila. */
  emitir(nome: string, payload: Readonly<Record<string, unknown>> = {}): void {
    this.fila.push({ nome, payload });
    if (this.entregando) return;
    this.entregando = true;
    try {
      let evento = this.fila.shift();
      while (evento) {
        this.entregar(evento);
        evento = this.fila.shift();
      }
    } finally {
      this.entregando = false;
    }
  }

  private entregar(evento: Evento): void {
    const alvos = [
      ...(this.assinantes.get(evento.nome) ?? []),
      ...(this.assinantes.get('*') ?? []),
    ];
    for (const assinante of alvos) {
      try {
        const retorno = assinante(evento);
        if (retorno instanceof Promise)
          retorno.catch((e: unknown) => {
            this.aoFalhar(e, evento);
          });
      } catch (e) {
        this.aoFalhar(e, evento);
      }
    }
  }
}
