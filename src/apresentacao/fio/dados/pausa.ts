// "Pausar" (D-D25): o passo fica como está e a pessoa volta ao Agora, que diz uma vez que está tudo salvo.
// O aviso vive na memória: recarregar a página não o repete.
let pausou = false;

/** O cartão do passo chama ao pausar, antes de voltar ao Agora. */
export function marcarPausa(): void {
  pausou = true;
}

/** O Agora lê ao abrir, sem mexer em nada (uma renderização descartada não gasta o aviso). */
export function veioDeUmaPausa(): boolean {
  return pausou;
}

/** O Agora chama depois de mostrar o aviso (num efeito), para ele não voltar. */
export function limparPausa(): void {
  pausou = false;
}
