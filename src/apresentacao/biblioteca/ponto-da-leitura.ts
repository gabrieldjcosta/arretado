// Onde a leitura parou, para quem a retoma: a Biblioteca (o "Retomar") e o Varal (o estado do folheto das Normas).
import type { Leitura, Norma } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { minutosAteOFimDaSecao } from '../../dominios/legislacao/continuar';
import { abrirNorma } from '../../dominios/legislacao/leitor';
import { lidaEm } from '../../dominios/legislacao/leituras';
import { referenciaDoNo } from './linhas';

/**
 * Onde a leitura parou e quanto falta da seção: "Art. 41" e os minutos. Sem o ponto (norma sem
 * posição guardada, ou que não abre), o "Retomar" aparece sem eles.
 */
export async function pontoDaLeitura(
  repo: Repositorio,
  normaId: string,
  leituras: ReadonlyMap<string, Leitura>,
): Promise<{ referencia: string; minutos: number } | undefined> {
  const leitura = leituras.get(normaId);
  const alvo = leitura?.posicaoId ?? leitura?.lidoAteId;
  if (alvo === undefined) return undefined;
  try {
    const { nos, indiceDe } = await abrirNorma(repo, normaId);
    const indice = indiceDe.get(alvo);
    if (indice === undefined) return undefined;
    const referencia = referenciaDoNo(nos, indiceDe, indice);
    return referencia === ''
      ? undefined
      : { referencia, minutos: minutosAteOFimDaSecao(nos, indice) };
  } catch {
    return undefined;
  }
}

/** A norma publicada lida por último: a do "Retomar" (Parte 2 §9.2). */
export function ultimaLida(normas: readonly Norma[], leituras: ReadonlyMap<string, Leitura>) {
  let ultima: { norma: Norma; leitura: Leitura } | undefined;
  for (const norma of normas) {
    const leitura = leituras.get(norma.id);
    if (leitura && (!ultima || lidaEm(leitura) > lidaEm(ultima.leitura))) {
      ultima = { norma, leitura };
    }
  }
  return ultima?.norma;
}
