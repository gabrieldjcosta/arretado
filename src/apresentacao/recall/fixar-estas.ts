import type { Repositorio } from '../../core/persistencia';
import type { EnunciadoParaFixar } from '../../dominios/recall/fixar-estas';
import { abrirNorma, lerJanela, normasPublicadas } from '../../dominios/legislacao/leitor';

/** O item do acervo das súmulas vinculantes do STF. */
export const ACERVO_SUMULAS_VINCULANTES = 'sumulas-stf-vinculantes';

/**
 * As súmulas vinculantes vigentes da coleção que a pessoa já adicionou, em ordem de número;
 * `undefined` quando a coleção não está na Biblioteca.
 */
export async function sumulasVinculantes(
  repo: Repositorio,
): Promise<EnunciadoParaFixar[] | undefined> {
  const norma = (await normasPublicadas(repo)).find(
    (n) => n.origemAcervo?.id === ACERVO_SUMULAS_VINCULANTES,
  );
  if (!norma) return undefined;
  const aberta = await abrirNorma(repo, norma.id);
  const itens = await lerJanela(repo, aberta, { inicio: 0, quantidade: aberta.nos.length });
  return itens.flatMap((i): EnunciadoParaFixar[] => {
    const texto = i.texto
      ? i.texto.trechos
          .map((t) => t.texto)
          .join('')
          .trim()
      : '';
    if (i.dispositivo.tipo !== 'sumula' || i.dispositivo.status !== 'vigente' || !texto) return [];
    return [
      {
        dispositivoId: i.dispositivo.id,
        versaoId: aberta.versao.id,
        rotulo: i.dispositivo.rotulo ?? i.dispositivo.endereco,
        texto,
      },
    ];
  });
}
