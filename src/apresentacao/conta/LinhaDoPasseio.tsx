import { useState } from 'react';
import { Chegada } from '../entrada/Chegada';
import { PASSEIO_NA_CONTA } from '../entrada/passeio/passos';

/**
 * A linha "Passeio pelos menus" da Conta (D-D10): refaz os quatro passos quando a pessoa quiser, direto
 * no primeiro, sem as Boas-vindas. É o passeio refeito: o último passo diz "Concluir", o Começar não
 * aparece e nada se grava. Ao sair, o foco volta ao botão.
 */
export function LinhaDoPasseio() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <div className="linha-do-passeio">
        <span className="linha-do-passeio-texto">
          <span className="linha-lista-titulo">{PASSEIO_NA_CONTA.titulo}</span>
          <span className="linha-do-passeio-apoio">{PASSEIO_NA_CONTA.apoio}</span>
        </span>
        <button
          type="button"
          className="botao"
          onClick={() => {
            setAberto(true);
          }}
        >
          {PASSEIO_NA_CONTA.acao}
        </button>
      </div>
      {aberto && (
        <Chegada
          inicio="passo"
          aoFechar={() => {
            setAberto(false);
          }}
        />
      )}
    </>
  );
}
