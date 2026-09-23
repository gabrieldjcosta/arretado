import { useCore } from "@apresentacao/shell/contexto-core";
import { useTema } from "@apresentacao/shell/tema";
import { VERSAO_APP, VERSAO_ESQUEMA } from "@core/esquema/versao";
import { Tema } from "@core/preferencias/modelo";
import { ORIENTACOES } from "@suporte/orientacoes/conteudo";
import type { RelatoDeProblema } from "@suporte/relatar/modelo";
import { useLiveQuery } from "dexie-react-hooks";
import { Dados } from "./Dados";

const ROTULOS_TEMA: Record<Tema, string> = {
  claro: "Claro",
  escuro: "Escuro",
  sistema: "Sistema",
};

/**
 * Conta e Ajustes (D6, D23): fora da navegação, porque nada que não seja estudar fica dentro das
 * quatro áreas. Nesta fase: Aparência, Dados, Orientações, Privacidade e a fila de relatos.
 */
export function Conta() {
  const { tema, definirTema } = useTema();
  const { identidade, db } = useCore();

  const aparelho = useLiveQuery(
    () => identidade.aparelhos.obter(identidade.aparelhoId),
    [identidade],
  );
  const fila = useLiveQuery(
    () => db.tabela<RelatoDeProblema>("relatosDeProblema").toArray(),
    [db],
    [] as RelatoDeProblema[],
  );

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Conta e Ajustes</h1>

      <section aria-labelledby="titulo-aparencia" className="space-y-2">
        <h2 id="titulo-aparencia" className="font-medium">
          Aparência
        </h2>
        <div className="flex gap-2">
          {Tema.options.map((opcao) => (
            <label
              key={opcao}
              className={`alvo-toque flex cursor-pointer items-center rounded-md border px-4 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 ${
                tema === opcao
                  ? "border-acento bg-acento text-acento-contraste"
                  : "border-borda bg-superficie hover:bg-borda/60"
              }`}
            >
              <input
                type="radio"
                name="tema"
                value={opcao}
                checked={tema === opcao}
                onChange={() => void definirTema(opcao)}
                className="sr-only"
              />
              {ROTULOS_TEMA[opcao]}
            </label>
          ))}
        </div>
      </section>

      <Dados />

      <section aria-labelledby="titulo-orientacoes" className="space-y-3">
        <h2 id="titulo-orientacoes" className="font-medium">
          Orientações
        </h2>
        {ORIENTACOES.map((secao) => (
          <details key={secao.id} className="rounded-md border border-borda p-3">
            <summary className="alvo-toque flex cursor-pointer items-center text-sm font-medium">
              {secao.titulo}
            </summary>
            <div className="mt-2 space-y-2 text-sm">
              {secao.paragrafos.map((paragrafo) => (
                <p key={paragrafo.slice(0, 40)}>{paragrafo}</p>
              ))}
            </div>
          </details>
        ))}
      </section>

      {fila.length > 0 && (
        <section aria-labelledby="titulo-relatos" className="space-y-2">
          <h2 id="titulo-relatos" className="font-medium">
            Problemas relatados
          </h2>
          <p className="text-sm text-texto-atenuado">
            Guardados neste aparelho; serão enviados quando a sincronização existir.
          </p>
          <ul className="space-y-1 text-sm">
            {fila.map((relato) => (
              <li key={relato.id} className="rounded-md border border-borda p-2">
                <span className="text-texto-atenuado">
                  {new Date(relato.criadoEm).toLocaleDateString("pt-BR")} ·{" "}
                </span>
                {relato.descricao}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-privacidade" className="space-y-2">
        <h2 id="titulo-privacidade" className="font-medium">
          Privacidade e segurança
        </h2>
        <p className="text-sm text-texto-atenuado">
          Tudo o que você registra fica no banco de dados deste navegador, neste aparelho. Nada é
          enviado para fora — não há conta, servidor nem rastreador. Quando a sincronização existir,
          você precisará entrar com uma conta e será avisado do que passa a ser enviado.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-texto-atenuado">Aparelho</dt>
          <dd>{aparelho ? `${aparelho.nome} (${aparelho.plataforma})` : "—"}</dd>
          <dt className="text-texto-atenuado">Versão do app</dt>
          <dd>{VERSAO_APP}</dd>
          <dt className="text-texto-atenuado">Versão do esquema</dt>
          <dd>{VERSAO_ESQUEMA}</dd>
        </dl>
      </section>
    </div>
  );
}
