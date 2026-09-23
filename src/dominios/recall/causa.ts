// Causa sugerida, ação recomendada e completude do Erro (Parte 2 §10.4). Sugestão nunca é
// confirmação: fica marcada como "sugerida" até o usuário escolher.
import type { CausaErro, Erro } from '../../core/modelo';

const LITERALIDADE =
  /\b(prazos?|dias?|meses|anos|horas|salvo|exceto|excetuad\w*|ressalvad\w*|somente|apenas|no m[aá]ximo|no m[ií]nimo|at[eé] \d|qu[oó]rum|maioria|unanimidade|vedad\w*|facultad\w*|obrigat[oó]ri\w*)\b/i;
const CONFUSAO = /(confundi|achei que era|pensei que era|troquei|misturei|vs\.?|\bx\b)/i;
const LEITURA =
  /(li errado|n[aã]o li|li r[aá]pido|pulei|desaten\w*|n[aã]o vi|marquei (a )?errad\w*|li mal|enunciado)/i;

export function sugerirCausa(
  erro: Pick<Erro, 'oQueFoi' | 'resultado'> &
    Partial<Pick<Erro, 'justificativa' | 'conviccao' | 'fraseCorreta'>>,
): CausaErro | undefined {
  const texto = [erro.oQueFoi, erro.justificativa ?? ''].join(' ');
  if (LEITURA.test(texto)) return 'leitura';
  if (CONFUSAO.test(texto)) return 'confusao';
  if (LITERALIDADE.test(texto)) return 'literalidade';
  if (erro.conviccao === 1) return 'lacuna';
  return undefined;
}

export const ACAO_RECOMENDADA: Record<CausaErro, string> = {
  lacuna: 'Estudar o ponto e criar cartão.',
  leitura: 'Registrar sem cartão e prestar atenção à leitura.',
  confusao: 'Criar cartão de contraste (A × B).',
  literalidade: 'Grifar o dispositivo e criar cartão com o texto literal.',
};

export const NOME_CAUSA: Record<CausaErro, string> = {
  lacuna: 'Lacuna — não sabia o conteúdo',
  leitura: 'Leitura — sabia, leu errado',
  confusao: 'Confusão — trocou por instituto parecido',
  literalidade: 'Literalidade — errou detalhe da letra da lei',
};

/** "rápido" até ter frase correta e causa escolhida; só sinaliza, nunca obriga. */
export function completude(erro: Pick<Erro, 'fraseCorreta' | 'causa'>): 'rapido' | 'completo' {
  return erro.fraseCorreta && erro.causa ? 'completo' : 'rapido';
}
