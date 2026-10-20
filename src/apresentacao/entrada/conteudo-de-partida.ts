// O conteúdo de partida da Entrada do Dia: 12 Citações e 12 dicas, uma de cada por Dia. Fica num módulo
// só dele porque a Entrada o carrega sob demanda (`conteudo.ts`): quem não a vê não baixa nada disso.
// Texto puro, nunca HTML. O conteúdo definitivo (calendário de 366 Dias) entra depois e troca este arquivo.
//
// Citações: só autores mortos até 1954 (domínio público). Os versos levam a quebra de linha do original
// (`\n`); a tela a respeita. Citação traduzida leva "(tradução do Arretado)" na obra: a tradução é nossa,
// do original, para não depender de edição alheia. A ordem das duas listas põe, em 21/10/2026, a
// Citação de Ricardo Reis com a dica de tentar lembrar, o par da prancha da Entrada.
import type { Citacao, Dica } from './conteudo';

export const CITACOES: readonly Citacao[] = [
  {
    texto: 'Quem começa já tem metade da obra feita.',
    autor: 'Horácio',
    obra: 'Epístolas (tradução do Arretado)',
  },
  {
    texto: 'Sinto-me nascido a cada momento\nPara a eterna novidade do Mundo...',
    autor: 'Fernando Pessoa (Alberto Caeiro)',
    obra: 'O Guardador de Rebanhos',
  },
  {
    texto: 'Todos os seres humanos, por natureza, desejam conhecer.',
    autor: 'Aristóteles',
    obra: 'Metafísica (tradução do Arretado)',
  },
  {
    texto:
      'Segue o teu destino,\nRega as tuas plantas,\nAma as tuas rosas.\nO resto é a sombra\nDe árvores alheias.',
    autor: 'Fernando Pessoa (Ricardo Reis)',
    obra: 'Odes',
  },
  {
    texto:
      'Tenha paciência com tudo o que não está resolvido no seu coração e tente amar as próprias perguntas.',
    autor: 'Rainer Maria Rilke',
    obra: 'Cartas a um jovem poeta (tradução do Arretado)',
  },
  {
    texto: 'Sê todo em cada coisa. Põe quanto és\nNo mínimo que fazes.',
    autor: 'Fernando Pessoa (Ricardo Reis)',
    obra: 'Odes',
  },
  {
    texto: "O livro caindo n'alma\nÉ germe — que faz a palma,\nÉ chuva — que faz o mar!",
    autor: 'Castro Alves',
    obra: 'O Livro e a América',
  },
  {
    texto: 'Das coisas que existem, umas dependem de nós; outras, não.',
    autor: 'Epicteto',
    obra: 'Manual (tradução do Arretado)',
  },
  {
    texto:
      'Viva agora as perguntas. Talvez então, aos poucos, sem perceber, num dia distante você acabe vivendo dentro da resposta.',
    autor: 'Rainer Maria Rilke',
    obra: 'Cartas a um jovem poeta (tradução do Arretado)',
  },
  {
    texto:
      'Verdes mares bravios de minha terra natal, onde canta a jandaia nas frondes da carnaúba.',
    autor: 'José de Alencar',
    obra: 'Iracema',
  },
  {
    texto: 'O que herdaste de teus pais, conquista-o para o possuíres.',
    autor: 'Johann Wolfgang von Goethe',
    obra: 'Fausto (tradução do Arretado)',
  },
  {
    texto: 'A justiça é a vontade constante e perpétua de dar a cada um o seu direito.',
    autor: 'Ulpiano',
    obra: 'Digesto (tradução do Arretado)',
  },
];

export const DICAS: readonly Dica[] = [
  {
    destaque: 'Comece pelo menor pedaço.',
    texto:
      'Um artigo, um cartão, dois minutos. Começar pequeno já é estudar, e o resto pode esperar.',
  },
  {
    destaque: 'Abra uma coisa de cada vez.',
    texto: 'Deixe na tela só o que você vai usar agora. O resto espera na lista, sem pressa.',
  },
  {
    destaque: 'Anote o próximo passo antes de sair.',
    texto:
      'Uma linha basta, como “ler o art. 5º, inciso X”. Na volta, você não precisa decidir por onde começar.',
  },
  {
    destaque: 'Alterne leitura e cartões.',
    texto: 'Quando a leitura pesar, passe cinco minutos nos cartões e depois volte ao texto.',
  },
  {
    destaque: 'Para registrar um erro, uma frase basta.',
    texto:
      'Escreva a frase correta com as suas palavras. Os detalhes você completa quando sobrar tempo.',
  },
  {
    destaque: 'Tentar lembrar vale mais que reler.',
    texto:
      'Antes de ver a resposta, diga em voz alta o que você acha. Errar aqui não conta contra você: é o que a revisão usa.',
  },
  {
    destaque: 'Combine a pausa antes de começar.',
    texto:
      'Dez minutos lendo, dois descansando, por exemplo. Com a pausa combinada, você não precisa decidir quando parar.',
  },
  {
    destaque: 'Sublinhe pouco.',
    texto:
      'Marque só o que você teria de lembrar sem olhar. Texto todo grifado deixa de mostrar o que importa.',
  },
  {
    destaque: 'Marque com a Estrela e siga.',
    texto:
      'A Estrela marca o trecho para você voltar depois. Não precisa decidir agora o que fazer com ele.',
  },
  {
    destaque: 'Uma Sessão curta também conta.',
    texto:
      'Dez minutos com um objetivo pequeno já são uma Sessão. Comece com o que couber no seu Dia.',
  },
  {
    destaque: 'Explique em voz alta, como a um amigo.',
    texto:
      'Depois de ler, diga com as suas palavras o que entendeu. Onde faltar palavra, volte ao texto.',
  },
  {
    destaque: 'Prepare a mesa antes de sentar.',
    texto:
      'Água, caderno e o material do dia ao alcance da mão. Assim você não precisa levantar no meio.',
  },
];
