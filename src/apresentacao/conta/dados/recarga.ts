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

export function lerAvisoDeRecarga(): string | null {
  try {
    const aviso = sessionStorage.getItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
    return aviso;
  } catch {
    return null;
  }
}
