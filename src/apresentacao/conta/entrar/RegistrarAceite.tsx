import { useEffect } from 'react';
import { useRepositorio } from '../../dados/contexto';
import { registrarAceitePendente } from './aceite';

/** Sem tela: ao abrir Conta já dentro da conta, passa o aceite do login para o Aparelho. */
export function RegistrarAceite({
  registro,
}: {
  registro?: Parameters<typeof registrarAceitePendente>[1];
}) {
  const repo = useRepositorio();
  useEffect(() => {
    void registrarAceitePendente(repo, registro).catch(() => undefined);
  }, [repo, registro]);
  return null;
}
