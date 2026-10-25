import { useEffect, useState } from 'react';

export type Carga<T> =
  { estado: 'carregando' } | { estado: 'falha' } | { estado: 'pronto'; dados: T };

/**
 * Carrega uma vez (e de novo no "tentar de novo"). `carregar` tem de ser estável (`useCallback`): uma
 * função nova a cada render pediria tudo outra vez.
 */
export function useCarga<T>(carregar: () => Promise<T>) {
  const [carga, setCarga] = useState<Carga<T>>({ estado: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    carregar().then(
      (dados) => {
        if (ativo) setCarga({ estado: 'pronto', dados });
      },
      () => {
        if (ativo) setCarga({ estado: 'falha' });
      },
    );
    return () => {
      ativo = false;
    };
  }, [carregar, tentativa]);
  return {
    carga,
    tentarDeNovo: () => {
      setCarga({ estado: 'carregando' });
      setTentativa((t) => t + 1);
    },
  };
}
