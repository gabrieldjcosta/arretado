// De onde a pessoa veio para a norma (D-D25: o Leitor abre "por dentro do lugar de onde vieram"). A casca guarda o
// último endereço fora da norma a cada troca de rota, e o "Voltar" do Leitor leva a ele: o folheto de Normas, o
// passo "Ler", o Destino, uma busca do Varal. Vale só na memória da página: depois de recarregar, ou de abrir a norma
// pelo endereço, o "Voltar" leva à lista de normas do Varal.

/** Para onde o "Voltar" leva quando não se sabe de onde a pessoa veio. */
export const VOLTA_PADRAO = '/varal/normas';

let ultimo: string | undefined;

/** A norma e as telas dela (o mapa) não contam como origem: de dentro delas, o "Voltar" segue levando para fora. */
export function lembrarDeOndeVeio(caminho: string, busca = ''): void {
  if (!caminho.startsWith('/biblioteca/normas/')) ultimo = caminho + busca;
}

export const deOndeVeio = (): string => ultimo ?? VOLTA_PADRAO;

/** Só para os testes: volta ao estado de quem acabou de abrir o app. */
export function esquecerDeOndeVeio(): void {
  ultimo = undefined;
}
