// Ciclos de estudo (C2/C4): criar, ativar, pular bloco, ajustar peso e achar a posição atual.
// Os blocos saem de `gerarBlocos` a partir dos pesos; a posição, das Sessões e dos pulos.
import type { Ciclo, ModeloDeCiclo, PesoDoCiclo } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { gerarBlocos, type BlocoGerado } from './gerar';
import { limitarPeso } from './pesos';
import { posicaoNoCiclo, type MarcaDeBloco } from './posicao';

export class CicloInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'CicloInvalido';
  }
}

export const MINUTOS_PADRAO_DO_BLOCO = 40;

const vivos = (todos: Ciclo[]) => todos.filter((c) => c.excluidoEm === null);

export interface EntradaDeCiclo {
  nome: string;
  modelo: ModeloDeCiclo;
  /** Pesos por matéria, na ordem do ciclo. */
  pesos: readonly PesoDoCiclo[];
  minutos?: number;
  concursoId?: string;
  /** Padrão: o primeiro Ciclo vira o ativo. */
  ativo?: boolean;
}

export async function listarCiclos(repo: Repositorio): Promise<Ciclo[]> {
  return vivos(await repo.colecao('ciclos').todosDoUsuario()).sort((a, b) =>
    a.criadoEm.localeCompare(b.criadoEm),
  );
}

export async function cicloAtivo(repo: Repositorio): Promise<Ciclo | undefined> {
  return (await listarCiclos(repo)).find((c) => c.ativo === true);
}

/** No máximo um ativo: ativar um desativa os outros. */
async function soEste(repo: Repositorio, id: string): Promise<void> {
  for (const c of await listarCiclos(repo)) {
    if (c.id !== id && c.ativo === true)
      await repo.colecao('ciclos').atualizar(c.id, { ativo: false });
  }
}

export async function criarCiclo(repo: Repositorio, e: EntradaDeCiclo): Promise<Ciclo> {
  const nome = e.nome.trim().replace(/\s+/g, ' ');
  if (!nome) throw new CicloInvalido('O ciclo precisa de um nome.');
  if (e.pesos.length === 0) throw new CicloInvalido('Escolha ao menos uma matéria.');
  const pesos = e.pesos.map((p) => ({ disciplinaId: p.disciplinaId, peso: limitarPeso(p.peso) }));
  const blocos = gerarBlocos(
    pesos.map((p) => ({ ...p, razao: '' })),
    e.minutos ?? MINUTOS_PADRAO_DO_BLOCO,
  );
  const ativo = e.ativo ?? (await cicloAtivo(repo)) === undefined;
  const ciclo = await repo.colecao('ciclos').criar({
    nome,
    modelo: e.modelo,
    blocos,
    pesos,
    ativo,
    ...(e.concursoId ? { concursoId: e.concursoId } : {}),
  });
  if (ativo) await soEste(repo, ciclo.id);
  return ciclo;
}

export async function ativarCiclo(repo: Repositorio, id: string): Promise<Ciclo> {
  const ciclo = await repo.colecao('ciclos').atualizar(id, { ativo: true });
  await soEste(repo, id);
  return ciclo;
}

export async function arquivarCiclo(repo: Repositorio, id: string): Promise<void> {
  await repo.colecao('ciclos').excluir(id);
}

/** Troca o peso de uma matéria, refaz os blocos (mantendo os minutos) e registra no log. */
export async function ajustarPeso(
  repo: Repositorio,
  id: string,
  disciplinaId: string,
  novo: number,
  origem: 'manual' | 'erro' | 'incidencia' | 'modelo',
  motivo?: string,
): Promise<Ciclo> {
  const ciclo = await repo.colecao('ciclos').obter(id);
  if (!ciclo) throw new CicloInvalido('Ciclo não encontrado.');
  const atual = ciclo.pesos.find((p) => p.disciplinaId === disciplinaId);
  if (!atual) throw new CicloInvalido('Essa matéria não está no ciclo.');
  const depois = limitarPeso(novo);
  if (depois === atual.peso) return ciclo;
  const pesos = ciclo.pesos.map((p) =>
    p.disciplinaId === disciplinaId ? { ...p, peso: depois } : p,
  );
  const blocos: BlocoGerado[] = gerarBlocos(
    pesos.map((p) => ({ ...p, razao: '' })),
    ciclo.blocos[0]?.minutos ?? MINUTOS_PADRAO_DO_BLOCO,
  );
  const registro = {
    em: repo.ctx.agora().toISOString(),
    disciplinaId,
    antes: atual.peso,
    depois,
    origem,
    ...(motivo ? { motivo: motivo.slice(0, 200) } : {}),
  };
  return repo.colecao('ciclos').atualizar(id, {
    pesos,
    blocos,
    logDePesos: [...(ciclo.logDePesos ?? []), registro],
  });
}

/** Pular o bloco atual: neutro, sem justificativa. */
export async function pularBloco(repo: Repositorio, id: string): Promise<Ciclo> {
  const ciclo = await repo.colecao('ciclos').obter(id);
  if (!ciclo) throw new CicloInvalido('Ciclo não encontrado.');
  const { indice } = await posicaoDoCiclo(repo, ciclo);
  return repo.colecao('ciclos').atualizar(id, {
    pulos: [...(ciclo.pulos ?? []), { em: repo.ctx.agora().toISOString(), blocoOrdem: indice }],
  });
}

export async function posicaoDoCiclo(repo: Repositorio, ciclo: Ciclo) {
  const sessoes = await repo.colecao('sessoes').todosDoUsuario();
  const marcas: MarcaDeBloco[] = [
    ...sessoes.flatMap((s) =>
      s.excluidoEm === null &&
      s.estado === 'encerrada' &&
      s.cicloId === ciclo.id &&
      s.blocoOrdem !== undefined
        ? [{ em: s.fim ?? s.inicio, blocoOrdem: s.blocoOrdem }]
        : [],
    ),
    ...(ciclo.pulos ?? []),
  ];
  return posicaoNoCiclo(ciclo.blocos.length, marcas);
}
