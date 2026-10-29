import type { Repositorio } from '../../core/persistencia';
import { restaurarSessao } from '../../dominios/sessao/servico';

/** A Sessão aberta (ativa ou pausada) do dia; `null` = nenhuma (`undefined` fica para "carregando"). */
export const sessaoAberta = async (repo: Repositorio) => (await restaurarSessao(repo)) ?? null;

export const horaDeInicio = (inicio: string) =>
  new Date(inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** A atividade da Sessão mais recente que tinha uma (para sugerir de novo); `null` = nenhuma. */
export const ultimaAtividade = async (repo: Repositorio) =>
  (await repo.colecao('sessoes').todosDoUsuario())
    .filter((s) => !s.excluidoEm && s.atividade !== undefined)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]?.atividade ?? null;
