import type { ReactNode } from 'react';

/** Selo ("Há versão nova", "Vigente"): sempre com palavra, nunca só a cor. */
export function Selo({ children }: { children: ReactNode }) {
  return <span className="selo">{children}</span>;
}
