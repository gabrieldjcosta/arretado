import type { Repositorio } from '../../core/persistencia';
import { restaurarSessao } from '../../dominios/sessao/servico';

/** A Sessão aberta (ativa ou pausada) do dia; `null` = nenhuma (`undefined` fica para "carregando"). */
export const sessaoAberta = async (repo: Repositorio) => (await restaurarSessao(repo)) ?? null;

export const horaDeInicio = (inicio: string) =>
  new Date(inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
