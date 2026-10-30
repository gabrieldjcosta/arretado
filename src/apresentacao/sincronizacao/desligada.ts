// Escolha de "desligar" a sincronização, guardada por conta neste Aparelho. A sincronização liga
// sozinha para quem entrou; só quem desliga fica de fora, e religa em Conta › Sincronização.
const chave = (usuarioId: string) => `arretado:sincronizacao-desligada:${usuarioId}`;

export function pessoaDesligou(usuarioId: string): boolean {
  try {
    return localStorage.getItem(chave(usuarioId)) === '1';
  } catch {
    return false;
  }
}

export function registrarDesligada(usuarioId: string, desligada: boolean): void {
  try {
    if (desligada) localStorage.setItem(chave(usuarioId), '1');
    else localStorage.removeItem(chave(usuarioId));
  } catch {
    // Sem armazenamento: a escolha vale só até recarregar.
  }
}
