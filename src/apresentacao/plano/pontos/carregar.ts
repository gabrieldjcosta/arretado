import { dataCivil } from '../../../core/datas';
import type { Disciplina, Ponto } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import { atividadePorPonto, type AtividadeDoPonto } from '../../../dominios/pontos';

export interface DadosDosPontos {
  hoje: string;
  disciplinas: Disciplina[];
  pontos: Ponto[];
  atividade: Map<string, AtividadeDoPonto>;
}

/** Função estável (módulo): `useDados` recarrega sozinho a cada mudança no repositório. */
export async function carregarPontos(repo: Repositorio): Promise<DadosDosPontos> {
  const hoje = dataCivil(repo.ctx.agora());
  const [disciplinas, pontos, atividade] = await Promise.all([
    repo.colecao('disciplinas').todosDoUsuario(),
    repo.colecao('pontos').todosDoUsuario(),
    atividadePorPonto(repo, hoje),
  ]);
  return {
    hoje,
    disciplinas: disciplinas
      .filter((d) => d.excluidoEm === null)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    pontos: pontos
      .filter((p) => p.excluidoEm === null)
      .sort((a, b) => (a.prioridade ?? 0) - (b.prioridade ?? 0)),
    atividade,
  };
}

export const ROTULO_FAIXA = {
  altissima: 'Altíssima',
  alta: 'Alta',
  media: 'Média',
  extra: 'Extra',
} as const;
