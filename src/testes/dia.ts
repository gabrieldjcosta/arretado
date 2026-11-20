// Fechar e reabrir o Dia só existem para montar estado nos testes: o app não tem mais o gesto de fechar o Dia
// (o Hoje saiu), mas o resumo ainda conta os Dias fechados que já estão gravados.
import { dataCivil } from '../core/datas';
import type { Dia } from '../core/modelo';
import type { Repositorio } from '../core/persistencia';
import { diaDeHoje } from '../dominios/dia/fechar';

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
