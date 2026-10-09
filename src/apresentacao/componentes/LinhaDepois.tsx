import type { ReactNode } from 'react';

/** O que vem depois: texto recuado, sem competir com o "agora". */
export function LinhaDepois({ children }: { children?: ReactNode }) {
  if (children === undefined || children === null || children === false || children === '') {
    return null;
  }
  return <p className="linha-depois">Depois: {children}</p>;
}
