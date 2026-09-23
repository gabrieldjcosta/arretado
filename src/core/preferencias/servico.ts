import type { ContextoDeEscrita } from "../identidade/modelo";
import type { Alteracao } from "../log/modelo";
import type { RelogioHibrido } from "../log/relogio";
import type { BancoArretado } from "../persistencia/db";
import { type Observavel, observar } from "../persistencia/reativo";
import { type ChaveDePreferencia, Preferencias, type ValorDePreferencia } from "./modelo";

/**
 * Preferências tipadas por usuário (§7.2). Cada escrita registra uma `Alteracao` na mesma
 * transação, como qualquer entidade (T5), para que sincronizem em F4.
 */
export class ServicoDePreferencias {
  constructor(
    private readonly db: BancoArretado,
    private readonly contexto: () => ContextoDeEscrita,
    private readonly relogio: RelogioHibrido,
  ) {}

  async obter<C extends ChaveDePreferencia>(chave: C): Promise<ValorDePreferencia<C> | undefined> {
    const registro = await this.db.preferencias.get([this.contexto().usuarioId, chave]);
    return this.validar(chave, registro?.valor);
  }

  /** Observável reativo para a interface (`useLiveQuery`). */
  observar<C extends ChaveDePreferencia>(chave: C): Observavel<ValorDePreferencia<C> | undefined> {
    return observar(() => this.obter(chave));
  }

  async definir<C extends ChaveDePreferencia>(
    chave: C,
    valor: ValorDePreferencia<C>,
  ): Promise<void> {
    const validado = Preferencias[chave].parse(valor);
    const { usuarioId, aparelhoId } = this.contexto();
    await this.db.transaction("rw", this.db.preferencias, this.db.alteracoes, async () => {
      const atualizadoEm = new Date().toISOString();
      await this.db.preferencias.put({ chave, usuarioId, valor: validado, atualizadoEm });
      const entrada: Alteracao = {
        tsLogico: this.relogio.proximo(),
        usuarioId,
        aparelhoId,
        entidade: "Preferencia",
        entidadeId: chave,
        operacao: "atualizar",
        campos: { valor: validado, atualizadoEm },
      };
      await this.db.alteracoes.add(entrada);
    });
  }

  private validar<C extends ChaveDePreferencia>(
    chave: C,
    valor: unknown,
  ): ValorDePreferencia<C> | undefined {
    const resultado = Preferencias[chave].safeParse(valor);
    return resultado.success ? (resultado.data as ValorDePreferencia<C>) : undefined;
  }
}
