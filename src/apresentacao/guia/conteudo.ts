// Guia da primeira abertura de cada área: só o estado vazio, e cada linha começa pelo rótulo exato de
// um controle que está na tela. Vocabulário canônico; nada que soe como cobrança. Mudou o texto de
// uma tela: suba `versao` dela.

export type TelaComGuia = 'hoje' | 'plano' | 'recall' | 'biblioteca';

export interface Guia {
  /** Muda quando o conteúdo muda de forma que valha mostrar de novo. */
  versao: number;
  linhas: { opcao: string; efeito: string }[];
}

export const TITULO_DO_GUIA = 'O que cada opção faz';

export const GUIAS: Record<TelaComGuia, Guia> = {
  hoje: {
    versao: 2,
    linhas: [
      {
        opcao: 'Escolher meu concurso',
        efeito: 'você diz qual concurso estuda e o app traz as normas com que ele começa.',
      },
      { opcao: 'Botão +', efeito: 'registra um Erro. Só a Frase correta é obrigatória.' },
      {
        opcao: 'Leitura · Cartões · Frases',
        efeito: 'acendem sozinhos quando você lê, revisa ou fixa.',
      },
      { opcao: 'Para lembrar', efeito: 'uma nota sobre o que fazer fora do app.' },
    ],
  },
  plano: {
    versao: 2,
    linhas: [
      {
        opcao: 'Informar a data da prova',
        efeito:
          'opcional. O app deixa de marcar Revisão depois dela e faz uma passada final pelos Pontos mais cobrados.',
      },
      {
        opcao: 'Montar pelo catálogo',
        efeito:
          'uma pergunta por tela, da carreira às matérias; você vê a prévia antes de os Pontos entrarem e pode desfazer.',
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
  },
  recall: {
    versao: 2,
    linhas: [
      {
        opcao: 'Registrar erro',
        efeito: 'guarda a Frase correta; o Cartão só nasce se você quiser.',
      },
      { opcao: 'Frases · Cartões · Histórico', efeito: 'o que você guardou, em três listas.' },
      {
        opcao: 'Ver os erros, com filtros',
        efeito: 'a lista dos Erros que você registrou.',
      },
    ],
  },
  biblioteca: {
    versao: 2,
    linhas: [
      {
        opcao: 'Escolher meu concurso',
        efeito: 'o app traz as normas com que ele começa.',
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
  },
};
