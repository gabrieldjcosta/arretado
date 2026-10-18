import { COTA_DIARIA_PADRAO, type Preferencias } from '../modelo';
import { PREFERENCIAS_PADRAO, type Alteracoes, type Repositorio } from '../persistencia';

/** Preferências do usuário (uma por usuário; criadas na primeira abertura). */
export async function obterPreferencias(repo: Repositorio): Promise<Preferencias> {
  const { itens } = await repo.colecao('preferencias').listarPagina({
    indice: 'usuarioId',
    de: repo.ctx.usuarioId,
    ate: repo.ctx.usuarioId,
    limite: 1,
  });
  const atual = itens[0];
  if (atual) return atual;
  // Preferências apagadas (ex.: restauração parcial): recria com o padrão.
  return repo.colecao('preferencias').criar(PREFERENCIAS_PADRAO, { origem: 'sistema' });
}

export async function alterarPreferencias(
  repo: Repositorio,
  alteracoes: Alteracoes<'preferencias'>,
): Promise<Preferencias> {
  const atual = await obterPreferencias(repo);
  return repo.colecao('preferencias').atualizar(atual.id, alteracoes);
}

/** Cartões por vez no Recall: o salvo, ou 10 se ausente (a fila nunca é cortada, só fatiada). */
export function cotaDiaria(preferencias: Pick<Preferencias, 'cotaDiaria'>): number {
  return preferencias.cotaDiaria ?? COTA_DIARIA_PADRAO;
}

export * from './perfis';
export * from './consentimento';
