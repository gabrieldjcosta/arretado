// Voz regional (guia de voz, docs/design/guia-de-voz.md). Estrutura e vocabulário ficam neutros;
// o sotaque entra só em conclusões, numa em cada três, e nunca no perfil Calmo. Os textos ficam
// aqui, num lugar só, para trocar sem caçar no código.
import { useCallback, useState } from 'react';
import type { Preferencias } from '../core/modelo';
import { obterPreferencias } from '../core/preferencias';
import { useDados } from './dados/contexto';

export const TEXTOS_DA_VOZ = {
  fimDeRodada: { neutro: 'Feito.', regional: 'Danado de bom! Rodada feita.' },
  diaFechado: { neutro: 'Dia fechado', regional: 'Dia fechado, danado de bom.' },
} as const;

export type ChaveDaVoz = keyof typeof TEXTOS_DA_VOZ;

/** A fração de conclusões que levam a variação regional. */
export const FRACAO_REGIONAL = 1 / 3;

/** Perfil ausente conta como Calmo (como nas preferências); Calmo desliga as variações. */
export function vozRegionalPermitida(p: Pick<Preferencias, 'perfilDeEstudo'> | undefined) {
  return p !== undefined && p.perfilDeEstudo !== undefined && p.perfilDeEstudo !== 'calmo';
}

export function escolherTexto(
  chave: ChaveDaVoz,
  opcoes: { permitida: boolean; sorteio: number },
): string {
  const t = TEXTOS_DA_VOZ[chave];
  return opcoes.permitida && opcoes.sorteio < FRACAO_REGIONAL ? t.regional : t.neutro;
}

/** O texto de uma conclusão, sorteado uma vez por tela (não muda a cada render). */
export function useVoz(): (chave: ChaveDaVoz) => string {
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));
  const [sorteio] = useState(() => Math.random());
  const permitida = vozRegionalPermitida(dados);
  return (chave) => escolherTexto(chave, { permitida, sorteio });
}
