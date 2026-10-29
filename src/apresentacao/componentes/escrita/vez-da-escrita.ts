import { createContext, useContext } from 'react';
import type { Escrita } from './frequencia';

/** Onde o nome se escreve nesta abertura do aplicativo (contrato do Zé, §9): na tela cheia ou no cabeçalho. */
export type OndeEscrever =
  /** A camada de tela cheia escreve (completa na primeira vez, curta na primeira do Dia); o cabeçalho nasce parado. */
  | { onde: 'tela'; escrita: Exclude<Escrita, 'parada'>; calmo: boolean }
  /** O cabeçalho escreve como sempre escreveu: o que a frequência pede, ou nada (`parada`). */
  | { onde: 'cabecalho'; escrita: Escrita };

/**
 * De quem é a escrita do nome nesta abertura. `livre`: não há Abertura na árvore (um `Marca` sozinho,
 * como nos testes), e o cabeçalho decide pela frequência. `pendente`: a Abertura ainda lê as
 * Preferências e a Sessão para decidir; o cabeçalho espera, para nunca escrever junto com ela.
 */
export type VezDaEscrita =
  { estado: 'livre' } | { estado: 'pendente' } | ({ estado: 'decidida' } & OndeEscrever);

export interface EstadoDaAbertura {
  vez: VezDaEscrita;
  /**
   * A decisão ainda pende ou a camada de tela cheia está na tela: o que abre por cima do app (a
   * Chegada, um `<dialog>` modal) espera, porque quem entra na camada de topo do navegador depois
   * fica por cima e cobriria o nome.
   */
  emCurso: boolean;
}

export const ContextoDaAbertura = createContext<EstadoDaAbertura>({
  vez: { estado: 'livre' },
  emCurso: false,
});

export const useVezDaEscrita = (): VezDaEscrita => useContext(ContextoDaAbertura).vez;

export const useAberturaEmCurso = (): boolean => useContext(ContextoDaAbertura).emCurso;
