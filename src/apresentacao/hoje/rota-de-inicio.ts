import type { ProximaAcao } from '../../dominios/hoje/contrato';

/**
 * O botão de começar só leva ao início da Sessão (A2), que lê a ação pela query:
 * `tipo`/`id`/`rotulo` = alvo; `origem`/`razao` = de onde veio a Próxima ação. `direto=1`: a Sessão
 * começa sozinha e a pessoa cai na tela do alvo (ou, sem tela própria, na Sessão): 2 toques, não 4.
 */
export function rotaDeInicio(acao: ProximaAcao): string {
  const q = new URLSearchParams({ tipo: acao.alvo.tipo });
  if (acao.alvo.id !== undefined) q.set('id', acao.alvo.id);
  if (acao.alvo.rotulo !== undefined) q.set('rotulo', acao.alvo.rotulo);
  if (acao.alvo.tipo === 'tarefa' && acao.alvo.id !== undefined) q.set('tarefa', acao.alvo.id);
  if (acao.tipo === 'ciclo' && acao.alvo.id !== undefined && acao.blocoOrdem !== undefined) {
    q.set('ciclo', acao.alvo.id);
    q.set('bloco', String(acao.blocoOrdem));
  }
  // Trecho do mapa: o Leitor abre nele, no artigo por artigo e "seguindo o mapa".
  if (acao.trecho) q.set('ir', acao.trecho.endereco);
  q.set('origem', acao.tipo);
  q.set('razao', acao.razao);
  q.set('direto', '1');
  return `/sessao/iniciar?${q.toString()}`;
}
