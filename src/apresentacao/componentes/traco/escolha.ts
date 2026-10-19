// A intenção de escolher (D-D7, "A caneta que desenha"): o traço de seleção só se desenha depois de um
// toque ou clique da pessoa, nunca porque a rota mudou sozinha. Barras de abas que se remontam a cada
// rota (a Biblioteca) já nascem com o item escolhido: o toque deixa aqui a marca, e o item novo a lê.

/** Quanto tempo, depois do toque, a escolha ainda conta como "agora". */
const JANELA_MS = 1200;

const escolhas = new Map<string, number>();

/** Registra que a pessoa acabou de tocar no item `chave`. */
export function marcarEscolha(chave: string, agora = performance.now()): void {
  escolhas.set(chave, agora);
}

/** O item `chave` foi tocado há pouco? Não consome a marca: um segundo item igual também a vê. */
export function escolhaRecente(chave: string, agora = performance.now()): boolean {
  const quando = escolhas.get(chave);
  return quando !== undefined && agora - quando <= JANELA_MS;
}
