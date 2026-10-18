import { dataCivil } from '../../../core/datas';
import type { Disciplina, Ponto } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import { carregarFila, type FilaDeTarefas, type Sugestao } from '../../../dominios/tarefas';
import { sugestoesDoDia } from './sugestoes-do-dia';

export interface DadosDasTarefas {
  hoje: string;
  fila: FilaDeTarefas;
  sugestoes: Sugestao[];
  pontos: Ponto[];
  disciplinas: Disciplina[];
}

/** Função estável (módulo): `useDados` recarrega sozinho a cada mudança no repositório. */
export async function carregarTarefas(repo: Repositorio): Promise<DadosDasTarefas> {
  const hoje = dataCivil(repo.ctx.agora());
  const [fila, sugestoes, pontos, disciplinas] = await Promise.all([
    carregarFila(repo, hoje),
    sugestoesDoDia(repo),
    repo.colecao('pontos').todosDoUsuario(),
    repo.colecao('disciplinas').todosDoUsuario(),
  ]);
  return {
    hoje,
    fila,
    sugestoes,
    pontos: pontos.filter((p) => p.excluidoEm === null),
    disciplinas: disciplinas.filter((d) => d.excluidoEm === null),
  };
}
