import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { criarServicoDeConta, type ServicoDeConta } from '../../../integracoes/conta';

const ContextoConta = createContext<ServicoDeConta | null>(null);

/** Oferece o serviço de conta às telas; sem provedor, usa o do build (nulo com `VITE_CONTA=0`). */
export function ProvedorConta({
  servico,
  children,
}: {
  servico?: ServicoDeConta;
  children: ReactNode;
}) {
  const valor = useMemo(() => servico ?? criarServicoDeConta(), [servico]);
  return <ContextoConta.Provider value={valor}>{children}</ContextoConta.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook junto do provedor, como em dados/contexto
export function useServicoDeConta(): ServicoDeConta {
  const servico = useContext(ContextoConta);
  if (!servico) throw new Error('ProvedorConta ausente');
  return servico;
}
