/**
 * Troca de banco (entrar, sair, migrar) exige recarregar o app (T26): o ProvedorRepositorio só
 * abre o banco ativo ao montar. Módulo à parte para os testes trocarem a recarga.
 */
export function recarregarEm(destino: string): void {
  window.location.hash = destino;
  window.location.reload();
}
