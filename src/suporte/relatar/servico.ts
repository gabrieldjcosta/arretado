import { VERSAO_APP } from "@core/esquema/versao";
import type { ContextoDeEscrita } from "@core/identidade/modelo";
import { novoId } from "@core/ids";
import type { RelogioHibrido } from "@core/log/relogio";
import type { BancoArretado } from "@core/persistencia/db";
import { Repositorio } from "@core/persistencia/repositorio";
import type { RelatoDeProblema } from "./modelo";

/**
 * Relatar **Problema** (D23): um por usuário por dia, descrição obrigatória, sem dados de estudo.
 * Antes da F4 não há envio: a fila fica local e visível ao usuário (suposição 7).
 */
export const LIMITE_DIARIO = 1;

export class LimiteDeRelatosAtingido extends Error {
  override name = "LimiteDeRelatosAtingido";
  constructor() {
    super("Você já relatou um problema hoje. Pode relatar outro amanhã.");
  }
}

export class ServicoDeRelatos {
  private readonly repositorio: Repositorio<RelatoDeProblema>;

  constructor(
    db: BancoArretado,
    private readonly contexto: () => ContextoDeEscrita,
    relogio: RelogioHibrido,
  ) {
    this.repositorio = new Repositorio<RelatoDeProblema>(
      db,
      db.tabela<RelatoDeProblema>("relatosDeProblema"),
      "RelatoDeProblema",
      contexto,
      relogio,
    );
  }

  /** Quantos relatos o usuário já fez na data informada (AAAA-MM-DD). */
  async relatosDoDia(data = hoje()): Promise<RelatoDeProblema[]> {
    const { itens } = await this.repositorio.listar({ limite: 500 });
    return itens.filter((r) => r.criadoEm.startsWith(data));
  }

  async podeRelatar(data = hoje()): Promise<boolean> {
    return (await this.relatosDoDia(data)).length < LIMITE_DIARIO;
  }

  /**
   * Grava o relato na fila local. A descrição é o único campo obrigatório; a tela e as versões
   * são preenchidas pelo app. Nada de conteúdo de estudo entra aqui (§5.3).
   */
  async relatar(descricao: string, tela: string): Promise<RelatoDeProblema> {
    const texto = descricao.trim();
    if (!texto) throw new Error("Descreva o problema para poder enviar.");
    if (!(await this.podeRelatar())) throw new LimiteDeRelatosAtingido();

    const { usuarioId, aparelhoId } = this.contexto();
    const agora = new Date().toISOString();
    return this.repositorio.salvar({
      id: novoId(),
      usuarioId,
      criadoEm: agora,
      atualizadoEm: agora,
      origem: "app",
      excluidoEm: null,
      descricao: texto,
      tela,
      versaoDoApp: VERSAO_APP,
      aparelhoId,
      status: "aguardandoEnvio",
    });
  }

  /** Fila visível ao usuário enquanto não há envio (F4). */
  async fila(): Promise<RelatoDeProblema[]> {
    const { itens } = await this.repositorio.listar({ limite: 200 });
    return itens.filter((r) => r.status === "aguardandoEnvio");
  }
}

const hoje = (): string => new Date().toISOString().slice(0, 10);
