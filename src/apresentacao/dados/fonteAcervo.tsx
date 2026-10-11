import type { ReactNode } from 'react';
import type { FonteDoAcervo } from '../../dominios/acervo/fonte';
import { ContextoFonteAcervo, fonteAcervoPadrao } from './fonteAcervoContexto';

/** A fonte do acervo do app (T20): estática por padrão; testes injetam uma em memória. */
export function ProvedorFonteAcervo({
  fonte,
  children,
}: {
  fonte?: FonteDoAcervo | undefined;
  children: ReactNode;
}) {
  return (
    <ContextoFonteAcervo.Provider value={fonte ?? fonteAcervoPadrao}>
      {children}
    </ContextoFonteAcervo.Provider>
  );
}
