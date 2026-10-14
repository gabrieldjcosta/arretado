// Depois de trocar de identidade (restauração integral, desfazer), a página recarrega para
// abrir o banco com a identidade nova; o aviso sobrevive à recarga.
const CHAVE = 'arretado:aviso-dados';

export function recarregarComAviso(aviso: string): void {
  try {
    sessionStorage.setItem(CHAVE, aviso);
  } catch {
    // Sem armazenamento de sessão: recarrega sem aviso.
  }
  window.location.reload();
}

/** Só lê (puro): o React pode repetir a renderização, então apagar aqui perderia o aviso. */
export function lerAvisoDeRecarga(): string | null {
  try {
    return sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

/** Apaga o aviso depois de mostrado (chamar num efeito, não na renderização). */
export function limparAvisoDeRecarga(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Sem armazenamento de sessão: nada a limpar.
  }
}
