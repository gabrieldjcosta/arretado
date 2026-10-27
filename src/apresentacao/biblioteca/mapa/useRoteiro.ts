import { useEffect, useState } from 'react';
import {
  quadradosDoMapa,
  roteiroDoMapa,
  cobertura,
  type QuadradoDoMapa,
  type TrechoDoMapa,
} from '../../../dominios/legislacao/mapa-da-norma';
import { useRepositorio } from '../../dados/contexto';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { coberturaDaNorma } from './cobertura-da-norma';

export interface Roteiro {
  quadrados: QuadradoDoMapa[];
  trechos: TrechoDoMapa[];
}

/** O roteiro do mapa da norma, montado uma vez ao ligar o modo; nada enquanto não chega ou sem mapa. */
export function useRoteiroDoMapa(normaId: string, ativo: boolean): Roteiro | undefined {
  const repo = useRepositorio();
  const fonte = useFonteIncidencia();
  const [roteiro, setRoteiro] = useState<Roteiro>();
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    coberturaDaNorma(repo, normaId)
      .then(async ({ aberta, lidoAte, marcados }) => {
        const acervoId = aberta.norma.origemAcervo?.id;
        const mapa = acervoId === undefined ? undefined : await fonte.mapaDaNorma(acervoId);
        if (!mapa) return;
        const quadrados = quadradosDoMapa(aberta.nos, mapa.dados);
        const { cobertos } = cobertura(quadrados, lidoAte, marcados);
        if (vivo) setRoteiro({ quadrados, trechos: roteiroDoMapa(quadrados, cobertos) });
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [repo, fonte, normaId, ativo]);
  return ativo ? roteiro : undefined;
}
