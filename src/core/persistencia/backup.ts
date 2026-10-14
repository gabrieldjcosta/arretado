import type { Repositorio } from './repositorio';

/** Chave em `meta` (local ao aparelho; não entra no log nem no pacote). */
export const CHAVE_ULTIMO_BACKUP = 'ultimoBackup';

/** Anota que um pacote integral foi gerado agora. Informativo: não prova que foi guardado. */
export async function registrarBackup(repo: Repositorio): Promise<string> {
  const instante = repo.ctx.agora().toISOString();
  await repo.db.meta.put({ chave: CHAVE_ULTIMO_BACKUP, valor: instante });
  return instante;
}

/** Instante ISO do último pacote integral gerado neste aparelho, ou `null` se nunca. */
export async function lerUltimoBackup(repo: Repositorio): Promise<string | null> {
  const valor = (await repo.db.meta.get(CHAVE_ULTIMO_BACKUP))?.valor;
  return typeof valor === 'string' ? valor : null;
}
