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

export interface AvisoDeLeiMudou {
  normaId: string;
  titulo: string;
  /** Dispositivos com aviso "texto alterado" ainda por reler. */
  quantos: number;
}

/** As normas com aviso "A lei mudou" aberto (AP-05), para o Hoje; as de mais avisos primeiro. */
export async function avisosDeLeiMudou(repo: Repositorio): Promise<AvisoDeLeiMudou[]> {
  const abertas = (await repo.colecao('pendenciasReleitura').todosDoUsuario()).filter(
    (p) => p.excluidoEm === null && p.tipo === 'texto_alterado' && p.resolvidaEm === undefined,
  );
  const porNorma = new Map<string, number>();
  for (const p of abertas) porNorma.set(p.normaId, (porNorma.get(p.normaId) ?? 0) + 1);
  const saida: AvisoDeLeiMudou[] = [];
  for (const [normaId, quantos] of porNorma) {
    const norma = await repo.colecao('normas').obter(normaId);
    if (!norma || norma.excluidoEm !== null) continue;
    saida.push({ normaId, titulo: norma.tituloCurto, quantos });
  }
  return saida.sort((a, b) => b.quantos - a.quantos || a.titulo.localeCompare(b.titulo));
}
