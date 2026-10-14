import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { rotaDoAlvo } from '../sessao/rota-do-alvo';

/**
 * O botão de começar só leva ao início da Sessão (A2), que lê a ação pela query:
 * `tipo`/`id`/`rotulo` = alvo; `origem`/`razao` = de onde veio a Próxima ação. Quando o alvo tem tela
 * própria, `direto=1`: a Sessão começa sozinha e a pessoa cai direto nela (2 toques, não 4).
 */
export function rotaDeInicio(acao: ProximaAcao): string {
  const q = new URLSearchParams({ tipo: acao.alvo.tipo });
  if (acao.alvo.id !== undefined) q.set('id', acao.alvo.id);
  if (acao.alvo.rotulo !== undefined) q.set('rotulo', acao.alvo.rotulo);
  if (acao.alvo.tipo === 'tarefa' && acao.alvo.id !== undefined) q.set('tarefa', acao.alvo.id);
  q.set('origem', acao.tipo);
  q.set('razao', acao.razao);
  if (rotaDoAlvo(acao.alvo) !== undefined) q.set('direto', '1');
  return `/sessao/iniciar?${q.toString()}`;
}
