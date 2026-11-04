// Carga única dos dados de um passo: abre a norma, monta as perguntas e entrega. Diferente de
// `useDados`, não recarrega a cada escrita (guardar uma Frase no meio do passo não pode refazer
// nem piscar a pergunta); a mesma semente refaria as mesmas perguntas de qualquer jeito.
import { useEffect, useState } from 'react';
import type { Repositorio } from '../../../core/persistencia';
import type { NormaAberta } from '../../../dominios/legislacao/leitor';
import { referenciaDoNo } from '../../biblioteca/linhas';
import { useRepositorio } from '../../dados/contexto';

/** "Art. 112" a partir da árvore aberta, como o Leitor mostra. */
export function referenciaDe(aberta: NormaAberta, indice: number): string {
  return referenciaDoNo(aberta.nos, aberta.indiceDe, indice);
}

export type Carga<T> =
  { estado: 'carregando' } | { estado: 'pronto'; dados: T } | { estado: 'falhou' };

/** Carrega uma vez por `chave` (muda a chave, carrega de novo). */
export function useCargaDoPasso<T>(
  chave: string,
  carregar: (repo: Repositorio) => Promise<T>,
): Carga<T> {
  const repo = useRepositorio();
  const [carga, setCarga] = useState<{ chave: string; carga: Carga<T> }>();
  useEffect(() => {
    let ativo = true;
    carregar(repo).then(
      (dados) => {
        if (ativo) setCarga({ chave, carga: { estado: 'pronto', dados } });
      },
      () => {
        if (ativo) setCarga({ chave, carga: { estado: 'falhou' } });
      },
    );
    return () => {
      ativo = false;
    };
    // `carregar` muda a cada render; a chave diz quando o pedido é outro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, chave]);
  return carga?.chave === chave ? carga.carga : { estado: 'carregando' };
}
