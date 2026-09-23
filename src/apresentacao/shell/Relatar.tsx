import { Botao } from "@apresentacao/componentes/Botao";
import { Dialogo } from "@apresentacao/componentes/Dialogo";
import { LimiteDeRelatosAtingido } from "@suporte/relatar/servico";
import { useState } from "react";
import { useLocation } from "react-router";
import { useApp } from "./contexto-core";

/**
 * "!" Relatar problema (D23): canal único, um por dia, descrição obrigatória.
 * **Problema** é falha da plataforma — "erro" é só de estudo (D24). Nada de conteúdo de estudo vai
 * junto: o relato leva a descrição, a tela, a versão do app e o aparelho.
 */
export function Relatar() {
  const { relatos } = useApp();
  const { pathname } = useLocation();
  const [aberto, definirAberto] = useState(false);
  const [descricao, definirDescricao] = useState("");
  const [estado, definirEstado] = useState<"editando" | "salvo" | "limite">("editando");
  const [falha, definirFalha] = useState<string | null>(null);

  const fechar = () => {
    definirAberto(false);
    definirDescricao("");
    definirEstado("editando");
    definirFalha(null);
  };

  const enviar = async () => {
    try {
      await relatos.relatar(descricao, pathname);
      definirEstado("salvo");
    } catch (problema) {
      if (problema instanceof LimiteDeRelatosAtingido) definirEstado("limite");
      else definirFalha(problema instanceof Error ? problema.message : "Não foi possível guardar.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => definirAberto(true)}
        aria-label="Relatar problema"
        title="Relatar problema"
        className="alvo-toque rounded-md px-3 text-sm font-medium hover:bg-borda/60"
      >
        !
      </button>

      <Dialogo
        aberto={aberto}
        aoFechar={fechar}
        titulo="Relatar problema"
        descricao="Conte o que aconteceu. Nada do seu estudo é enviado junto."
      >
        {estado === "salvo" ? (
          <div className="space-y-4 text-sm">
            <p>
              Relato guardado neste aparelho. Ele será enviado quando a sincronização existir; até
              lá fica na fila, em Conta e Ajustes.
            </p>
            <Botao variante="principal" onClick={fechar}>
              Entendi
            </Botao>
          </div>
        ) : estado === "limite" ? (
          <div className="space-y-4 text-sm">
            <p>Você já relatou um problema hoje. Pode relatar outro amanhã.</p>
            <Botao variante="principal" onClick={fechar}>
              Entendi
            </Botao>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block">O que aconteceu?</span>
              <textarea
                value={descricao}
                onChange={(evento) => definirDescricao(evento.target.value)}
                rows={5}
                className="w-full rounded-md border border-borda bg-fundo p-2"
                placeholder="Ex.: ao tocar em Exportar, nada acontece."
              />
            </label>
            {falha && <p className="text-sm">{falha}</p>}
            <Botao variante="principal" disabled={!descricao.trim()} onClick={() => void enviar()}>
              Guardar relato
            </Botao>
          </div>
        )}
      </Dialogo>
    </>
  );
}
