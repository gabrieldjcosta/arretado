// Dicas de cada área, uma por cartão, no estado em que a tela está (vazio ou em uso); cada dica começa pelo rótulo exato de
// um controle que está na tela. Vocabulário canônico; nada que soe como cobrança. Mudou o texto de
// uma tela: suba `versao` dela.

export type TelaComGuia = 'hoje' | 'plano' | 'recall' | 'biblioteca';

export interface Dica {
  opcao: string;
  efeito: string;
}

export interface Guia {
  /** Muda quando o conteúdo muda de forma que valha marcar como novo de novo. */
  versao: number;
  /** Controles do estado vazio da tela (ainda sem dados). */
  vazio: Dica[];
  /** Controles do estado com dados: só o que existe em qualquer tela já em uso. */
  uso: Dica[];
}

export const TITULO_DO_GUIA = 'O que cada opção faz';

export const GUIAS: Record<TelaComGuia, Guia> = {
  hoje: {
    versao: 5,
    vazio: [
      {
        opcao: 'Escolher meu concurso',
        efeito:
          'você diz qual concurso estuda e o app traz as normas com que ele começa e monta a Trilha do edital mais recente.',
      },
      { opcao: 'Botão +', efeito: 'registra um Erro. Só a Frase correta é obrigatória.' },
      {
        opcao: 'Leitura · Cartões · Frases',
        efeito: 'ficam marcados como feitos quando você lê, revisa ou fixa.',
      },
      { opcao: 'Para lembrar', efeito: 'uma nota sobre o que fazer fora do app.' },
    ],
    uso: [
      { opcao: 'Botão +', efeito: 'registra um Erro. Só a Frase correta é obrigatória.' },
      {
        opcao: 'Leitura · Cartões · Frases',
        efeito: 'ficam marcados como feitos quando você lê, revisa ou fixa.',
      },
    ],
  },
  plano: {
    versao: 5,
    vazio: [
      {
        opcao: 'Informar a data da prova',
        efeito:
          'opcional. O app deixa de marcar Revisão depois dela e faz uma passada final pelos Pontos mais cobrados.',
      },
      {
        opcao: 'Escolher meu concurso',
        efeito:
          'o app traz as normas com que o concurso começa e monta a Trilha do edital mais recente; dá para trocar o edital e as matérias, e desfazer.',
      },
      {
        opcao: 'Trazer meu edital',
        efeito:
          'leva ao formulário abaixo, para importar disciplinas e Pontos por planilha (CSV) ou colando a tabela que uma IA gerou.',
      },
      {
        opcao: 'Não sabe montar a planilha?',
        efeito: 'copia um pedido pronto para você colar numa IA junto com o texto do edital.',
      },
    ],
    uso: [
      {
        opcao: 'Editar pontos e matérias',
        efeito: 'muda ou acrescenta Pontos e matérias da Trilha.',
      },
      {
        opcao: 'Ciclo de estudo',
        efeito: 'monta o Ciclo: a ordem em que as matérias entram nos Dias.',
      },
      { opcao: 'Tarefas', efeito: 'suas tarefas livres, fora dos Pontos.' },
      {
        opcao: 'Importar outra planilha',
        efeito: 'acrescenta Pontos de uma planilha (CSV) ou de uma tabela colada.',
      },
    ],
  },
  recall: {
    versao: 4,
    vazio: [
      {
        opcao: 'Registrar erro',
        efeito:
          'guarda a Frase correta; se você escrever o que foi, já cria o Cartão (desmarque se não quiser).',
      },
      { opcao: 'Frases · Cartões · Histórico', efeito: 'o que você guardou, em três listas.' },
      {
        opcao: 'Ver os erros, com filtros',
        efeito: 'a lista dos Erros que você registrou.',
      },
    ],
    uso: [{ opcao: 'Frases · Cartões · Histórico', efeito: 'o que você guardou, em três listas.' }],
  },
  biblioteca: {
    versao: 4,
    vazio: [
      {
        opcao: 'Escolher meu concurso',
        efeito: 'o app traz as normas com que ele começa e monta a Trilha do edital mais recente.',
      },
      {
        opcao: 'Escolher no acervo',
        efeito: 'abre o acervo para você adicionar normas à sua Biblioteca.',
      },
      {
        opcao: 'Importar norma',
        efeito: 'você cola a lei do site oficial e o app separa artigos, parágrafos e incisos.',
      },
    ],
    uso: [
      { opcao: 'Buscar norma', efeito: 'procura entre as Normas da sua Biblioteca.' },
      {
        opcao: 'Disciplina · Ano · Tipo de norma',
        efeito: 'afinam a lista de Normas.',
      },
    ],
  },
};
