import { novoId } from "@core/ids";
import { inicializarCore } from "@core/inicializar";
import type { BancoArretado } from "@core/persistencia/db";
import { LimiteDeRelatosAtingido, ServicoDeRelatos } from "@suporte/relatar/servico";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarBanco } from "../../src/composicao";

describe("relatar Problema (D23, D24)", () => {
  let db: BancoArretado;
  let relatos: ServicoDeRelatos;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    const core = await inicializarCore(db);
    relatos = new ServicoDeRelatos(db, () => core.identidade, core.relogio);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("guarda o relato na fila local com a tela e a versão do app", async () => {
    const relato = await relatos.relatar("O botão Exportar não responde.", "/conta");

    expect(relato.descricao).toBe("O botão Exportar não responde.");
    expect(relato.tela).toBe("/conta");
    expect(relato.status).toBe("aguardandoEnvio");
    expect(await relatos.fila()).toHaveLength(1);
  });

  it("exige descrição", async () => {
    await expect(relatos.relatar("   ", "/hoje")).rejects.toThrow(/Descreva o problema/);
    expect(await relatos.fila()).toHaveLength(0);
  });

  it("aceita um por dia e recusa o segundo com mensagem própria", async () => {
    await relatos.relatar("Primeiro problema do dia.", "/hoje");

    expect(await relatos.podeRelatar()).toBe(false);
    await expect(relatos.relatar("Segundo problema.", "/hoje")).rejects.toThrow(
      LimiteDeRelatosAtingido,
    );
    expect(await relatos.fila()).toHaveLength(1);
  });

  it("o limite é por dia: um relato de ontem não bloqueia hoje", async () => {
    await relatos.relatar("Problema de hoje.", "/hoje");
    const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    expect(await relatos.relatosDoDia(ontem)).toHaveLength(0);
    expect(await relatos.podeRelatar(ontem)).toBe(true);
  });

  it("o relato não carrega nada de estudo junto (§5.3, D18)", async () => {
    const relato = await relatos.relatar("Travou ao abrir a lei.", "/biblioteca");
    const campos = Object.keys(relato).sort();

    expect(campos).toEqual([
      "aparelhoId",
      "atualizadoEm",
      "criadoEm",
      "descricao",
      "excluidoEm",
      "id",
      "origem",
      "status",
      "tela",
      "usuarioId",
      "versaoDoApp",
    ]);
  });
});
