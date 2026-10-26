// Guia da primeira abertura de cada área: o que cada opção faz, em linhas curtas. Vocabulário
// canônico; nada que soe como cobrança. Mudou o texto de uma tela: suba `versao` dela.

export type TelaComGuia = 'hoje' | 'plano' | 'recall' | 'biblioteca';

export interface Guia {
  titulo: string;
  /** Muda quando o conteúdo muda de forma que valha mostrar de novo. */
  versao: number;
  linhas: { opcao: string; efeito: string }[];
}

export const GUIAS: Record<TelaComGuia, Guia> = {
  hoje: {
    titulo: 'O que cada opção faz',
    versao: 1,
    linhas: [
      { opcao: 'Botão grande', efeito: 'abre a próxima ação do seu Dia. Uma só, sem lista.' },
      { opcao: 'Em seguida', efeito: 'mostra o que vem depois; “Trocar” escolhe outra.' },
      { opcao: '+', efeito: 'registra um Erro. Só a Frase correta é obrigatória.' },
      { opcao: 'Pontos do Dia', efeito: 'acendem sozinhos quando você lê, revisa ou fixa.' },
    ],
  },
  plano: {
    titulo: 'O que cada opção faz',
    versao: 1,
    linhas: [
      { opcao: 'Montar pelo catálogo', efeito: 'você escolhe um concurso e os Pontos já vêm.' },
      { opcao: 'Trazer meu edital', efeito: 'importa suas disciplinas e Pontos.' },
      { opcao: 'Pontos', efeito: 'servem para ligar cada Erro ao assunto do edital.' },
    ],
  },
  recall: {
    titulo: 'O que cada opção faz',
    versao: 1,
    linhas: [
      { opcao: 'Começar', efeito: 'abre a Revisão de hoje: Cartões e Frases, até a cota.' },
      {
        opcao: 'Registrar erro',
        efeito: 'guarda a Frase correta; o Cartão só nasce se você quiser.',
      },
      { opcao: 'Frases · Cartões · Histórico', efeito: 'o que você guardou, em três listas.' },
      { opcao: 'Ache o erro', efeito: 'uma rodada com trechos trocados no texto da lei.' },
    ],
  },
  biblioteca: {
    titulo: 'O que cada opção faz',
    versao: 1,
    linhas: [
      { opcao: 'Abrir uma Norma', efeito: 'lê por Dispositivo e lembra até onde você leu.' },
      { opcao: 'Estrela', efeito: 'marca um Dispositivo para achar de novo.' },
      { opcao: 'Buscar norma', efeito: 'procura no acervo e adiciona à sua Biblioteca.' },
      { opcao: 'Súmulas · Teses · Resumos · Precedentes', efeito: 'as abas do alto.' },
    ],
  },
};
