import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icone } from './Icone';

/**
 * Linha de lista (D-D7, P6): título, uma linha de apoio e a seta, em linha sobre a areia com o filete
 * embaixo (a lista não vira uma pilha de cartões; o cartão fica para o que agrupa).
 */
export function LinhaLista({
  para,
  titulo,
  apoio,
  selo,
}: {
  para: string;
  titulo: string;
  apoio?: string;
  selo?: ReactNode;
}) {
  return (
    <Link to={para} className="linha-lista">
      <span className="linha-lista-texto">
        <span className="linha-lista-titulo">{titulo}</span>
        {apoio !== undefined && <span className="linha-lista-apoio">{apoio}</span>}
      </span>
      {selo}
      <Icone nome="seta" className="linha-lista-seta" />
    </Link>
  );
}
