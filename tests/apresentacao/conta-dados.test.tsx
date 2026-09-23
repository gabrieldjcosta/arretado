import { App } from "@apresentacao/App";
import { ProvedorCore } from "@apresentacao/shell/contexto-core";
import { exportar } from "@core/backup/pacote";
import { novoId } from "@core/ids";
import { type Core, inicializarCore } from "@core/inicializar";
import type { BancoArretado } from "@core/persistencia/db";
import type { Ponto } from "@dominios/plano/modelo";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { comporApartirDoCore, criarBanco } from "../../src/composicao";

function ponto(usuarioId: string, titulo: string): Ponto {
  const agora = new Date().toISOString();
  return {
    id: novoId(),
    usuarioId,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: "teste",
    excluidoEm: null,
    disciplinaId: "disc-1",
    titulo,
    faixa: "alta",
    ordem: 1,
    editalId: null,
    adiadoAte: null,
    origemDaFaixa: "manual",
    somenteLeitura: false,
  };
}

describe("Conta › Dados (§12)", () => {
  let db: BancoArretado;
  let core: Core;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    core = await inicializarCore(db);
    await db.table("pontos").put(ponto(core.identidade.usuarioId, "Ponto de teste"));
  });

  afterEach(async () => {
    document.documentElement.removeAttribute("data-tema");
    await db.delete();
  });

  /** O roteador nasce com a URL do momento da importação do módulo: navega-se clicando. */
  const abrirConta = async (usuario: ReturnType<typeof userEvent.setup>) => {
    render(<App />, {
      wrapper: ({ children }) => (
        <ProvedorCore value={comporApartirDoCore(core)}>{children}</ProvedorCore>
      ),
    });
    await usuario.click(await screen.findByRole("link", { name: "Conta e Ajustes" }));
    return screen.findByLabelText("Escolher pacote");
  };

  it("a prévia aparece antes de qualquer escrita e diz o que vai acontecer", async () => {
    const usuario = userEvent.setup();
    const pacote = await exportar(db, core.identidade);
    await db.table("pontos").clear();

    const entrada = await abrirConta(usuario);
    await usuario.upload(entrada, new File([pacote as BlobPart], `pacote.arretado`));

    const previa = await screen.findByRole("table");
    const linha = within(previa).getByRole("row", { name: /pontos/ });
    expect(within(linha).getAllByRole("cell")[1]).toHaveTextContent("1");

    // Nada foi escrito ainda: a prévia é só cálculo.
    expect(await db.table("pontos").count()).toBe(0);
    expect(await db.table("snapshots").count()).toBe(0);
  });

  it("confirmar restaura os dados e deixa a importação desfazível", async () => {
    const usuario = userEvent.setup();
    const pacote = await exportar(db, core.identidade);
    await db.table("pontos").clear();

    const entrada = await abrirConta(usuario);
    await usuario.upload(entrada, new File([pacote as BlobPart], "pacote.arretado"));
    await usuario.click(await screen.findByRole("button", { name: "Confirmar importação" }));

    await waitFor(async () => expect(await db.table("pontos").count()).toBe(1));
    expect(await screen.findByRole("status")).toHaveTextContent(/pode desfazer/i);

    const restaurado = (await db.table("pontos").toArray()) as Ponto[];
    expect(restaurado[0]?.titulo).toBe("Ponto de teste");

    // Desfazer devolve o estado anterior à importação (banco sem pontos).
    await usuario.click(await screen.findByRole("button", { name: "Desfazer" }));
    await waitFor(async () => expect(await db.table("pontos").count()).toBe(0));
  });

  it("recusa um pacote alterado fora do aplicativo, sem escrever nada", async () => {
    const usuario = userEvent.setup();
    const adulterado = new Uint8Array([1, 2, 3, 4, 5]);

    const entrada = await abrirConta(usuario);
    await usuario.upload(entrada, new File([adulterado as BlobPart], "pacote.arretado"));

    expect(await screen.findByRole("status")).toHaveTextContent(/não é um pacote do Arretado/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(await db.table("snapshots").count()).toBe(0);
  });
});

describe("“?” e “!” no shell (D23)", () => {
  let db: BancoArretado;
  let core: Core;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    core = await inicializarCore(db);
    window.history.pushState({}, "", "/hoje");
  });

  afterEach(async () => {
    document.documentElement.removeAttribute("data-tema");
    await db.delete();
  });

  const montar = () =>
    render(<App />, {
      wrapper: ({ children }) => (
        <ProvedorCore value={comporApartirDoCore(core)}>{children}</ProvedorCore>
      ),
    });

  it("o “?” abre a seção das Orientações que responde à tela atual", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole("link", { name: "Hoje" }));
    await usuario.click(screen.getByRole("button", { name: /Orientações sobre esta tela/ }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/quatro áreas/i);
    await usuario.keyboard("{Escape}");

    // Em Conta a dúvida é outra: o "?" abre a seção sobre os dados (D23).
    await usuario.click(screen.getByRole("link", { name: "Conta e Ajustes" }));
    await usuario.click(screen.getByRole("button", { name: /Orientações sobre esta tela/ }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/exporte de vez em quando|senha/i);
  });

  it("o “!” guarda um relato e recusa o segundo no mesmo dia", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await screen.findByRole("button", { name: "Relatar problema" }));
    await usuario.type(await screen.findByRole("textbox"), "A tela ficou em branco.");
    await usuario.click(screen.getByRole("button", { name: "Guardar relato" }));

    expect(await screen.findByText(/Relato guardado neste aparelho/)).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Entendi" }));
    await waitFor(async () => expect(await db.table("relatosDeProblema").count()).toBe(1));

    await usuario.click(screen.getByRole("button", { name: "Relatar problema" }));
    await usuario.type(await screen.findByRole("textbox"), "Outro problema.");
    await usuario.click(screen.getByRole("button", { name: "Guardar relato" }));

    expect(await screen.findByText(/já relatou um problema hoje/i)).toBeInTheDocument();
    expect(await db.table("relatosDeProblema").count()).toBe(1);
  });
});
