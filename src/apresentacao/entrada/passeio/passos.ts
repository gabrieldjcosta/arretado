// Os textos do Passeio (D-D10, contrato §7): uma fonte só. A Chegada, o passeio refeito (Conta e Ajuda) e
// os testes leem daqui; nenhum componente repete uma frase literal (`passos.test.ts` confere). Os nomes
// dos três lugares vêm de `fio/lugares.ts`, os mesmos da pílula do Fio. Os textos são do Gabriel (28/10,
// 31/10 e 03/11, as seis ferramentas em evidência).
import { LUGARES } from '../../fio/lugares';

/**
 * As Boas-vindas (Gabriel, 31/10; D-D11). O `titulo` e a `frase` são as duas partes da saudação e vão sempre
 * inteiras. O `nome` não se vê: é o nome do diálogo para o leitor de tela, porque a Abertura é `aria-hidden`
 * e sem ele ninguém ouviria o nome do app.
 */
export const BOAS_VINDAS = {
  nome: 'Boas-vindas ao Arretado!',
  titulo: 'Rapadura é doce, mas não é mole.',
  frase: 'A gente quebra em pedaços pra você. Vou te mostrar como!',
  vamos: 'Vamos',
  agoraNao: 'Agora não',
} as const;

export type IdDoPasso = 'agora' | 'destino' | 'varal';

/** Uma das ferramentas que o Passeio põe em evidência (Gabriel, 03/11): a frase em negrito e, se couber, uma linha de apoio. */
export interface Ferramenta {
  destaque: string;
  apoio?: string;
}

export interface Passo {
  id: IdDoPasso;
  /** O nome do lugar na pílula do Fio (Agora, Destino, Varal). */
  nome: string;
  /** O ícone de linha do lugar, 24 × 24: o que o passo desenha. */
  icone: string;
  frase: string;
  /** As ferramentas deste lugar em evidência: vêm primeiro na lista, com a frase em negrito. */
  ferramentas: readonly Ferramenta[];
  /** O resto do que o lugar faz, em linhas simples. */
  itens: readonly string[];
}

/**
 * Os ícones dos três lugares (Gabriel, 08/11): o fio com a conta (Agora), a estrela do Destino e o varal com as
 * duas peças. De linha, 24 × 24, como os de antes, mas do Fio: a casa, o calendário, as cartas e o livro saíram.
 */
const ICONES: Record<IdDoPasso, string> = {
  agora: 'M3 14c3.5-6 7 6 11 0 2-3 4-3 7-1M12 8.5v.01',
  destino: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z',
  varal: 'M3 6c6 3 12 3 18 0M8 8.5v6.5h4V9.2M14.5 9.6V15H18V9.9',
};

const TEXTOS_DOS_PASSOS: Record<IdDoPasso, Pick<Passo, 'frase' | 'ferramentas' | 'itens'>> = {
  agora: {
    frase: 'Aqui você vê o que fazer agora, sem agonia pra decidir.',
    ferramentas: [
      {
        destaque: 'Seus erros viram acertos e Cartões.',
        apoio: 'No botão +, traga a Frase correta pra lembrar depois.',
      },
    ],
    itens: ['Leitura, Cartões e Frases ficam marcados como feitos quando você lê, revisa ou fixa.'],
  },
  destino: {
    frase: 'Quanto da prova já é seu, com o edital em Pontos.',
    ferramentas: [
      {
        destaque: 'Ciclos de estudo facilitados.',
        apoio: 'Você define os seus aqui.',
      },
    ],
    itens: [],
  },
  varal: {
    frase: 'Suas normas, súmulas, Frases e Cartões.',
    ferramentas: [
      { destaque: 'Destaques automáticos contra pegadinhas.' },
      { destaque: 'Leis atualizadas e mapeadas.' },
      { destaque: 'Link entre leis e súmulas.' },
      { destaque: 'Transforme rapidamente um artigo em cartão.' },
    ],
    itens: [],
  },
};

/** Um passo por lugar, na ordem da pílula do Fio. Sem atalho para outra tela (Gabriel, 28/10). */
export const PASSOS: readonly Passo[] = LUGARES.map((lugar) => ({
  id: lugar.id,
  nome: lugar.nome,
  icone: ICONES[lugar.id],
  ...TEXTOS_DOS_PASSOS[lugar.id],
}));

export const COMECAR = {
  titulo: 'Vamo começar?',
} as const;

/**
 * Os dois botões de conta do Começar (Gabriel, 30/10): a ação e, na linha de baixo, o que ela traz. O texto de
 * `google` é o do botão de `conta/entrar/Entrar.tsx`.
 */
export const CONTA = {
  google: 'Entrar com o Google',
  googleApoio: 'e ter sincronização automática',
  semConta: 'Continuar sem conta',
  semContaApoio: 'e salvar meus dados manualmente',
  nota: 'Em fase de teste: por enquanto só e-mails convidados entram.',
} as const;

/** Fora do contrato do Gabriel (D-D10): o aviso do aceite sob os botões (o toque no do Google é o aceite) e as falhas. */
export const ENTRADA_DIRETA = {
  aceite:
    'Ao entrar, seu estudo passa a ser guardado na sua conta (dá para desligar) e você aceita a política de privacidade.',
  verAceite: 'Ver o que sai do Aparelho',
  avisoDeFalha: 'Não foi possível entrar agora. Tente de novo ou continue sem conta.',
  avisoSemArmazenamento: 'Não foi possível guardar o seu aceite neste navegador.',
} as const;

export const CONTROLES = {
  seguir: 'Seguir',
  concluir: 'Concluir',
  voltar: 'Voltar',
  voltarAsBoasVindas: 'Voltar às boas-vindas',
  voltarAoApp: 'Voltar ao app',
  pular: 'Pular o passeio',
} as const;

/** "Passo 2 de 4": o texto do topo de cada passo e o aviso para o leitor de tela. */
export const progressoDoPasso = (indice: number): string =>
  `Passo ${String(indice + 1)} de ${String(PASSOS.length)}`;

/** A linha do passeio em Conta (a fonte do que ela diz, e do botão que abre os três passos). */
export const PASSEIO_NA_CONTA = {
  titulo: 'Passeio pelos menus',
  apoio: 'Os três lugares, um por vez, quando você quiser.',
  acao: 'Fazer o passeio',
} as const;
