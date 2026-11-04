// Contrato do Fio (fatia 1 do plano "Arquitetura do Fio", 04/11/2026). O Fio é a sessão: um nó para
// puxar, um passo por vez, um pouso no fim de cada etapa. Este módulo é domínio puro: não lê banco
// nem tela. A camada de tela (fatia 3) junta o que o app sabe numa `EntradaDoFio` e guarda o
// `EstadoDoFio` no aparelho, sem esquema (entidade sincronizada só se o Gabriel pedir, F4-B).

/** Os sete tipos de passo. */
export type TipoDePasso =
  'ler' | 'lembrar' | 'guardar' | 'revisar' | 'fixar_sumula' | 'praticar' | 'seu_passo';

/** Um artigo (Dispositivo de topo) visto pelo gerador. */
export interface ArtigoDoFio {
  /** Endereço estável do Dispositivo na norma (o mesmo do Leitor). */
  endereco: string;
  /** Rótulo curto, como "Art. 112". */
  rotulo: string;
  /** Quantos grifos (Destaques, D-D17) o artigo tem. Sem grifo não há lacuna nem porteira. */
  grifos: number;
  /** "Lido até aqui" já passou por ele (dentro ou fora do Fio). */
  lido: boolean;
  /** Posição no Mapa da norma (0 = o que mais cai). Ausente: o Mapa não o considera relevante. */
  posicaoNoMapa?: number;
}

export interface NormaDoFio {
  id: string;
  /** "LEP", "CP", "Constituição". */
  tituloCurto: string;
  /** Na ordem do código. */
  artigos: readonly ArtigoDoFio[];
}

export interface SumulaDoFio {
  id: string;
  /** "Súmula 711 do STF", "Tema 1.001 do STJ". */
  rotulo: string;
  /** Já está no caderno (fixada). */
  fixada: boolean;
}

export interface MateriaDoFio {
  /** O mesmo id da disciplina no Ciclo. */
  id: string;
  nome: string;
  /** Na ordem de alcance: a principal primeiro (regra 6, "a próxima norma da matéria"). */
  normas: readonly NormaDoFio[];
  /** Súmulas e teses da matéria, na ordem do que mais cai. */
  sumulas: readonly SumulaDoFio[];
  /** Quantos trechos de "Ache o erro" a matéria tem prontos. */
  acheOErro?: number;
  /** O ponto da matéria que mais pesou nos erros, com o artigo ligado quando houver. */
  pesou?: { rotulo: string; erros: number; normaId?: string; artigo?: ArtigoDoFio };
}

export interface TarefaDoFio {
  id: string;
  titulo: string;
}

/** O que o app sabe do estudo agora, já contado pela camada de tela. */
export interface EntradaDoFio {
  /** Data civil de hoje (AAAA-MM-DD). */
  hoje: string;
  materias: readonly MateriaDoFio[];
  /** Ciclo ativo: as matérias dos blocos, em ordem, e o índice do próximo bloco. */
  ciclo?: { blocos: readonly string[]; indice: number };
  /** Matéria da última leitura. */
  ultimaLeitura?: string;
  /** Matérias da prova escolhida (o pacote de partida), em ordem. */
  prova?: readonly string[];
  /** Cartões e Frases vencidos, somados. */
  vencidos: number;
  /** Tarefas postas no fio ("Pôr no fio"), em ordem. */
  tarefas: readonly TarefaDoFio[];
  /** Data da prova (AAAA-MM-DD), opcional. */
  dataDaProva?: string;
}

/** Artigo levado num passo: só o que a tela precisa para abrir o Leitor. */
export interface ArtigoNoPasso {
  endereco: string;
  rotulo: string;
}

export type PorQueLer = 'mapa' | 'codigo' | 'pesou';
export type PorQuePraticar = 'fim_do_mapa' | 'quarta_etapa' | 'reta_final' | 'complemento';

export type Passo =
  | {
      tipo: 'ler';
      materiaId: string;
      normaId: string;
      tituloCurto: string;
      artigos: readonly ArtigoNoPasso[];
      porque: PorQueLer;
    }
  /** Matéria sem norma: o passo Ler vira "Adicionar a lei desta matéria" (regra 3). */
  | { tipo: 'ler'; materiaId: string; adicionarNorma: true }
  | {
      tipo: 'lembrar';
      materiaId: string;
      normaId: string;
      tituloCurto: string;
      /** Só os artigos com grifo do Ler logo antes. */
      artigos: readonly ArtigoNoPasso[];
    }
  /** Só depois de um Lembrar com erro; não conta no tamanho da etapa. */
  | { tipo: 'guardar'; materiaId: string; normaId: string; enderecos: readonly string[] }
  | { tipo: 'revisar'; materiaId: string; quantidade: number }
  | { tipo: 'fixar_sumula'; materiaId: string; sumulaId: string; rotulo: string }
  | {
      tipo: 'praticar';
      materiaId: string;
      modo: 'porteira' | 'ache_o_erro';
      quantidade: number;
      porque: PorQuePraticar;
    }
  | { tipo: 'seu_passo'; materiaId: string; tarefaId: string; titulo: string };

/** O que a pessoa fez no passo, contado pela tela. */
export type ResultadoDoPasso =
  | { tipo: 'ler'; lidos: number }
  | { tipo: 'lembrar'; acertos: number; erros: readonly string[] }
  | { tipo: 'guardar'; guardadas: number }
  | { tipo: 'revisar'; revisados: number; voltamAmanha: number }
  | { tipo: 'fixar_sumula' }
  | { tipo: 'praticar'; acertos: number; total: number }
  | { tipo: 'seu_passo'; questoes?: number };

/** Como o passo fechou. "ja_feito": a leitura fora do Fio já cobria o passo. */
export type Fechamento =
  { como: 'feito'; resultado: ResultadoDoPasso } | { como: 'pulado' } | { como: 'ja_feito' };

export interface Etapa {
  /** Número da etapa no Fio, a partir de 0 (a primeira etapa é 0). */
  numero: number;
  materiaId: string;
  /** Nome da matéria no início da etapa (o pouso o diz mesmo que a matéria saia). */
  materia: string;
  /** Passos planejados quando a etapa começou (o plano não muda depois, só ganha Guardar). */
  passos: readonly Passo[];
  /** Fechamento de cada passo, no mesmo índice; ausente = ainda não fechou. */
  fechados: readonly (Fechamento | undefined)[];
  /** Índice do passo aberto quando a pessoa parou; o próximo puxão o retoma. */
  aberto?: number;
  /** A etapa leva a porteira do fim do Mapa desta matéria. */
  porteiraDoFim?: boolean;
}

/** O que fica de um pouso: os fatos em frases curtas. */
export interface Pouso {
  etapa: number;
  materia: string;
  fatos: readonly string[];
}

/** Estado do Fio no aparelho. JSON simples; `lerEstadoDoFio` aceita qualquer coisa guardada. */
export interface EstadoDoFio {
  versao: 1;
  /** Etapas já pousadas, no Fio todo. A próxima etapa recebe este número. */
  etapasFeitas: number;
  /** Passos fechados (feitos, pulados ou já feitos) no Fio todo. */
  passosDados: number;
  /** Etapas pousadas por matéria (regra 7: porteira a cada 4). */
  etapasPorMateria: Readonly<Record<string, number>>;
  /** Matérias que já passaram pela porteira do fim do Mapa. */
  porteirasDoFim: readonly string[];
  etapa?: Etapa;
  /** Os últimos pousos, o mais recente primeiro (no máximo `POUSOS_GUARDADOS`). */
  pousos: readonly Pouso[];
}
