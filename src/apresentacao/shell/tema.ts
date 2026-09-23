import type { Tema } from "@core/preferencias/modelo";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useCore } from "./contexto-core";

const TEMA_PADRAO: Tema = "sistema";

/** Tema escolhido (reativo, vindo de `preferencias`) e a função para alterá-lo. */
export function useTema(): { tema: Tema; definirTema: (tema: Tema) => Promise<void> } {
  const { preferencias } = useCore();
  const tema = useLiveQuery(() => preferencias.obter("tema"), [preferencias]) ?? TEMA_PADRAO;
  return { tema, definirTema: (novo) => preferencias.definir("tema", novo) };
}

/**
 * Aplica o tema ao <html>. Fica no Shell, não na tela de Conta: vale em todas as áreas.
 * "sistema" remove o atributo e deixa o `prefers-color-scheme` decidir.
 */
export function useAplicarTema(): void {
  const { tema } = useTema();
  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "sistema") raiz.removeAttribute("data-tema");
    else raiz.setAttribute("data-tema", tema);
  }, [tema]);
}
