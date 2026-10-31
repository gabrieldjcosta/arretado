// Os textos do Passeio (D-D10, contrato §7): uma fonte só. A Chegada, o passeio refeito (Conta e Ajuda) e
// os testes leem daqui; nenhum componente repete uma frase literal (`passos.test.ts` confere). Os nomes
// e os ícones dos quatro menus vêm de `areas.ts`, os mesmos das abas. Os textos são do Gabriel (28/10 e
// 31/10).
import { AREAS } from '../../areas';

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

export type IdDoPasso = 'hoje' | 'plano' | 'recall' | 'biblioteca';

export interface Passo {
  id: IdDoPasso;
  /** O nome da aba (Hoje, Trilha, Fixar, Biblioteca). */
  nome: string;
  /** O ícone de linha da aba, 24 × 24: o mesmo que o passo desenha. */
  icone: string;
  frase: string;
  itens: readonly string[];
}

const TEXTOS_DOS_PASSOS: Record<IdDoPasso, Pick<Passo, 'frase' | 'itens'>> = {
  hoje: {
    frase: 'Aqui você vê o que tem pra fazer, sem agonia pra decidir.',
    itens: [
      'No botão + você monta seu caderno de erros. Errou? Traga a Frase correta pra revisar e lembrar depois.',
      'Leitura, Cartões e Frases ficam marcados como feitos quando você lê, revisa ou fixa.',
    ],
  },
  plano: {
    frase: 'O edital em Pontos, montado pelo catálogo ou trazido por você.',
    itens: ['Você também pode definir ciclos de estudo aqui na Trilha.'],
  },
  recall: {
    frase: 'Suas Frases e Cartões, com a Revisão de cada dia.',
    itens: [
      'Gosta de cartões de revisão? Aqui você pode montar os seus para se testar.',
      'Dica: depois do passeio, faça cinco questões e registre o que precisa lembrar.',
    ],
  },
  biblioteca: {
    frase: 'Onde ficam as normas pra ler e os seus resumos.',
    itens: [
      'Termos-chave de cada lei já destacados pra você.',
      'Modo foco para ver só o artigo que está lendo.',
      'O Mapa da norma mostra o que mais cai e te guia pela leitura.',
    ],
  },
};

const IDS_NA_ORDEM_DAS_ABAS: readonly IdDoPasso[] = ['hoje', 'plano', 'recall', 'biblioteca'];

/** Um passo por menu, na ordem das abas. Sem atalho para outra tela (Gabriel, 28/10). */
export const PASSOS: readonly Passo[] = AREAS.map((area, i) => {
  const id = IDS_NA_ORDEM_DAS_ABAS[i];
  if (id === undefined) throw new Error('Há mais áreas que passos.');
  return { id, nome: area.nome, icone: area.icone, ...TEXTOS_DOS_PASSOS[id] };
});

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

/** A linha do passeio em Conta (a fonte do que ela diz, e do botão que abre os quatro passos). */
export const PASSEIO_NA_CONTA = {
  titulo: 'Passeio pelos menus',
  apoio: 'Os quatro menus, um por vez, quando você quiser.',
  acao: 'Fazer o passeio',
} as const;
