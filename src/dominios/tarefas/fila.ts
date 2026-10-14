// Tarefas de estudo (F3-B, pacote B4): passos pequenos e concretos. Não concluída fica na fila,
// sem atraso punitivo: não existe "atrasada", só "adiada até" (escolha da pessoa) e "pular por hoje".
import type { DataCivil, TarefaDeEstudo } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

export class TarefaInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'TarefaInvalida';
  }
}

const limpar = (t: string) => t.trim().replace(/\s+/g, ' ');

function titulo(texto: string): string {
  const t = limpar(texto);
  if (!t) throw new TarefaInvalida('A tarefa precisa de um título.');
  if (t.length > 500) throw new TarefaInvalida('O título passa de 500 caracteres.');
  return t;
}

const vivas = (todas: TarefaDeEstudo[]) => todas.filter((t) => t.excluidoEm === null);

async function proximaOrdem(repo: Repositorio): Promise<number> {
  const todas = vivas(await repo.colecao('tarefasDeEstudo').todosDoUsuario());
  return todas.reduce((m, t) => Math.max(m, t.ordem), 0) + 1;
}

export interface EntradaDeTarefa {
  titulo: string;
  pontoId?: string;
  estimativaMin?: number;
  autoria?: 'manual' | 'sugerida';
  razao?: string;
}

export async function criarTarefa(
  repo: Repositorio,
  entrada: EntradaDeTarefa,
): Promise<TarefaDeEstudo> {
  const autoria = entrada.autoria ?? 'manual';
  return repo.colecao('tarefasDeEstudo').criar({
    titulo: titulo(entrada.titulo),
    estado: 'aberta',
    ordem: await proximaOrdem(repo),
    autoria,
    ...(entrada.pontoId ? { pontoId: entrada.pontoId } : {}),
    ...(entrada.estimativaMin ? { estimativaMin: entrada.estimativaMin } : {}),
    ...(autoria === 'sugerida' && entrada.razao ? { razao: entrada.razao } : {}),
  });
}

export interface FilaDeTarefas {
  /** Abertas, mais a de adiadas cuja data chegou; na ordem da fila. */
  fila: TarefaDeEstudo[];
  /** Adiadas por escolha, com data no futuro. */
  adiadas: TarefaDeEstudo[];
  feitas: TarefaDeEstudo[];
}

/** Separa as tarefas (as divididas somem: o que vale são as filhas). */
export function montarFila(todas: readonly TarefaDeEstudo[], hoje: DataCivil): FilaDeTarefas {
  const ativas = todas.filter((t) => t.excluidoEm === null && t.estado !== 'dividida');
  const porOrdem = (a: TarefaDeEstudo, b: TarefaDeEstudo) => a.ordem - b.ordem;
  const adiadaNoFuturo = (t: TarefaDeEstudo) =>
    t.estado === 'adiada' && t.adiadaAte !== undefined && t.adiadaAte > hoje;
  return {
    fila: ativas
      .filter((t) => t.estado === 'aberta' || (t.estado === 'adiada' && !adiadaNoFuturo(t)))
      .sort(porOrdem),
    adiadas: ativas.filter(adiadaNoFuturo).sort(porOrdem),
    feitas: ativas
      .filter((t) => t.estado === 'feita')
      .sort((a, b) => (b.concluidaEm ?? '').localeCompare(a.concluidaEm ?? '')),
  };
}

export async function carregarFila(repo: Repositorio, hoje: DataCivil): Promise<FilaDeTarefas> {
  return montarFila(await repo.colecao('tarefasDeEstudo').todosDoUsuario(), hoje);
}

export async function concluirTarefa(repo: Repositorio, id: string): Promise<TarefaDeEstudo> {
  return repo.colecao('tarefasDeEstudo').atualizar(id, {
    estado: 'feita',
    concluidaEm: repo.ctx.agora().toISOString(),
    adiadaAte: undefined,
  });
}

/** Volta uma tarefa feita (ou adiada) para a fila. */
export async function reabrirTarefa(repo: Repositorio, id: string): Promise<TarefaDeEstudo> {
  return repo.colecao('tarefasDeEstudo').atualizar(id, {
    estado: 'aberta',
    concluidaEm: undefined,
    adiadaAte: undefined,
  });
}

/** Adiar = esconder da fila até uma data que a pessoa escolhe. Nada vira "atraso". */
export async function adiarTarefa(
  repo: Repositorio,
  id: string,
  ate: DataCivil,
): Promise<TarefaDeEstudo> {
  return repo.colecao('tarefasDeEstudo').atualizar(id, { estado: 'adiada', adiadaAte: ate });
}

/** Pular = ir para o fim da fila agora, sem sumir e sem registrar falha. */
export async function pularTarefa(repo: Repositorio, id: string): Promise<TarefaDeEstudo> {
  return repo.colecao('tarefasDeEstudo').atualizar(id, { ordem: await proximaOrdem(repo) });
}

/** Troca de lugar com a vizinha da fila (para cima ou para baixo). */
export async function moverTarefa(
  repo: Repositorio,
  id: string,
  sentido: 'cima' | 'baixo',
  hoje: DataCivil,
): Promise<void> {
  const { fila } = await carregarFila(repo, hoje);
  const i = fila.findIndex((t) => t.id === id);
  const j = sentido === 'cima' ? i - 1 : i + 1;
  const a = fila[i];
  const b = fila[j];
  if (!a || !b) return;
  await repo.colecao('tarefasDeEstudo').atualizar(a.id, { ordem: b.ordem });
  await repo.colecao('tarefasDeEstudo').atualizar(b.id, { ordem: a.ordem });
}

/**
 * Divide uma tarefa em duas ou mais menores: as filhas herdam ponto, fonte e posição, e a original
 * vira `dividida` (some da fila; o histórico fica).
 */
export async function dividirTarefa(
  repo: Repositorio,
  id: string,
  titulos: readonly string[],
): Promise<TarefaDeEstudo[]> {
  const nomes = titulos.map(limpar).filter(Boolean);
  if (nomes.length < 2) throw new TarefaInvalida('Para dividir, escreva ao menos duas partes.');
  const pai = await repo.colecao('tarefasDeEstudo').obter(id);
  if (!pai || pai.excluidoEm !== null) throw new TarefaInvalida('Tarefa não encontrada.');
  const filhas: TarefaDeEstudo[] = [];
  for (const [i, nome] of nomes.entries()) {
    filhas.push(
      await repo.colecao('tarefasDeEstudo').criar({
        titulo: titulo(nome),
        estado: 'aberta',
        paiId: pai.id,
        // Entre a tarefa original e a seguinte, mantendo a ordem das partes.
        ordem: pai.ordem + (i + 1) / (nomes.length + 1) / 1000,
        autoria: 'manual',
        ...(pai.pontoId ? { pontoId: pai.pontoId } : {}),
        ...(pai.fonte ? { fonte: pai.fonte } : {}),
      }),
    );
  }
  await repo.colecao('tarefasDeEstudo').atualizar(id, { estado: 'dividida' });
  return filhas;
}

export async function excluirTarefa(repo: Repositorio, id: string): Promise<void> {
  await repo.colecao('tarefasDeEstudo').excluir(id);
}
