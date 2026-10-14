// Fechar o Dia (F3-A, pacote A3b). Fechar é um gesto de encerramento, não uma nota: o resumo conta
// o que aconteceu, sem metas, sem comparação e sem tratar tempo como aprendizado. Reabrir é livre.
import { dataCivil } from '../../core/datas';
import type { Dia } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

export interface ResumoDoDia {
  data: string;
  sessoes: number;
  cartoesRevisados: number;
  frasesRevisadas: number;
  /** Próximo passo da última Sessão encerrada hoje; vai para amanhã sem a pessoa precisar redigir. */
  proximoPasso?: string;
  /** Há Sessão ativa ou pausada; fechar o Dia não a encerra. */
  sessaoAberta: boolean;
  dia?: Dia;
}

export async function diaDeHoje(repo: Repositorio): Promise<Dia | undefined> {
  const data = dataCivil(repo.ctx.agora());
  return (await repo.colecao('dias').todosDoUsuario()).find((d) => d.data === data);
}

export async function resumoDoDia(repo: Repositorio): Promise<ResumoDoDia> {
  const data = dataCivil(repo.ctx.agora());
  const [sessoes, revisoes, revisoesFrase, dia] = await Promise.all([
    repo.colecao('sessoes').todosDoUsuario(),
    repo.colecao('revisoes').todosDoUsuario(),
    repo.colecao('revisoesFrase').todosDoUsuario(),
    diaDeHoje(repo),
  ]);
  const doDia = sessoes.filter((s) => s.data === data);
  const passo = doDia
    .filter((s) => s.estado === 'encerrada' && s.proximoPasso)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]?.proximoPasso;
  return {
    data,
    sessoes: doDia.filter((s) => s.estado === 'encerrada').length,
    cartoesRevisados: revisoes.filter((r) => r.data === data).length,
    frasesRevisadas: revisoesFrase.filter((r) => r.data === data).length,
    sessaoAberta: doDia.some((s) => s.estado === 'ativa' || s.estado === 'pausada'),
    ...(passo ? { proximoPasso: passo } : {}),
    ...(dia ? { dia } : {}),
  };
}

/** Fecha o Dia de hoje (cria o registro se preciso). Fechar um Dia já fechado não muda nada. */
export async function fecharDia(repo: Repositorio): Promise<Dia> {
  const existente = await diaDeHoje(repo);
  if (existente?.fechadoEm) return existente;
  const fechadoEm = repo.ctx.agora().toISOString();
  const dia = existente
    ? await repo.colecao('dias').atualizar(existente.id, { fechadoEm })
    : await repo.colecao('dias').criar({ data: dataCivil(repo.ctx.agora()), fechadoEm });
  repo.eventos.emitir('dia.fechado', { diaId: dia.id });
  return dia;
}

/** Reabre o Dia de hoje (a pessoa voltou a estudar). Sem Dia fechado, não faz nada. */
export async function reabrirDia(repo: Repositorio): Promise<void> {
  const existente = await diaDeHoje(repo);
  if (!existente?.fechadoEm) return;
  await repo.colecao('dias').atualizar(existente.id, { fechadoEm: undefined });
  repo.eventos.emitir('dia.reaberto', { diaId: existente.id });
}
