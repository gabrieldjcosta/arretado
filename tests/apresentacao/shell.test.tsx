import { App } from "@apresentacao/App";
import { ProvedorCore } from "@apresentacao/shell/contexto-core";
import { novoId } from "@core/ids";
import { type Core, inicializarCore } from "@core/inicializar";
import type { BancoArretado } from "@core/persistencia/db";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { comporApartirDoCore, criarBanco } from "../../src/composicao";

describe("Shell (D6, T9, T10)", () => {
  let db: BancoArretado;
  let core: Core;

  beforeEach(async () => {
    db = criarBanco(`teste-${novoId()}`);
    core = await inicializarCore(db);
    window.history.pushState({}, "", "/");
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

  it("abre no Hoje e navega para as quatro áreas e Conta", async () => {
    const usuario = userEvent.setup();
    montar();
    expect(await screen.findByRole("heading", { name: "Hoje" })).toBeInTheDocument();

    for (const area of ["Plano", "Recall", "Biblioteca"]) {
      await usuario.click(screen.getByRole("link", { name: area }));
      expect(await screen.findByRole("heading", { name: area })).toBeInTheDocument();
    }

    await usuario.click(screen.getByRole("link", { name: "Conta e Ajustes" }));
    expect(await screen.findByRole("heading", { name: "Conta e Ajustes" })).toBeInTheDocument();
  });

  it("o tema escolhido em Conta persiste e continua valendo nas outras áreas", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(await screen.findByRole("link", { name: "Conta e Ajustes" }));
    await usuario.click(await screen.findByRole("radio", { name: "Escuro" }));

    await waitFor(() => expect(document.documentElement.dataset.tema).toBe("escuro"));
    expect(await core.preferencias.obter("tema")).toBe("escuro");

    // Sair de Conta não pode desfazer o tema (o efeito vive no Shell, não na tela).
    await usuario.click(screen.getByRole("link", { name: "Recall" }));
    expect(await screen.findByRole("heading", { name: "Recall" })).toBeInTheDocument();
    expect(document.documentElement.dataset.tema).toBe("escuro");
  });

  it("o rodapé de responsabilidade aparece em todas as telas (D18)", async () => {
    montar();
    expect(await screen.findByText(/não passam na validação/i)).toBeInTheDocument();
  });
});
