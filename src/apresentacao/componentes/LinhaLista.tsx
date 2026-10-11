import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Linha de lista (fatia 6): ícone em quadrado tingido, título, uma linha de apoio e seta. */
export function LinhaLista({
  para,
  icone,
  titulo,
  apoio,
  selo,
}: {
  para: string;
  /** Glifo curto; decorativo (o título diz tudo). */
  icone: string;
  titulo: string;
  apoio?: string;
  selo?: ReactNode;
}) {
  return (
    <Link to={para} className="linha-lista">
      <span className="linha-lista-icone" aria-hidden="true">
        {icone}
      </span>
      <span className="linha-lista-texto">
        <span className="linha-lista-titulo">{titulo}</span>
        {apoio !== undefined && <span className="linha-lista-apoio">{apoio}</span>}
      </span>
      {selo}
      <span className="linha-lista-seta" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
