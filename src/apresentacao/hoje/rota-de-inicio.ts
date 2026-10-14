import type { ProximaAcao } from '../../dominios/hoje/contrato';

/** O botão de começar só leva ao início da Sessão; o pacote A2 lê a ação pela query. */
export function rotaDeInicio(acao: ProximaAcao): string {
  const q = new URLSearchParams({ acao: acao.tipo, alvo: acao.alvo.tipo });
  if (acao.alvo.id !== undefined) q.set('id', acao.alvo.id);
  if (acao.alvo.rotulo !== undefined) q.set('rotulo', acao.alvo.rotulo);
  return `/sessao/iniciar?${q.toString()}`;
}
