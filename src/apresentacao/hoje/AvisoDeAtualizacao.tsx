import { useState } from 'react';
import { aplicarAtualizacao, useAtualizacaoPronta } from '../../offline/registro';
import './estilos-hoje.css';

/**
 * Uma linha quieta no fim do Hoje quando há versão nova pronta (AP-00), ao lado do lembrete de backup:
 * chega depois do resto, então nada que a pessoa está lendo ou tocando se mexe. A troca nunca
 * acontece sozinha: "Atualizar" recarrega esta aba, "Depois" esconde a linha até a pessoa voltar ao
 * Hoje (a versão nova entra quando todas as abas fecharem). Nenhum dado local é tocado em nenhum dos
 * dois caminhos.
 */
export function AvisoDeAtualizacao() {
  const pronta = useAtualizacaoPronta();
  const [adiado, setAdiado] = useState(false);
  if (!pronta || adiado) return null;
  return (
    <p className="aviso-de-atualizacao" role="status">
      <span>Uma versão nova do Arretado está pronta.</span>{' '}
      <button type="button" className="discreto" onClick={aplicarAtualizacao}>
        Atualizar
      </button>{' '}
      <button
        type="button"
        className="discreto"
        onClick={() => {
          setAdiado(true);
        }}
      >
        Depois
      </button>
    </p>
  );
}
