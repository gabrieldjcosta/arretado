import type { Ciclo, Disciplina } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import {
  cicloAtivo,
  listarCiclos,
  posicaoDoCiclo,
  type MateriaParaModelo,
} from '../../../dominios/ciclos';

export interface DadosDoCiclo {
  ativo: Ciclo | undefined;
  outros: Ciclo[];
  posicao: { indice: number; volta: number } | undefined;
  disciplinas: Disciplina[];
  /** Matérias do plano com o que o assistente precisa para sugerir pesos. */
  materias: MateriaParaModelo[];
}

/** Função estável (módulo): `useDados` recarrega sozinho a cada mudança no repositório. */
export async function carregarCiclo(repo: Repositorio): Promise<DadosDoCiclo> {
  const [todos, ativo, disciplinas, pontos, sessoes] = await Promise.all([
    listarCiclos(repo),
    cicloAtivo(repo),
    repo.colecao('disciplinas').todosDoUsuario(),
    repo.colecao('pontos').todosDoUsuario(),
    repo.colecao('sessoes').todosDoUsuario(),
  ]);
  const vivas = disciplinas
    .filter((d) => d.excluidoEm === null)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const vivos = pontos.filter((p) => p.excluidoEm === null);
  const disciplinaDoPonto = new Map(vivos.map((p) => [p.id, p.disciplinaId]));
  const desempenho = new Map<string, { erros: number; questoes: number }>();
  for (const s of sessoes) {
    if (s.excluidoEm !== null || s.pontoId === undefined || !s.questoesFeitas) continue;
    const d = disciplinaDoPonto.get(s.pontoId);
    if (d === undefined) continue;
    const atual = desempenho.get(d) ?? { erros: 0, questoes: 0 };
    atual.questoes += s.questoesFeitas;
    atual.erros += Math.max(0, s.questoesFeitas - (s.questoesAcertadas ?? 0));
    desempenho.set(d, atual);
  }
  const materias = vivas.map((d) => {
    const itensAltos = vivos.filter(
      (p) => p.disciplinaId === d.id && (p.faixa === 'altissima' || p.faixa === 'alta'),
    ).length;
    const des = desempenho.get(d.id);
    return {
      disciplinaId: d.id,
      nome: d.nome,
      itensAltos,
      ...(des ? { desempenho: des } : {}),
    };
  });
  return {
    ativo,
    outros: todos.filter((c) => c.id !== ativo?.id),
    posicao: ativo ? await posicaoDoCiclo(repo, ativo) : undefined,
    disciplinas: vivas,
    materias,
  };
}
