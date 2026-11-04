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
