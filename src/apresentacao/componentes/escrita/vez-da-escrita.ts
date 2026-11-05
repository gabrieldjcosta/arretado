import { createContext, useContext } from 'react';
import { criarEncontro, type Encontro } from './encontro';
import type { Escrita, EscritaNaTela } from './frequencia';

/** Onde o nome se escreve nesta abertura do aplicativo (contrato do Zé, §9): na tela cheia ou no cabeçalho. */
export type OndeEscrever =
  /**
   * A camada de tela cheia escreve (toda abertura, D-D14: completa na primeira vez, `doDia` na primeira do
   * Dia e `depressa` nas demais); o cabeçalho nasce parado. `chegada`: a Chegada vai abrir nesta mesma
   * abertura (aparelho que nasceu hoje e ainda não a viu), e a luz da primeira vez pode voar até o Zé dela
   * em vez de ir ao cabeçalho.
   */
  | { onde: 'tela'; escrita: EscritaNaTela; calmo: boolean; chegada: boolean }
  /** O cabeçalho escreve como sempre escreveu: o que a frequência pede, ou nada (`parada`). */
  | { onde: 'cabecalho'; escrita: Escrita };

/**
 * De quem é a escrita do nome nesta abertura. `livre`: não há Abertura na árvore (um `Marca` sozinho,
 * como nos testes), e o cabeçalho decide pela frequência. `pendente`: a Abertura ainda lê as
 * Preferências e a Sessão para decidir; o cabeçalho espera, para nunca escrever junto com ela.
 */
export type VezDaEscrita =
  { estado: 'livre' } | { estado: 'pendente' } | ({ estado: 'decidida' } & OndeEscrever);

/**
 * A abertura do Arretado novo (o Fio): em vez da camada de tela cheia, o quadro dele a mostra como a tela
 * `abertura` do mockup. O provedor decide e conta como ela saiu; o quadro a monta.
 */
export interface CamadaDoFio {
  escrita: EscritaNaTela;
  calmo: boolean;
  aoSair: (como: 'fim' | 'pulou') => void;
}

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
  /** Só no Fio: a abertura que o quadro dele deve mostrar agora, ou `null`. */
  camadaDoFio: CamadaDoFio | null;
}

export const ContextoDaAbertura = createContext<EstadoDaAbertura>({
  vez: { estado: 'livre' },
  emCurso: false,
  voaParaAChegada: false,
  encontro: criarEncontro(),
  camadaDoFio: null,
});

export const useVezDaEscrita = (): VezDaEscrita => useContext(ContextoDaAbertura).vez;

export const useEstadoDaAbertura = (): EstadoDaAbertura => useContext(ContextoDaAbertura);

export const useAberturaEmCurso = (): boolean => useContext(ContextoDaAbertura).emCurso;
