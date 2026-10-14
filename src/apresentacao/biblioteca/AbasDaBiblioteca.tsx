import { Link } from 'react-router';

export type AbaDaBiblioteca = 'norma' | 'sumulas' | 'teses' | 'resumos';

const ABAS: { chave: AbaDaBiblioteca; rotulo: string; para: string }[] = [
  { chave: 'norma', rotulo: 'Normas', para: '/biblioteca' },
  { chave: 'sumulas', rotulo: 'Súmulas', para: '/biblioteca/sumulas' },
  { chave: 'teses', rotulo: 'Teses', para: '/biblioteca/teses' },
  { chave: 'resumos', rotulo: 'Resumos', para: '/biblioteca/resumos' },
];

/** Abas da Biblioteca (Peça 3c): Normas, Súmulas, Teses e Resumos. */
export function AbasDaBiblioteca({ atual }: { atual: AbaDaBiblioteca }) {
  return (
    <nav aria-label="Seções da Biblioteca" className="abas">
      {ABAS.map((a) => (
        <Link key={a.chave} to={a.para} {...(a.chave === atual ? { 'aria-current': 'page' } : {})}>
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
