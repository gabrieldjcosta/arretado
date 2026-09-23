import { createContext, useContext } from "react";
import type { Aplicacao } from "../../composicao";

const ContextoDoApp = createContext<Aplicacao | null>(null);

export const ProvedorCore = ContextoDoApp.Provider;

/** Acesso ao Core em qualquer componente. Só é chamado depois que `iniciar` resolveu. */
export function useCore() {
  return useApp().core;
}

/** Acesso à Aplicação inteira (Core + serviços de suporte). */
export function useApp(): Aplicacao {
  const app = useContext(ContextoDoApp);
  if (!app) throw new Error("Aplicação não inicializada: ProvedorCore ausente na árvore.");
  return app;
}
