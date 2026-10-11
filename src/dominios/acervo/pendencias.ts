// Pendências de releitura (spec §9, Peça 6a): o que ficou sem endereço na atualização e pede um
// olhar do usuário. Resolver só marca `resolvidaEm`; o registro fica no histórico.
import type { Marcacao, PendenciaDeReleitura } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';

export async function pendenciasAbertas(
  repo: Repositorio,
  normaId: string,
): Promise<PendenciaDeReleitura[]> {
  const lista = await todos(repo.colecao('pendenciasReleitura'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  });
  return lista.filter((p) => p.resolvidaEm === undefined);
}

export async function resolverPendencia(repo: Repositorio, id: string): Promise<void> {
  await repo.colecao('pendenciasReleitura').atualizar(id, {
    resolvidaEm: repo.ctx.agora().toISOString(),
  });
}

/** Grifos e notas cujo texto não está na versão nova. */
export async function marcacoesPendentes(repo: Repositorio, normaId: string): Promise<Marcacao[]> {
  const lista = await todos(repo.colecao('marcacoes'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  });
  return lista.filter((m) => m.status === 'pendente');
}
