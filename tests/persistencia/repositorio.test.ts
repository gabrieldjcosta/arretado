import type { Aparelho } from "@core/identidade/modelo";
import { inicializarIdentidade } from "@core/identidade/servico";
import { novoId } from "@core/ids";
import { RelogioHibrido } from "@core/log/relogio";
import type { BancoArretado } from "@core/persistencia/db";
import { Repositorio } from "@core/persistencia/repositorio";
import { ServicoDePreferencias } from "@core/preferencias/servico";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { criarBanco } from "../../src/composicao";

const contexto = { usuarioId: novoId(), aparelhoId: novoId() };

function novoAparelho(sobrescrever: Partial<Aparelho> = {}): Aparelho {
  const agora = new Date().toISOString();
  return {
    id: novoId(),
    usuarioId: contexto.usuarioId,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: "teste",
    excluidoEm: null,
    nome: "Notebook",
    plataforma: "windows",
    versaoEsquemaLocal: 1,
    ultimaSincronizacaoEm: null,
    posseAtivaAte: null,
    ...sobrescrever,
  };
}

describe("Repositorio (T3, T5)", () => {
  let db: BancoArretado;
  let repositorio: Repositorio<Aparelho>;

  beforeEach(() => {
    db = criarBanco(`teste-${novoId()}`);
    repositorio = new Repositorio(
      db,
      db.aparelhos,
      "Aparelho",
      () => contexto,
      new RelogioHibrido(),
    );
  });

  afterEach(async () => {
    await db.delete();
  });

  it("criar grava a entidade e uma Alteracao 'criar' com todos os campos", async () => {
    const aparelho = await repositorio.salvar(novoAparelho());
    expect(await repositorio.obter(aparelho.id)).toEqual(aparelho);

    const log = await db.alteracoes.toArray();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      operacao: "criar",
      entidade: "Aparelho",
      entidadeId: aparelho.id,
      usuarioId: contexto.usuarioId,
      aparelhoId: contexto.aparelhoId,
    });
    expect(log[0]?.campos).toEqual(aparelho);
  });

  it("atualizar registra só os campos que mudaram e ignora escrita sem mudança", async () => {
    const aparelho = await repositorio.salvar(novoAparelho());
    await repositorio.salvar(aparelho); // nada mudou
    expect(await db.alteracoes.count()).toBe(1);

    const renomeado = await repositorio.salvar({ ...aparelho, nome: "Celular" });
    expect(renomeado.nome).toBe("Celular");
    expect(renomeado.atualizadoEm >= aparelho.atualizadoEm).toBe(true);

    const log = await db.alteracoes.orderBy("seq").toArray();
    expect(log).toHaveLength(2);
    expect(log[1]?.operacao).toBe("atualizar");
    expect(Object.keys(log[1]?.campos ?? {}).sort()).toEqual(["atualizadoEm", "nome"]);
  });

  it("entidade e log são atômicos: falha no log desfaz a entidade", async () => {
    const id = novoId();
    const quebrado = new Repositorio<Aparelho>(
      db,
      db.aparelhos,
      "Aparelho",
      () => {
        throw new Error("contexto indisponível");
      },
      new RelogioHibrido(),
    );
    await expect(quebrado.salvar(novoAparelho({ id }))).rejects.toThrow("contexto indisponível");
    expect(await db.aparelhos.get(id)).toBeUndefined();
    expect(await db.alteracoes.count()).toBe(0);
  });

  it("excluir é lógico, idempotente e some das listagens por padrão", async () => {
    const aparelho = await repositorio.salvar(novoAparelho());
    await repositorio.excluir(aparelho.id);
    await repositorio.excluir(aparelho.id);

    const guardado = await repositorio.obter(aparelho.id);
    expect(guardado?.excluidoEm).not.toBeNull();
    expect((await repositorio.listar()).itens).toHaveLength(0);
    expect((await repositorio.listar({ incluirExcluidos: true })).itens).toHaveLength(1);
    expect(await db.alteracoes.count()).toBe(2);
  });

  it("listar pagina por cursor em ordem de criação", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) {
      ids.push((await repositorio.salvar(novoAparelho({ nome: `A${i}` }))).id);
    }
    const p1 = await repositorio.listar({ limite: 3 });
    expect(p1.itens.map((a) => a.id)).toEqual(ids.slice(0, 3));
    expect(p1.proximo).toBe(ids[2]);

    const p2 = await repositorio.listar({ limite: 3, apos: p1.proximo });
    expect(p2.itens.map((a) => a.id)).toEqual(ids.slice(3, 6));

    const p3 = await repositorio.listar({ limite: 3, apos: p2.proximo });
    expect(p3.itens.map((a) => a.id)).toEqual(ids.slice(6));
    expect(p3.proximo).toBeNull();
  });

  it("o log fica em ordem crescente de tsLogico e seq", async () => {
    for (let i = 0; i < 20; i++) await repositorio.salvar(novoAparelho());
    const log = await db.alteracoes.orderBy("seq").toArray();
    for (let i = 1; i < log.length; i++) {
      expect((log[i - 1]?.tsLogico ?? "") < (log[i]?.tsLogico ?? "")).toBe(true);
    }
  });
});

describe("identidade e preferências", () => {
  let db: BancoArretado;

  beforeEach(() => {
    db = criarBanco(`teste-${novoId()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("primeira abertura cria Usuário e Aparelho; reabertura reencontra os mesmos", async () => {
    const relogio = new RelogioHibrido();
    const primeira = await inicializarIdentidade(db, relogio, "windows");
    const segunda = await inicializarIdentidade(db, relogio, "windows");
    expect(segunda.usuarioId).toBe(primeira.usuarioId);
    expect(segunda.aparelhoId).toBe(primeira.aparelhoId);
    expect(await db.usuarios.count()).toBe(1);
    expect(await db.aparelhos.count()).toBe(1);
    expect((await db.aparelhos.get(primeira.aparelhoId))?.nome).toBe("Computador");
  });

  it("preferência é validada, persistida por usuário e gera Alteracao", async () => {
    const relogio = new RelogioHibrido();
    const identidade = await inicializarIdentidade(db, relogio, "android");
    const preferencias = new ServicoDePreferencias(db, () => identidade, relogio);

    expect(await preferencias.obter("tema")).toBeUndefined();
    await preferencias.definir("tema", "escuro");
    expect(await preferencias.obter("tema")).toBe("escuro");
    // @ts-expect-error valor fora do enum é recusado em tempo de compilação e de execução
    await expect(preferencias.definir("tema", "neon")).rejects.toThrow();

    const entradas = await db.alteracoes.where({ entidade: "Preferencia" }).toArray();
    expect(entradas).toHaveLength(1);
    expect(entradas[0]?.campos).toMatchObject({ valor: "escuro" });
  });
});
