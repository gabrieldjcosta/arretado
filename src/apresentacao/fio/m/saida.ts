// O que o conteúdo de um passo pede ao cartão: sair para a direita (feito) ou para a esquerda (pulado).
// Chega por contexto: o cartão é quem sabe animar a saída, e quem tem o botão (o rodapé de cada passo)
// fica dentro dele.
import { createContext, useContext } from 'react';

export interface SaidaDoCartao {
  /** Faísca no trilho, cartão para a direita, e então `aoSeguir`. `botao` é de onde a faísca sai. */
  seguir: (botao?: Element | null) => void;
  /** Cartão para a esquerda, e então `aoPular`. */
  pular: () => void;
}

export const ContextoDaSaida = createContext<SaidaDoCartao | undefined>(undefined);

export function useSaidaDoCartao(): SaidaDoCartao {
  const saida = useContext(ContextoDaSaida);
  if (!saida) throw new Error('useSaidaDoCartao fora de um CartaoM');
  return saida;
}
