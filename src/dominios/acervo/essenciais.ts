// As sete normas que quase todo estudante abre (Constituição, Código Civil, CPC, Código Penal, CPP,
// ECA e CDC): entram sozinhas na Biblioteca, em segundo plano, na primeira abertura com rede
// (decisão do Gabriel, 02/11/2026). Pelo mesmo caminho do acervo, então valem o hash, a versão e a
// atualização de qualquer outra norma adicionada.
import type { Repositorio } from '../../core/persistencia';
import { aderirEmLote } from './adesao';
import type { FonteDoAcervo } from './fonte';

export const ESSENCIAIS: readonly string[] = [
  'constituicao-1988',
  'decreto-lei-2848-1940',
  'decreto-lei-3689-1941',
  'lei-federal-10406-2002',
  'lei-federal-13105-2015',
  'lei-federal-8069-1990',
  'lei-federal-8078-1990',
];

export interface ResultadoDasEssenciais {
  /** Entraram agora. */
  adicionadas: number;
  /** Falharam ou ficaram sem tentar: vale tentar de novo na próxima abertura. */
  pendentes: number;
}

/**
 * Adiciona as essenciais que a pessoa ainda não tem. Quem já teve uma delas e a tirou da Biblioteca
 * não a vê voltar: conta qualquer norma de mesmo `origemAcervo`, inclusive a removida.
 */
export async function puxarEssenciais(
  repo: Repositorio,
  fonte: FonteDoAcervo,
  opcoes: { ids?: readonly string[]; deveParar?: () => boolean } = {},
): Promise<ResultadoDasEssenciais> {
  const normas = await repo.colecao('normas').todosDoUsuario();
  const conhecidas = new Set(normas.flatMap((n) => (n.origemAcervo ? [n.origemAcervo.id] : [])));
  const faltam = (opcoes.ids ?? ESSENCIAIS).filter((id) => !conhecidas.has(id));
  if (faltam.length === 0) return { adicionadas: 0, pendentes: 0 };
  const lote = await aderirEmLote(repo, fonte, faltam, {
    ...(opcoes.deveParar ? { deveParar: opcoes.deveParar } : {}),
  });
  return {
    adicionadas: lote.adicionadas.length,
    pendentes: lote.falhas.length + lote.restantes.length,
  };
}
