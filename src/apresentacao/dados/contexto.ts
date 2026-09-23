import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Repositorio } from '../../core/persistencia';

export const ContextoRepositorio = createContext<Repositorio | null>(null);

export function useRepositorio(): Repositorio {
  const repo = useContext(ContextoRepositorio);
  if (!repo) throw new Error('useRepositorio fora do ProvedorRepositorio');
  return repo;
}

export interface Dados<T> {
  dados: T | undefined;
  carregando: boolean;
  falha: unknown;
  recarregar: () => void;
}

/**
 * Carrega dados do repositório e recarrega a cada escrita confirmada (eventos `registro.*`).
 * `carregar` deve ser estável (useCallback). Durante a recarga os dados anteriores continuam
 * visíveis (sem piscar).
 */
export function useDados<T>(carregar: (repo: Repositorio) => Promise<T>): Dados<T> {
  const repo = useRepositorio();
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => {
    setVersao((v) => v + 1);
  }, []);
  const pedido = useMemo(() => ({ repo, carregar, versao }), [repo, carregar, versao]);
  const [estado, setEstado] = useState<{ pedido?: typeof pedido; dados?: T; falha?: unknown }>({});

  useEffect(() => repo.eventos.assinar('*', recarregar), [repo, recarregar]);

  useEffect(() => {
    let ativo = true;
    pedido.carregar(pedido.repo).then(
      (dados) => {
        if (ativo) setEstado({ pedido, dados });
      },
      (falha: unknown) => {
        if (ativo) setEstado((e) => ({ pedido, dados: e.dados, falha }));
      },
    );
    return () => {
      ativo = false;
    };
  }, [pedido]);

  return {
    dados: estado.dados,
    carregando: estado.pedido !== pedido,
    falha: estado.falha,
    recarregar,
  };
}
