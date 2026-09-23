/**
 * Barramento de eventos em processo (§6, §8.1): nome estável `entidade.acao`, payload só com ids e o
 * mínimo de contexto, entrega na ordem, após a escrita local. Handlers são idempotentes e nunca
 * propagam exceção (uma falha é registrada e não interrompe os demais).
 *
 * O mapa de eventos é declarado por cada domínio via declaração de módulo (`declare module`) —
 * o barramento não conhece os domínios.
 */
// biome-ignore lint/suspicious/noEmptyInterface: preenchido por cada domínio via `declare module`.
export interface MapaDeEventos {}

export type NomeDeEvento = keyof MapaDeEventos & string;
export type Handler<N extends NomeDeEvento> = (payload: MapaDeEventos[N]) => void | Promise<void>;

export class Barramento {
  private readonly handlers = new Map<string, Set<Handler<NomeDeEvento>>>();
  private readonly fila: Array<() => Promise<void>> = [];
  private drenando = false;

  constructor(
    private readonly registrarFalha: (evento: string, erro: unknown) => void = () => {},
  ) {}

  assinar<N extends NomeDeEvento>(nome: N, handler: Handler<N>): () => void {
    const conjunto = this.handlers.get(nome) ?? new Set();
    conjunto.add(handler as Handler<NomeDeEvento>);
    this.handlers.set(nome, conjunto);
    return () => conjunto.delete(handler as Handler<NomeDeEvento>);
  }

  /** Enfileira a entrega; retorna quando todos os handlers deste evento terminaram. */
  emitir<N extends NomeDeEvento>(nome: N, payload: MapaDeEventos[N]): Promise<void> {
    return new Promise((resolver) => {
      this.fila.push(async () => {
        for (const handler of this.handlers.get(nome) ?? []) {
          try {
            await handler(payload);
          } catch (erro) {
            this.registrarFalha(nome, erro);
          }
        }
        resolver();
      });
      void this.drenar();
    });
  }

  private async drenar(): Promise<void> {
    if (this.drenando) return;
    this.drenando = true;
    try {
      while (this.fila.length > 0) {
        const proximo = this.fila.shift();
        if (proximo) await proximo();
      }
    } finally {
      this.drenando = false;
    }
  }
}
