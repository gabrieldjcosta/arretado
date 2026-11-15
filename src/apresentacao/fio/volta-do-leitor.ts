// De onde a pessoa veio para a norma (D-D25: o Leitor abre "por dentro do lugar de onde vieram"). A casca anota cada
// troca de rota, e o "Voltar" do Leitor leva ao endereço de onde a pessoa entrou na norma: o folheto de Normas, o
// passo "Ler", o Destino, uma busca do Varal. Vale só na memória da página: depois de recarregar, ou de abrir a norma
// pelo endereço, o "Voltar" leva à lista de normas do Varal.

/** Para onde o "Voltar" leva quando não se sabe de onde a pessoa veio. */
export const VOLTA_PADRAO = '/varal/normas';

let origem: string | undefined;
let anterior: string | undefined;

/** A norma e as telas dela (o mapa) não contam como origem: de dentro delas, o "Voltar" segue levando para fora. */
const daNorma = (endereco: string) => endereco.startsWith('/biblioteca/normas/');

/**
 * A casca chama a cada rota. A origem só muda na entrada da norma: é o endereço de antes, quando ele não era da
 * norma e a pessoa não chegou pelo "voltar" do navegador (`peloHistorico`). Quem sai da norma para outra tela (a
 * Conta › Aparência dos ajustes de leitura, por exemplo) e volta pelo navegador segue com a origem que tinha.
 * Chamar de novo com a mesma rota não muda nada.
 */
export function lembrarDeOndeVeio(caminho: string, busca = '', peloHistorico = false): void {
  if (daNorma(caminho) && anterior !== undefined && !daNorma(anterior) && !peloHistorico)
    origem = anterior;
  anterior = caminho + busca;
}

export const deOndeVeio = (): string => origem ?? VOLTA_PADRAO;

/** Só para os testes: volta ao estado de quem acabou de abrir o app. */
export function esquecerDeOndeVeio(): void {
  origem = undefined;
  anterior = undefined;
}
