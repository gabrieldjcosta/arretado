/**
 * Os três lugares do Arretado novo (D-D25): Agora ("o que eu faço agora?"), Destino ("quanto da prova já
 * é meu?") e Varal ("onde está aquela coisa minha?"). São irmãos: trocar de um para outro nunca empilha tela.
 */
export const LUGARES = [
  { id: 'agora', caminho: '/', nome: 'Agora' },
  { id: 'destino', caminho: '/destino', nome: 'Destino' },
  { id: 'varal', caminho: '/varal', nome: 'Varal' },
] as const;

export type IdDoLugar = (typeof LUGARES)[number]['id'];

/** O Destino é um dos três lugares; a rota dele é a que alarga o quadro (`m-largo`) nos monitores. */
export const ROTA_DO_DESTINO = '/destino';

/** O Varal e os folhetos dele (`/varal/normas`, `/varal/sumulas`) moram no quadro do mockup. */
export const ROTA_DO_VARAL = '/varal';

/** As telas do Fio que têm rota própria: o passo aberto e o pouso que fecha a etapa. */
export const ROTA_DO_PASSO = '/fio/passo';
export const ROTA_DO_POUSO = '/fio/pouso';
/** A pergunta de quem ainda não escolheu a prova (a tela `prova` do mockup). */
export const ROTA_DA_PROVA = '/fio/prova';

/**
 * O pouso é um momento: a pílula dos três lugares some enquanto ele dura, e a saída é o fio ou "descansar"
 * (a pílula volta quando a pessoa sai). Assim a saída do pouso fica à vista, sem a pílula por cima.
 */
export const semPilulaDosLugares = (caminho: string): boolean => caminho === ROTA_DO_POUSO;

/**
 * Em que lugar a rota mora. As telas de hoje que ainda não têm casa nova ficam no lugar delas (D-D25): a
 * Trilha e o plano no Destino; a Biblioteca e o Fixar (Recall) no Varal; a Sessão e o começo no Agora. A Conta,
 * as Orientações e o que não é de nenhum lugar devolvem `undefined`: nenhuma aba fica acesa.
 */
export function lugarDaRota(caminho: string): IdDoLugar | undefined {
  const raiz = caminho.split('/')[1] ?? '';
  switch (raiz) {
    case '':
    case 'fio':
    case 'sessao':
    case 'comecar':
      return 'agora';
    case 'destino':
    case 'plano':
      return 'destino';
    case 'varal':
    case 'biblioteca':
    case 'recall':
      return 'varal';
    default:
      return undefined;
  }
}

/**
 * As rotas que moram no quadro do Fio (o `<main class="app">` do mockup aprovado): o Agora, o Destino, o Varal e os folhetos
 * dele, o passo e o pouso. As demais telas do app (o Leitor, a Biblioteca, o Fixar) seguem na casca de antes.
 */
export const noQuadroDoFio = (caminho: string): boolean =>
  caminho === '/' ||
  caminho === ROTA_DO_DESTINO ||
  caminho === ROTA_DO_VARAL ||
  caminho.startsWith(`${ROTA_DO_VARAL}/`) ||
  caminho === ROTA_DO_PASSO ||
  caminho === ROTA_DO_POUSO ||
  caminho === ROTA_DA_PROVA;

/** As rotas do quadro que levam a nav embaixo: todas, menos o passo, o pouso e a prova (cada um é um momento, sem nav). */
export const comNavDoFio = (caminho: string): boolean =>
  noQuadroDoFio(caminho) &&
  caminho !== ROTA_DO_PASSO &&
  caminho !== ROTA_DO_POUSO &&
  caminho !== ROTA_DA_PROVA;
