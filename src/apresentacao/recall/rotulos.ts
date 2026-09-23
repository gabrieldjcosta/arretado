import type {
  CausaErro,
  EstadoCartao,
  ResultadoErro,
  RespostaRevisao,
  StatusErro,
} from '../../core/modelo';

export const ROTULO_RESULTADO: Record<ResultadoErro, string> = {
  errou: 'Errei',
  acertou_inseguro: 'Acertei sem certeza',
};

export const ROTULO_STATUS: Record<StatusErro, string> = {
  aberto: 'Aberto',
  com_cartao: 'Com cartão',
  resolvido: 'Resolvido',
  descartado: 'Descartado',
};

export const ROTULO_ESTADO: Record<EstadoCartao, string> = {
  ativo: 'Ativos',
  suspenso: 'Suspensos',
  arquivado: 'Arquivados',
};

export const ROTULO_RESPOSTA: Record<RespostaRevisao, string> = {
  errei: 'Errei',
  dificil: 'Difícil',
  facil: 'Fácil',
};

export const CAUSAS: CausaErro[] = ['lacuna', 'leitura', 'confusao', 'literalidade'];

export function formatarData(data: string): string {
  const [a, m, d] = data.split('-');
  return `${d ?? ''}/${m ?? ''}/${a ?? ''}`;
}

export function formatarQuando(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}
