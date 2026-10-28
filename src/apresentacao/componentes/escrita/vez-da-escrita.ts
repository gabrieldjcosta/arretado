import { createContext, useContext } from 'react';
import { criarEncontro, type Encontro } from './encontro';
import type { Escrita } from './frequencia';

/** Onde o nome se escreve nesta abertura do aplicativo (contrato do Zé, §9): na tela cheia ou no cabeçalho. */
export type OndeEscrever =
  /**
   * A camada de tela cheia escreve (completa na primeira vez, curta na primeira do Dia); o cabeçalho nasce
   * parado. `chegada`: a Chegada vai abrir nesta mesma abertura (aparelho que nasceu hoje e ainda não a
   * viu), e a luz da primeira vez pode voar até o Zé dela em vez de ir ao cabeçalho.
   */
  | { onde: 'tela'; escrita: Exclude<Escrita, 'parada'>; calmo: boolean; chegada: boolean }
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
   * fica por cima e cobriria o nome. A exceção é a Chegada que a luz vai visitar (`voaParaAChegada`).
   */
  emCurso: boolean;
  /**
   * A camada de tela cheia vai levar a luz ao Zé das Boas-vindas: a Chegada abre já, mas escondida e
   * parada, por cima do nome (o `<dialog>` modal entra na camada de topo depois da Abertura, e é ele que
   * aparece quando a luz pousa). Falso no Calmo, que não tem voo.
   */
  voaParaAChegada: boolean;
  /** Por onde a Chegada se oferece à luz e a Abertura a recebe. */
  encontro: Encontro;
}

export const ContextoDaAbertura = createContext<EstadoDaAbertura>({
  vez: { estado: 'livre' },
  emCurso: false,
  voaParaAChegada: false,
  encontro: criarEncontro(),
});

export const useVezDaEscrita = (): VezDaEscrita => useContext(ContextoDaAbertura).vez;

export const useEstadoDaAbertura = (): EstadoDaAbertura => useContext(ContextoDaAbertura);

export const useAberturaEmCurso = (): boolean => useContext(ContextoDaAbertura).emCurso;
