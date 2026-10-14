import type { ProximaAcao } from '../../dominios/hoje/contrato';

/**
 * O botão de começar só leva ao início da Sessão (A2), que lê a ação pela query:
 * `tipo`/`id`/`rotulo` = alvo; `origem`/`razao` = de onde veio a Próxima ação.
 */
export function rotaDeInicio(acao: ProximaAcao): string {
  const q = new URLSearchParams({ tipo: acao.alvo.tipo });
  if (acao.alvo.id !== undefined) q.set('id', acao.alvo.id);
  if (acao.alvo.rotulo !== undefined) q.set('rotulo', acao.alvo.rotulo);
  if (acao.alvo.tipo === 'tarefa' && acao.alvo.id !== undefined) q.set('tarefa', acao.alvo.id);
  q.set('origem', acao.tipo);
  q.set('razao', acao.razao);
  return `/sessao/iniciar?${q.toString()}`;
}
