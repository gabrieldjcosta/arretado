import { dataCivil } from '../../../core/datas';
import type { Ciclo, Disciplina } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import {
  cicloAtivo,
  listarCiclos,
  posicaoDoCiclo,
  sugerirAjustes,
  type MateriaParaModelo,
  type SugestaoDeAjuste,
  incidenciaDasMaterias,
  type IncidenciaDaMateria,
  tabelaServeAoEdital,
  TabelaDeMaterias,
} from '../../../dominios/ciclos';
import { fonteIncidenciaPadrao } from '../../dados/fonteIncidenciaContexto';

export interface DadosDoCiclo {
  ativo: Ciclo | undefined;
  outros: Ciclo[];
  posicao: { indice: number; volta: number } | undefined;
  disciplinas: Disciplina[];
  /** Matérias do plano com o que o assistente precisa para sugerir pesos. */
  materias: MateriaParaModelo[];
  /** Ajustes sugeridos pelo desempenho dos últimos 30 dias; só viram peso se a pessoa aceitar. */
  sugestoes: SugestaoDeAjuste[];
}

const JANELA_EM_DIAS = 30;

/**
 * A parcela de cada matéria no recorte da banca, quando o edital do plano é o dele. Sem rede, sem
 * arquivo ou com outro edital, volta vazio e o Ciclo pesa pelo edital, como antes.
 */
async function incidenciaDoPlano(repo: Repositorio, vivas: readonly Disciplina[]) {
  try {
    const [editais, concursos] = await Promise.all([
      repo.colecao('editais').todosDoUsuario(),
      repo.colecao('concursos').todosDoUsuario(),
    ]);
    const edital = editais.find(
      (e) => e.excluidoEm === null && vivas.some((d) => d.editalId === e.id),
    );
    const concurso = concursos.find((c) => c.excluidoEm === null && c.id === edital?.concursoId);
    if (!concurso) return new Map<string, IncidenciaDaMateria>();
    const { dados: indice } = await fonteIncidenciaPadrao.indice();
    for (const r of indice.recortes) {
      const bruto = await fonteIncidenciaPadrao
        .json(`${r.id}/materias.json`)
        .catch(() => undefined);
      const lida = TabelaDeMaterias.safeParse(bruto?.dados);
      const dados = lida.success && lida.data.recorte === r.id ? lida.data : undefined;
      if (dados && tabelaServeAoEdital(dados, concurso)) {
        return incidenciaDasMaterias(
          dados,
          vivas.map((d) => ({ disciplinaId: d.id, nome: d.nome })),
        );
      }
    }
  } catch {
    // Local-first: o peso por incidência é um extra.
  }
  return new Map<string, IncidenciaDaMateria>();
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
  const desde = dataCivil(new Date(repo.ctx.agora().getTime() - JANELA_EM_DIAS * 86_400_000));
  const disciplinaDoBloco = new Map(
    todos.map((c) => [c.id, c.blocos.map((b) => b.disciplinaId)] as const),
  );
  const disciplinaDoPonto = new Map(vivos.map((p) => [p.id, p.disciplinaId]));
  const desempenho = new Map<string, { erros: number; questoes: number }>();
  for (const s of sessoes) {
    if (s.excluidoEm !== null || !s.questoesFeitas || s.data < desde) continue;
    const d =
      s.cicloId !== undefined && s.blocoOrdem !== undefined
        ? disciplinaDoBloco.get(s.cicloId)?.[s.blocoOrdem]
        : s.pontoId !== undefined
          ? disciplinaDoPonto.get(s.pontoId)
          : undefined;
    if (d === undefined) continue;
    const atual = desempenho.get(d) ?? { erros: 0, questoes: 0 };
    atual.questoes += s.questoesFeitas;
    atual.erros += Math.max(0, s.questoesFeitas - (s.questoesAcertadas ?? 0));
    desempenho.set(d, atual);
  }
  const incidencia = await incidenciaDoPlano(repo, vivas);
  const materias = vivas.map((d) => {
    const itensAltos = vivos.filter(
      (p) => p.disciplinaId === d.id && (p.faixa === 'altissima' || p.faixa === 'alta'),
    ).length;
    const des = desempenho.get(d.id);
    const inc = incidencia.get(d.id);
    return {
      disciplinaId: d.id,
      nome: d.nome,
      itensAltos,
      ...(inc ? { incidencia: inc.incidencia, incidenciaMedia: inc.mediaDasOutras } : {}),
      ...(des ? { desempenho: des } : {}),
    };
  });
  const sugestoes = ativo
    ? sugerirAjustes(
        ativo.pesos.flatMap((p) => {
          const des = desempenho.get(p.disciplinaId);
          const nome = vivas.find((d) => d.id === p.disciplinaId)?.nome;
          return des && nome
            ? [{ disciplinaId: p.disciplinaId, nome, peso: p.peso, desempenho: des }]
            : [];
        }),
      )
    : [];
  return {
    ativo,
    outros: todos.filter((c) => c.id !== ativo?.id),
    posicao: ativo ? await posicaoDoCiclo(repo, ativo) : undefined,
    disciplinas: vivas,
    materias,
    sugestoes,
  };
}
