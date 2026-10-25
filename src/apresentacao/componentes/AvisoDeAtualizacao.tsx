import { useState } from 'react';
import { aplicarAtualizacao, useAtualizacaoPronta } from '../../offline/registro';

/**
 * Faixa fina quando há versão nova pronta (AP-00). A troca nunca acontece sozinha: "Atualizar"
 * recarrega esta aba, "Depois" guarda a faixa até a próxima abertura (a versão nova entra quando
 * todas as abas fecharem). Nenhum dado local é tocado em nenhum dos dois caminhos.
 */
export function AvisoDeAtualizacao() {
  const pronta = useAtualizacaoPronta();
  const [adiado, setAdiado] = useState(false);
  if (!pronta || adiado) return null;
  return (
    <div className="faixa-atualizacao" role="status">
      <span>Uma versão nova do Arretado está pronta.</span>
      <span className="faixa-atualizacao-acoes">
        <button type="button" className="botao botao-texto" onClick={aplicarAtualizacao}>
          Atualizar
        </button>
        <button
          type="button"
          className="botao botao-texto"
          onClick={() => {
            setAdiado(true);
          }}
        >
          Depois
        </button>
      </span>
    </div>
  );
}
