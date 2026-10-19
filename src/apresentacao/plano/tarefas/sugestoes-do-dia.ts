import { dataCivil } from '../../../core/datas';
import type { Repositorio } from '../../../core/persistencia';
import { atividadePorPonto } from '../../../dominios/pontos';
import { sugerirTarefas, type Sugestao } from '../../../dominios/tarefas';

/** Lê o repositório e devolve as sugestões do dia (a regra em si é pura, em `dominios/tarefas`). */
export async function sugestoesDoDia(repo: Repositorio): Promise<Sugestao[]> {
  const hoje = dataCivil(repo.ctx.agora());
  const [disciplinas, pontos, tarefas, sessoes, atividade] = await Promise.all([
    repo.colecao('disciplinas').todosDoUsuario(),
    repo.colecao('pontos').todosDoUsuario(),
    repo.colecao('tarefasDeEstudo').todosDoUsuario(),
    repo.colecao('sessoes').todosDoUsuario(),
    atividadePorPonto(repo, hoje),
  ]);
  const materiaDoPonto = new Map(pontos.map((p) => [p.id, p.disciplinaId]));
  const ultima = new Map<string, string>();
  for (const s of sessoes) {
    if (s.excluidoEm !== null) continue;
    if (s.estado !== 'encerrada' || !s.pontoId) continue;
    const m = materiaDoPonto.get(s.pontoId);
    if (m && s.data > (ultima.get(m) ?? '')) ultima.set(m, s.data);
  }
  return sugerirTarefas({
    hoje,
    disciplinas: disciplinas
      .filter((d) => d.excluidoEm === null)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    pontos,
    atividade,
    ultimaSessaoPorMateria: ultima,
    tarefas,
  });
}
