// Estrelas no leitor (F2, 11.2): as gravadas da norma aberta (direta e exceção), mantidas a cada
// toque que o banco confirma, e o estado calculado de cada nó (a herança nunca é gravada).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Estrela } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  alternarEstrela,
  EstrelaInvalida,
  estrelasDaNorma,
  estrelasEfetivas,
  porAlvo,
  type ArvoreDaEstrela,
  type EstadoDaEstrela,
} from '../../dominios/legislacao/estrelas';

export interface EstrelasDaNorma {
  /** O estado de cada nó da árvore (o revogado, o vetado e a rubrica, sempre sem estrela). */
  estados: ReadonlyMap<string, EstadoDaEstrela>;
  /** A última ação que falhou (a mensagem para a tela), até a próxima dar certo. */
  falha: string | undefined;
  /** Põe ou tira a estrela; devolve o estado novo, ou nada se não gravou. */
  alternar: (alvoId: string) => Promise<EstadoDaEstrela | undefined>;
}

/**
 * As estrelas da norma aberta: lidas uma vez e trocadas pela lista que cada ação devolve. A tela só
 * muda depois de gravar: uma estrela que não gravou não aparece como se existisse.
 */
export function useEstrelas(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  vivo: { current: boolean },
): EstrelasDaNorma {
  const [gravadas, setGravadas] = useState<readonly Estrela[]>([]);
  const [falha, setFalha] = useState<string | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    estrelasDaNorma(repo, arvore.normaId).then(
      (lidas) => {
        if (ativo) setGravadas(lidas);
      },
      () => {
        if (ativo) setFalha('Não foi possível ler as estrelas desta norma.');
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, arvore.normaId]);

  // Recalculado só quando uma estrela muda (o leitor redesenha a cada rolagem).
  const estados = useMemo(() => estrelasEfetivas(arvore, porAlvo(gravadas)), [arvore, gravadas]);

  const alternar = useCallback(
    async (alvoId: string) => {
      try {
        const { estrelas, estado } = await alternarEstrela(repo, arvore, alvoId);
        if (!vivo.current) return undefined;
        setGravadas(estrelas);
        setFalha(undefined);
        return estado;
      } catch (excecao) {
        if (vivo.current) {
          setFalha(
            excecao instanceof EstrelaInvalida
              ? excecao.message
              : 'Não foi possível guardar a estrela.',
          );
        }
        return undefined;
      }
    },
    [repo, arvore, vivo],
  );

  return { estados, falha, alternar };
}
