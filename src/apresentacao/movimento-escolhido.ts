// O "Movimento" da folha da Conta do Fio (Vivo ou Calmo) é um ajuste deste aparelho: não é dado de estudo e não sobe com a
// conta. Guardado no navegador e espelhado em `data-movimento-escolhido` na raiz, de onde `movimentoAgora` e `modoAgora`
// o leem. Sem escolha, vale o que já valia: o perfil Calmo acalma, e o sistema que pede menos movimento vence tudo.

export type MovimentoEscolhido = 'vivo' | 'calmo';

const CHAVE = 'arretado.fio.movimento';

/** O que a pessoa escolheu neste aparelho; `undefined` se nunca escolheu (ou sem armazenamento). */
export function lerMovimentoEscolhido(): MovimentoEscolhido | undefined {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === 'vivo' || v === 'calmo' ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Põe a escolha guardada na raiz (na abertura do app). */
export function aplicarMovimentoEscolhido(): void {
  const v = lerMovimentoEscolhido();
  if (v) document.documentElement.dataset.movimentoEscolhido = v;
  else delete document.documentElement.dataset.movimentoEscolhido;
}

/** Guarda e aplica a escolha na hora; o Fio inteiro muda sem recarregar. */
export function escolherMovimento(v: MovimentoEscolhido): void {
  try {
    localStorage.setItem(CHAVE, v);
  } catch {
    // Sem armazenamento (aba privada): a escolha vale só até recarregar.
  }
  document.documentElement.dataset.movimentoEscolhido = v;
}

/** A escolha de agora, lida da raiz (o que `aplicarMovimentoEscolhido` e `escolherMovimento` põem). */
export function movimentoEscolhidoAgora(): MovimentoEscolhido | undefined {
  const v = document.documentElement.dataset.movimentoEscolhido;
  return v === 'vivo' || v === 'calmo' ? v : undefined;
}
