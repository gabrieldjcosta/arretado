import type { ReactNode } from 'react';

/** Selo em pílula ("Há versão nova", "Vigente"): sempre com palavra, nunca só a cor. */
export function Selo({ children }: { children: ReactNode }) {
  return <span className="selo">{children}</span>;
}
