import { NavLink, Outlet, useLocation } from "react-router";
import { Ajuda } from "./Ajuda";
import { Relatar } from "./Relatar";
import { useAplicarTema } from "./tema";

/** As quatro áreas (D6) — a pergunta de cada uma orienta o texto de ajuda. */
export const AREAS = [
  { caminho: "/hoje", rotulo: "Hoje", pergunta: "O que faço agora?" },
  { caminho: "/plano", rotulo: "Plano", pergunta: "Onde estou em relação ao edital e à prova?" },
  { caminho: "/recall", rotulo: "Recall", pergunta: "O que eu erro e o que estou revisando?" },
  { caminho: "/biblioteca", rotulo: "Biblioteca", pergunta: "Onde está o conteúdo?" },
] as const;

/** A seção das Orientações que o "?" abre em cada tela (D23). */
const AJUDA_POR_ROTA: Record<string, string> = {
  "/conta": "seus-dados",
};

const classeLink = ({ isActive }: { isActive: boolean }) =>
  `alvo-toque flex items-center justify-center px-3 text-sm font-medium rounded-md ${
    isActive ? "bg-acento text-acento-contraste" : "text-texto hover:bg-borda/60"
  }`;

/**
 * Shell: navegação das quatro áreas, acesso a Conta e Ajustes fora da navegação, e rodapé de
 * responsabilidade atenuado (§4, D18). Captura global, busca, "?" e "!" entram na F0 completa.
 */
export function Shell() {
  useAplicarTema();
  const { pathname } = useLocation();
  const secaoDeAjuda = AJUDA_POR_ROTA[pathname] ?? "como-funciona";

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto max-w-3xl flex items-center gap-2 px-4 py-2">
          <span className="font-semibold tracking-tight mr-auto">Arretado</span>
          <nav aria-label="Áreas" className="flex gap-1">
            {AREAS.map((area) => (
              <NavLink key={area.caminho} to={area.caminho} className={classeLink}>
                {area.rotulo}
              </NavLink>
            ))}
          </nav>
          <Ajuda secao={secaoDeAjuda} />
          <Relatar />
          <NavLink
            to="/conta"
            className={classeLink}
            aria-label="Conta e Ajustes"
            title="Conta e Ajustes"
          >
            <span aria-hidden="true">☺</span>
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-borda px-4 py-3 text-center text-xs text-texto-atenuado">
        Seus dados ficam neste aparelho. Exportar e guardar cópias é responsabilidade sua; arquivos
        alterados fora do aplicativo não passam na validação e não são restauráveis.
      </footer>
    </div>
  );
}
