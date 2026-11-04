// "Pausar" e "descansar" (D-D25): o passo fica como está e a pessoa volta ao Agora, que diz uma vez que está
// tudo salvo. Ao descansar por hoje, o Agora também fecha o dia em voz baixa (o fio se recolhe e vem uma
// frase gentil). O aviso vive na memória: recarregar a página não o repete.
export type TipoDePausa = 'passo' | 'descanso';

let pausou: TipoDePausa | undefined;

/** O cartão do passo (`passo`) ou o pouso (`descanso`) chama ao pausar, antes de voltar ao Agora. */
export function marcarPausa(tipo: TipoDePausa = 'passo'): void {
  pausou = tipo;
}

/** O Agora lê ao abrir, sem mexer em nada (uma renderização descartada não gasta o aviso). */
export function tipoDaPausa(): TipoDePausa | undefined {
  return pausou;
}

export function veioDeUmaPausa(): boolean {
  return pausou !== undefined;
}

/** O Agora chama depois de mostrar o aviso (num efeito), para ele não voltar. */
export function limparPausa(): void {
  pausou = undefined;
}
