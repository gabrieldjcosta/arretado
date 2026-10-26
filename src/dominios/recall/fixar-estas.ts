// "Fixar estas" (crítica externa, Onda 3): as Frases de uma lista de enunciados escolhida pela
// pessoa, de uma vez. Só entra o que ela confirma na lista visível; cada Frase leva o link de volta
// ao dispositivo de origem, e o que já foi fixado não se repete. Para não despejar tudo no mesmo dia,
// as revisões começam em partes (`FIXAR_POR_DIA`), a partir de amanhã.
import { somarDias } from '../../core/datas';
import type { Repositorio } from '../../core/persistencia';
import { hoje } from './servico';

export const FIXAR_POR_DIA = 5;

export interface EnunciadoParaFixar {
  dispositivoId: string;
  versaoId: string;
  /** "Súmula Vinculante 11". */
  rotulo: string;
  /** O enunciado, como está na norma. */
  texto: string;
}

export interface ResultadoDoFixar {
  fixadas: number;
  /** Já tinham Frase (não repetidas). */
  jaFixadas: number;
}

export async function fixarEstas(
  repo: Repositorio,
  itens: readonly EnunciadoParaFixar[],
  porDia: number = FIXAR_POR_DIA,
): Promise<ResultadoDoFixar> {
  const resultado = await repo.transacao(async () => {
    const existentes = new Set(
      (await repo.colecao('frases').todosDoUsuario())
        .filter((f) => f.excluidoEm === null && f.trecho !== undefined)
        .map((f) => f.trecho?.dispositivoId),
    );
    const novos = itens.filter((i) => !existentes.has(i.dispositivoId));
    const criadas: string[] = [];
    for (const [n, item] of novos.entries()) {
      const frase = await repo.colecao('frases').criar({
        texto: `${item.rotulo}: ${item.texto}`.slice(0, 2_000),
        origemTipo: 'trecho',
        trecho: {
          dispositivoId: item.dispositivoId,
          versaoId: item.versaoId,
          texto: item.texto.slice(0, 5_000),
          inicio: 0,
          fim: item.texto.length,
        },
        estado: 'ativa',
        proximaRevisao: somarDias(hoje(repo), 1 + Math.floor(n / Math.max(1, porDia))),
      });
      criadas.push(frase.id);
    }
    return { ids: criadas, jaFixadas: itens.length - novos.length };
  });
  for (const fraseId of resultado.ids) repo.eventos.emitir('frase.criada', { fraseId });
  return { fixadas: resultado.ids.length, jaFixadas: resultado.jaFixadas };
}
