// Os itens que uma tela acrescenta ao painel do "+" da casca (D-D24). O "+" é um só e fica em toda
// tela (D-D23); o que ele cria, porém, depende de onde a pessoa está. No Leitor, "Registrar erro" e
// "Cartão deste trecho" nascem ligados ao dispositivo no alto da tela, então é o Leitor quem os entrega.
import { createContext, useContext, useEffect, useRef } from 'react';

/** Um item que a tela acrescenta ao painel do "+". */
export interface ItemDoMais {
  /**
   * Identifica o item. `registrar-erro` troca o link genérico do painel pelo da tela, e a tecla E o
   * usa no lugar de ir à tela de registro.
   */
  id: string;
  nome: string;
  /** A frase de apoio, de uma linha, que diz onde o item age ("Ligado ao Art. 112"). */
  apoio: string;
  /** A tecla de atalho, só para quem tem teclado. */
  atalho?: string;
  /** Sem ação possível agora: o item aparece apagado e o apoio diz por quê. */
  indisponivel?: boolean;
  aoEscolher: () => void;
}

/**
 * O que a tela entrega. É lida quando o painel abre e quando a tecla E é apertada, nunca a cada
 * renderização: ela pode medir a tela (qual dispositivo está no alto) sem custo enquanto ninguém olha.
 */
export type FonteDeItens = () => readonly ItemDoMais[];

export interface RegistroDeItens {
  /** A tela que montou passa a ser a fonte; uma só por vez. */
  definir: (fonte: FonteDeItens) => void;
  /** A tela que desmontou sai, a não ser que outra já tenha tomado o lugar dela. */
  limpar: (fonte: FonteDeItens) => void;
  itens: () => readonly ItemDoMais[];
}

export function criarRegistroDeItens(): RegistroDeItens {
  let atual: FonteDeItens | undefined;
  return {
    definir: (fonte) => {
      atual = fonte;
    },
    limpar: (fonte) => {
      if (atual === fonte) atual = undefined;
    },
    itens: () => atual?.() ?? [],
  };
}

const Contexto = createContext<RegistroDeItens | null>(null);

/** A casca (`Shell`) cria o registro e o oferece a tudo o que ela desenha. */
export const ProvedorDeItensDoMais = Contexto.Provider;

/** Quem lê os itens: o "+" e a tecla E. Sem casca em volta (um teste isolado), não há itens. */
export function useRegistroDeItens(): RegistroDeItens | null {
  return useContext(Contexto);
}

/**
 * A tela chama no corpo do componente com a função que devolve os itens dela. A função lida é sempre
 * a da última renderização, e a tela sai do registro ao desmontar.
 */
export function useItensDoMais(fonte: FonteDeItens): void {
  const registro = useContext(Contexto);
  const ultima = useRef(fonte);
  useEffect(() => {
    ultima.current = fonte;
  });
  useEffect(() => {
    if (!registro) return;
    const daTela: FonteDeItens = () => ultima.current();
    registro.definir(daTela);
    return () => {
      registro.limpar(daTela);
    };
  }, [registro]);
}
