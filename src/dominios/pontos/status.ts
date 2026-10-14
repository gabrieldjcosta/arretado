// Pontos do programa (F3-B, pacote B3): status e atividade DERIVADOS do que a pessoa fez, nunca
// editados (Parte 2 §10.2). Prioridade (faixa) é outro campo e não entra aqui. A atividade descreve
// o que aconteceu; nenhum texto alega domínio da matéria (sem "dominado", sem "consolidado").
import type { DataCivil, Ponto } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

export type StatusDoPonto =
  'nao_iniciado' | 'em_andamento' | 'primeira_passada' | 'precisa_revisar' | 'adiado';

export const ROTULO_STATUS: Record<StatusDoPonto, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  primeira_passada: 'Primeira passada',
  precisa_revisar: 'Precisa revisar',
  adiado: 'Adiado',
};

export interface AtividadeDoPonto {
  /** Qualquer Sessão que tenha o ponto como alvo (ativa, pausada, interrompida ou encerrada). */
  sessoes: number;
  sessoesEncerradas: number;
  erros: number;
  errosAbertos: number;
  cartoes: number;
  cartoesVencidos: number;
  frases: number;
}

export const SEM_ATIVIDADE: AtividadeDoPonto = {
  sessoes: 0,
  sessoesEncerradas: 0,
  erros: 0,
  errosAbertos: 0,
  cartoes: 0,
  cartoesVencidos: 0,
  frases: 0,
};

/**
 * Regras (em ordem):
 * - adiado: `adiadoAte` ainda no futuro (único status manual);
 * - não iniciado: sem Sessão, Erro, Cartão nem Frase;
 * - primeira passada: ao menos uma Sessão encerrada com o ponto como alvo;
 * - precisa revisar: primeira passada e (Cartão vencido ou Erro aberto);
 * - em andamento: o resto (alguma atividade, ainda sem Sessão encerrada).
 */
export function statusDoPonto(
  ponto: Pick<Ponto, 'adiadoAte'>,
  atividade: AtividadeDoPonto,
  hoje: DataCivil,
): StatusDoPonto {
  if (ponto.adiadoAte !== undefined && ponto.adiadoAte > hoje) return 'adiado';
  const tem = atividade.sessoes + atividade.erros + atividade.cartoes + atividade.frases > 0;
  if (!tem) return 'nao_iniciado';
  if (atividade.sessoesEncerradas === 0) return 'em_andamento';
  return atividade.cartoesVencidos > 0 || atividade.errosAbertos > 0
    ? 'precisa_revisar'
    : 'primeira_passada';
}

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** "2 sessões, 1 erro, 3 cartões": só contagens do que aconteceu, sem juízo de domínio. */
export function descreverAtividade(a: AtividadeDoPonto): string {
  const partes = [
    a.sessoesEncerradas > 0 ? plural(a.sessoesEncerradas, 'sessão', 'sessões') : '',
    a.erros > 0 ? plural(a.erros, 'erro', 'erros') : '',
    a.cartoes > 0 ? plural(a.cartoes, 'cartão', 'cartões') : '',
    a.frases > 0 ? plural(a.frases, 'frase', 'frases') : '',
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(', ') : 'Nada registrado ainda';
}

/** Conta a atividade de todos os pontos de uma vez (lê Sessões, Erros, Cartões e Frases). */
export async function atividadePorPonto(
  repo: Repositorio,
  hoje: DataCivil,
): Promise<Map<string, AtividadeDoPonto>> {
  const [sessoes, erros, cartoes, frases] = await Promise.all([
    repo.colecao('sessoes').todosDoUsuario(),
    repo.colecao('erros').todosDoUsuario(),
    repo.colecao('cartoes').todosDoUsuario(),
    repo.colecao('frases').todosDoUsuario(),
  ]);
  const mapa = new Map<string, AtividadeDoPonto>();
  const de = (id: string) => {
    let a = mapa.get(id);
    if (!a) {
      a = { ...SEM_ATIVIDADE };
      mapa.set(id, a);
    }
    return a;
  };
  for (const s of sessoes) {
    if (!s.pontoId) continue;
    const a = de(s.pontoId);
    a.sessoes += 1;
    if (s.estado === 'encerrada') a.sessoesEncerradas += 1;
  }
  for (const e of erros) {
    if (!e.pontoId || e.status === 'descartado') continue;
    const a = de(e.pontoId);
    a.erros += 1;
    if (e.status === 'aberto') a.errosAbertos += 1;
  }
  for (const c of cartoes) {
    if (!c.pontoId || c.estado === 'arquivado') continue;
    const a = de(c.pontoId);
    a.cartoes += 1;
    if (c.estado === 'ativo' && c.proximaRevisao <= hoje) a.cartoesVencidos += 1;
  }
  for (const f of frases) {
    if (f.pontoId && f.estado === 'ativa') de(f.pontoId).frases += 1;
  }
  return mapa;
}
