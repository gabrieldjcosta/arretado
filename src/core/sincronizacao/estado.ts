// Os três estados da tela (plano-mestre, F4-B; plano §0): "Salvo neste aparelho" → "Enviado à conta"
// → "Igual nos seus aparelhos". Função pura: a tela junta os sinais e pergunta aqui.

export type EstadoDaSincronizacao = 'salvo' | 'enviado' | 'igual';

export interface SinaisDeSincronizacao {
  /** Entradas do log local que ainda não subiram. */
  pendentes: number;
  /** Última rodada completa (enviar e receber); `null` se nenhuma terminou nesta abertura. */
  ultimaRodada: { ok: boolean; em: string } | null;
  /** Conflitos abertos em Conta › Conflitos. */
  conflitos: number;
  /** Entradas recebidas que não puderam ser aplicadas; com elas este aparelho não está igual. */
  emQuarentena?: number;
}

export const ROTULO_DO_ESTADO: Record<EstadoDaSincronizacao, string> = {
  salvo: 'Salvo neste aparelho',
  enviado: 'Enviado à conta',
  igual: 'Igual nos seus aparelhos',
};

/**
 * `salvo`: há o que enviar. `igual`: nada a enviar, a última rodada recebeu tudo e não há Conflito
 * esperando a pessoa nem entrada em quarentena. `enviado`: tudo subiu, mas não dá para afirmar que
 * este aparelho já tem o dos outros (rodada que falhou, ainda nenhuma rodada, Conflito aberto ou
 * mudança recebida que ficou de lado).
 */
export function estadoDaSincronizacao(s: SinaisDeSincronizacao): EstadoDaSincronizacao {
  if (s.pendentes > 0) return 'salvo';
  if (s.ultimaRodada?.ok && s.conflitos === 0 && (s.emQuarentena ?? 0) === 0) return 'igual';
  return 'enviado';
}
