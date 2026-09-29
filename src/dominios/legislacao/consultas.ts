// Consultas do módulo sobre a camada de coleções (a listagem é sempre paginada: 200 por página).
import type { NomeColecao, RegistroDe } from '../../core/modelo';
import {
  LIMITE_MAXIMO_PAGINA,
  type Colecao,
  type ConsultaPagina,
  type Pagina,
} from '../../core/persistencia';

/** Todas as páginas de uma consulta. */
export async function todos<N extends NomeColecao>(
  colecao: Colecao<N>,
  consulta: Omit<ConsultaPagina<N>, 'limite' | 'cursor'>,
): Promise<RegistroDe<N>[]> {
  const itens: RegistroDe<N>[] = [];
  let cursor: string | null = null;
  do {
    const pagina: Pagina<RegistroDe<N>> = await colecao.listarPagina({
      ...consulta,
      limite: LIMITE_MAXIMO_PAGINA,
      cursor,
    });
    for (const item of pagina.itens) itens.push(item);
    cursor = pagina.proximoCursor;
  } while (cursor);
  return itens;
}

/** Dispositivos da norma, na ordem de leitura (índice `[normaId+ordem]`). */
export function dispositivosDaNorma(
  colecao: Colecao<'dispositivos'>,
  normaId: string,
  incluirExcluidos: boolean,
) {
  return todos(colecao, {
    indice: '[normaId+ordem]',
    de: [normaId, -Infinity],
    ate: [normaId, Infinity],
    incluirExcluidos,
  });
}
