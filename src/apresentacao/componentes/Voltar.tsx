import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icone } from './Icone';

/**
 * "Voltar" no alto da tela: seta de traço único e a palavra, num alvo de 44 px com a letra alinhada
 * à margem da página. `nome` é para quando o texto à vista é mais curto que o nome acessível.
 */
export function Voltar({
  para,
  nome,
  children,
}: {
  para: string;
  nome?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={para}
      className="botao botao-texto na-margem"
      {...(nome === undefined ? {} : { 'aria-label': nome })}
    >
      <Icone nome="voltar" />
      {children}
    </Link>
  );
}
