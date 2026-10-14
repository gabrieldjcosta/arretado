import type { AlvoDeAcao } from '../../core/modelo';
import { ROTULO_REVISAR_FRASES } from '../../dominios/hoje/proxima-acao';

/** Para onde levar a pessoa quando o alvo é conhecido (Começar direto, sem passos no meio). */
export function rotaDoAlvo(alvo: AlvoDeAcao | undefined): string | undefined {
  if (!alvo) return undefined;
  if (alvo.tipo === 'revisao') {
    return alvo.rotulo === ROTULO_REVISAR_FRASES ? '/recall/frases/revisar' : '/recall/revisar';
  }
  if (alvo.tipo === 'leitura' && alvo.id !== undefined) return `/biblioteca/normas/${alvo.id}`;
  return undefined;
}
