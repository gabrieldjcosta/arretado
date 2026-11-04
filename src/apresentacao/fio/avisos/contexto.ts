import { createContext, useContext } from 'react';

export interface Aviso {
  texto: string;
  /** Aparece o botão "Desfazer"; roda ao tocar e fecha o aviso. */
  desfazer?: () => void;
  /** Padrão 5 000 ms. */
  duracaoMs?: number;
}

export const ContextoDeAvisos = createContext<(aviso: Aviso) => void>(() => undefined);

export const useAvisos = () => useContext(ContextoDeAvisos);
