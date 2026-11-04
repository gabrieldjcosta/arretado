import type { Passo, ResultadoDoPasso } from '../../../dominios/fio';

/** O que o gerador diz do passo em palavras (`descreverPasso`). */
export interface DescricaoDoPasso {
  titulo: string;
  apoio: string;
  minutos?: number | undefined;
}

/** O trilho do passo: quantos nós, quantos já feitos, e se o nó da vez acaba de chegar (anima). */
export interface TrilhoDoPasso {
  feitos: number;
  nos: number;
  animarNovo: boolean;
}

/** As props de cada tela de passo do quadro. `P` é a variante do `Passo` que ela hospeda. */
export interface PropsDoPassoM<P extends Passo = Passo> {
  passo: P;
  d: DescricaoDoPasso;
  /** O nome da matéria da etapa ("Execução Penal"). */
  materia: string;
  /** Estável para o mesmo passo: sair e voltar refaz as mesmas perguntas. */
  semente: number;
  trilho: TrilhoDoPasso;
  aoConcluir: (resultado: ResultadoDoPasso) => void;
  aoPular: () => void;
  aoPausar: () => void;
}

export type Variante<T extends Passo['tipo']> = Extract<Passo, { tipo: T }>;
