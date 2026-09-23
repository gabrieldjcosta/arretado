import { novoId } from "@core/ids";
import { compararEnderecos, type Estrela, estrelaEfetiva } from "@dominios/legislacao/modelo";
import { completude, type Erro } from "@dominios/recall/modelo";
import { afterEach, describe, expect, it } from "vitest";
import { criarBanco, montarEsquema } from "../../src/composicao";

/** Toda entidade principal da Parte 1 §5.3 precisa ter tabela desde a F0. */
const TABELAS_EXIGIDAS = [
  "usuarios",
  "aparelhos",
  "concursos",
  "fasesPrazos",
  "editais",
  "disciplinas",
  "pontos",
  "dias",
  "sessoes",
  "erros",
  "cartoes",
  "revisoes",
  "normas",
  "versoesDeNorma",
  "dispositivos",
  "marcacoes",
  "estrelas",
  "pacotesDeIncidencia",
  "adesoes",
  "precedentes",
  "notas",
  "achados",
  "eventosDeCalendario",
  "fontes",
  "anexos",
  "tags",
  "logsDeImportacao",
  "snapshots",
  "relatosDeProblema",
];

describe("esquema local (F0)", () => {
  let bancos: Awaited<ReturnType<typeof criarBanco>>[] = [];

  afterEach(async () => {
    await Promise.all(bancos.map((b) => b.delete()));
    bancos = [];
  });

  it("declara uma tabela para cada entidade principal da §5.3", () => {
    const tabelas = Object.keys(montarEsquema()[1] ?? {});
    expect(tabelas).toEqual(expect.arrayContaining(TABELAS_EXIGIDAS));
  });

  it("recusa duas declarações da mesma tabela na mesma versão", () => {
    const duplicado = [{ 1: { pontos: "id" } }, { 1: { pontos: "id, outro" } }];
    expect(() => montarEsquema(duplicado)).toThrow(/duas vezes/);
  });

  it("abre o banco com todas as tabelas e toda entidade pessoal indexada por usuarioId", async () => {
    const db = criarBanco(`teste-${novoId()}`);
    bancos.push(db);
    await db.open();

    const nomes = db.tables.map((t) => t.name);
    expect(nomes).toEqual(expect.arrayContaining(TABELAS_EXIGIDAS));

    // Exceções legítimas: `meta` é deste aparelho; `textosDeDispositivo` é conteúdo de norma;
    // `preferencias` e `usuarios` já têm o usuário na própria chave primária.
    const semUsuario = db.tables
      .filter((t) => !["meta", "textosDeDispositivo", "preferencias", "usuarios"].includes(t.name))
      .filter((t) => !t.schema.indexes.some((i) => i.keyPath === "usuarioId"))
      .map((t) => t.name);
    expect(semUsuario).toEqual([]);
  });
});

describe("regras do modelo", () => {
  const estrela = (propagacao: Estrela["propagacao"]): Estrela => ({ propagacao }) as Estrela;

  it("estrela efetiva: direta vence exceção; exceção vence herança (D15)", () => {
    expect(estrelaEfetiva([])).toBe(false);
    expect(estrelaEfetiva([estrela("herdada")])).toBe(true);
    expect(estrelaEfetiva([estrela("pacote")])).toBe(true);
    expect(estrelaEfetiva([estrela("herdada"), estrela("excecaoNegativa")])).toBe(false);
    expect(estrelaEfetiva([estrela("direta"), estrela("excecaoNegativa")])).toBe(true);
  });

  it("endereços ordenam com sufixo: 9 < 9-A < 10 (D11)", () => {
    const enderecos = ["art10", "art9A", "art9", "art9B", "art100"];
    expect([...enderecos].sort(compararEnderecos)).toEqual([
      "art9",
      "art9A",
      "art9B",
      "art10",
      "art100",
    ]);
    expect(compararEnderecos("art5.par2.incIII", "art5.par2.incIV")).toBeLessThan(0);
    expect(compararEnderecos("art5.par2", "art5.par10")).toBeLessThan(0);
  });

  it("completude do erro é derivada, nunca obrigatória (D9)", () => {
    const base = { resultado: "errou", oQueFoi: "confundi progressão" } as Erro;
    expect(completude(base)).toBe("rapido");
    expect(completude({ ...base, fraseCorreta: "a fração é 16%" })).toBe("rapido");
    expect(completude({ ...base, fraseCorreta: "a fração é 16%", pontoId: "p1" })).toBe("completo");
  });
});
