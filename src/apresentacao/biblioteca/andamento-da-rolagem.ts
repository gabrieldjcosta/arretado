/**
 * Quanto do texto já passou, de 0 a 1: a rolagem sobre o que há para rolar. Sem nada para rolar
 * (o texto cabe na tela), é 0: o fio só aparece quando há caminho.
 */
export function andamentoDaRolagem(rolagem: number, alturaTotal: number, janela: number): number {
  const caminho = alturaTotal - janela;
  if (!(caminho > 0)) return 0;
  return Math.min(1, Math.max(0, rolagem / caminho));
}
