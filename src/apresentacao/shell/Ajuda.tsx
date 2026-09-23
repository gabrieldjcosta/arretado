import { Dialogo } from "@apresentacao/componentes/Dialogo";
import { ORIENTACOES, orientacao } from "@suporte/orientacoes/conteudo";
import { useState } from "react";

interface Props {
  /** Seção das Orientações que responde à dúvida desta tela (D23). */
  secao: string;
}

/** "?" contextual: ajuda no ponto da dúvida, apontando para a seção certa das Orientações. */
export function Ajuda({ secao }: Props) {
  const [aberto, definirAberto] = useState(false);
  const conteudo = orientacao(secao) ?? ORIENTACOES[0];

  return (
    <>
      <button
        type="button"
        onClick={() => definirAberto(true)}
        aria-label="Orientações sobre esta tela"
        title="Orientações"
        className="alvo-toque rounded-md px-3 text-sm font-medium hover:bg-borda/60"
      >
        ?
      </button>
      <Dialogo
        aberto={aberto}
        aoFechar={() => definirAberto(false)}
        titulo={conteudo?.titulo ?? "Orientações"}
      >
        <div className="space-y-3 text-sm">
          {conteudo?.paragrafos.map((paragrafo) => (
            <p key={paragrafo.slice(0, 40)}>{paragrafo}</p>
          ))}
        </div>
      </Dialogo>
    </>
  );
}
