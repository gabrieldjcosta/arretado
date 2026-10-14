// Alavancas da Sessão (F3-A, pacote A3a): estacionamento de distração e temporizador opcional.
// Domínio puro. Nada aqui interrompe o estudo, bloqueia ou conta como aprendizado.
import type { NotaDeEstacionamento, Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

const LIMITE_NOTAS = 200;

async function sessaoAbertaPorId(repo: Repositorio, id: string): Promise<Sessao> {
  const s = await repo.colecao('sessoes').obter(id);
  if (!s) throw new Error('Sessão não encontrada.');
  return s;
}

/** Guarda a distração em uma linha para depois. Texto em branco não grava. Sessão encerrada não aceita. */
export async function estacionar(repo: Repositorio, id: string, texto: string): Promise<Sessao> {
  const s = await sessaoAbertaPorId(repo, id);
  const limpo = texto.trim().slice(0, 500);
  if (!limpo) return s;
  if (s.estado === 'encerrada' || s.estado === 'interrompida') {
    throw new Error('A Sessão já terminou.');
  }
  const notas = s.estacionamento ?? [];
  if (notas.length >= LIMITE_NOTAS) throw new Error('O estacionamento está cheio.');
  const nova = await repo.colecao('sessoes').atualizar(id, {
    estacionamento: [...notas, { texto: limpo, em: repo.ctx.agora().toISOString() }],
  });
  repo.eventos.emitir('sessao.estacionada', { sessaoId: id });
  return nova;
}

/** Marca (ou desmarca) uma nota como resolvida, pela posição na lista. Vale também depois de encerrar. */
export async function resolverNota(
  repo: Repositorio,
  id: string,
  indice: number,
  resolvida = true,
): Promise<Sessao> {
  const s = await sessaoAbertaPorId(repo, id);
  const notas = s.estacionamento ?? [];
  const nota = notas[indice];
  if (!nota) return s;
  const atual: NotaDeEstacionamento = resolvida
    ? { ...nota, resolvidaEm: repo.ctx.agora().toISOString() }
    : { texto: nota.texto, em: nota.em };
  return repo.colecao('sessoes').atualizar(id, {
    estacionamento: notas.map((n, i) => (i === indice ? atual : n)),
  });
}

/** Notas ainda no estacionamento (não resolvidas), na ordem em que entraram. */
export const notasPendentes = (s: Pick<Sessao, 'estacionamento'>): NotaDeEstacionamento[] =>
  (s.estacionamento ?? []).filter((n) => !n.resolvidaEm);

/** Escolhe ou tira o temporizador desta Sessão. `undefined` = sem temporizador. Só informativo. */
export async function definirTemporizador(
  repo: Repositorio,
  id: string,
  minutos: number | undefined,
): Promise<Sessao> {
  const s = await sessaoAbertaPorId(repo, id);
  if (s.estado === 'encerrada' || s.estado === 'interrompida') return s;
  return repo.colecao('sessoes').atualizar(id, {
    temporizadorMin: minutos && minutos >= 1 ? Math.min(240, Math.round(minutos)) : undefined,
  });
}

/** Segundos que faltam para o tempo escolhido, contando só o tempo ativo. Negativo = já passou. */
export function segundosRestantes(
  s: Pick<Sessao, 'inicio' | 'pausas' | 'temporizadorMin'>,
  agora: string,
): number | undefined {
  if (!s.temporizadorMin) return undefined;
  const pausado = s.pausas.reduce(
    (soma, p) => soma + (Date.parse(p.fim ?? agora) - Date.parse(p.inicio)),
    0,
  );
  const ativo = Math.round((Date.parse(agora) - Date.parse(s.inicio) - pausado) / 1000);
  return s.temporizadorMin * 60 - Math.max(0, ativo);
}
