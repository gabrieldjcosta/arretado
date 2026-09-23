import type { Table } from "dexie";
import type { ContextoDeEscrita } from "../identidade/modelo";
import type { Alteracao, Operacao } from "../log/modelo";
import type { RelogioHibrido } from "../log/relogio";
import type { BancoArretado } from "./db";
import type { EntidadeBase, Pagina } from "./modelo";

export interface OpcoesDeListagem {
  /** Tamanho da página; listas nunca são ilimitadas (§5.1). */
  limite?: number;
  /** Cursor devolvido pela página anterior (id do último item). */
  apos?: string | null;
  /** Incluir registros com exclusão lógica. Padrão: não. */
  incluirExcluidos?: boolean;
}

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 500;

/**
 * Acesso a uma coleção de entidades (T3). Toda escrita grava a `Alteracao` correspondente na mesma
 * transação (T5) — é a única porta de escrita permitida aos domínios.
 */
export class Repositorio<T extends EntidadeBase> {
  constructor(
    private readonly db: BancoArretado,
    private readonly tabela: Table<T, string>,
    private readonly nomeEntidade: string,
    private readonly contexto: () => ContextoDeEscrita,
    private readonly relogio: RelogioHibrido,
  ) {}

  async obter(id: string): Promise<T | undefined> {
    return this.tabela.get(id);
  }

  /** Paginação por cursor sobre o id (UUIDv7 → ordem de criação). */
  async listar(opcoes: OpcoesDeListagem = {}): Promise<Pagina<T>> {
    const limite = Math.min(opcoes.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);
    let consulta = opcoes.apos
      ? this.tabela.where("id").above(opcoes.apos)
      : this.tabela.orderBy("id");
    if (!opcoes.incluirExcluidos) {
      consulta = consulta.filter((e) => e.excluidoEm === null);
    }
    const itens = await consulta.limit(limite + 1).toArray();
    const temMais = itens.length > limite;
    const pagina = temMais ? itens.slice(0, limite) : itens;
    const ultimo = pagina.at(-1);
    return { itens: pagina, proximo: temMais && ultimo ? ultimo.id : null };
  }

  /** Cria ou atualiza. Só os campos que mudaram vão para o log; `atualizadoEm` é definido aqui. */
  async salvar(entidade: T): Promise<T> {
    return this.db.transaction("rw", this.tabela, this.db.alteracoes, async () => {
      const existente = await this.tabela.get(entidade.id);
      const salvo: T = { ...entidade, atualizadoEm: new Date().toISOString() };
      const campos = existente ? diferencas(existente, salvo) : { ...salvo };
      if (existente && Object.keys(campos).length === 0) return existente;
      await this.tabela.put(salvo);
      await this.registrar(existente ? "atualizar" : "criar", salvo.id, campos);
      return salvo;
    });
  }

  /** Exclusão lógica (§5.1): o registro permanece, com `excluidoEm` preenchido. */
  async excluir(id: string): Promise<void> {
    await this.db.transaction("rw", this.tabela, this.db.alteracoes, async () => {
      const existente = await this.tabela.get(id);
      if (!existente || existente.excluidoEm !== null) return;
      const agora = new Date().toISOString();
      const campos = { excluidoEm: agora, atualizadoEm: agora };
      await this.tabela.put({ ...existente, ...campos });
      await this.registrar("excluir", id, campos);
    });
  }

  /** Remoção física — só para exclusão de conta e restauração integral (§12). */
  async apagarFisicamente(id: string): Promise<void> {
    await this.db.transaction("rw", this.tabela, this.db.alteracoes, async () => {
      await this.tabela.delete(id);
      await this.registrar("apagar", id, {});
    });
  }

  private async registrar(
    operacao: Operacao,
    entidadeId: string,
    campos: Record<string, unknown>,
  ): Promise<void> {
    const { usuarioId, aparelhoId } = this.contexto();
    const entrada: Alteracao = {
      tsLogico: this.relogio.proximo(),
      usuarioId,
      aparelhoId,
      entidade: this.nomeEntidade,
      entidadeId,
      operacao,
      campos,
    };
    await this.db.alteracoes.add(entrada);
  }
}

/**
 * Campos de `novo` cujo valor difere de `antigo` (comparação estrutural por JSON).
 * `atualizadoEm` só entra se algum outro campo mudou.
 */
export function diferencas<T extends EntidadeBase>(antigo: T, novo: T): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};
  for (const chave of Object.keys(novo) as (keyof T & string)[]) {
    if (chave === "atualizadoEm") continue;
    if (JSON.stringify(antigo[chave]) !== JSON.stringify(novo[chave])) {
      resultado[chave] = novo[chave];
    }
  }
  if (Object.keys(resultado).length > 0) resultado.atualizadoEm = novo.atualizadoEm;
  return resultado;
}
