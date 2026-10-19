import { Link } from 'react-router';
import { TracoDeSelecao } from '../componentes/traco/TracoDeSelecao';

export type AbaDaBiblioteca = 'norma' | 'sumulas' | 'teses' | 'resumos' | 'precedentes';

const ABAS: { chave: AbaDaBiblioteca; rotulo: string; para: string }[] = [
  { chave: 'norma', rotulo: 'Normas', para: '/biblioteca' },
  { chave: 'sumulas', rotulo: 'Súmulas', para: '/biblioteca/sumulas' },
  { chave: 'teses', rotulo: 'Teses', para: '/biblioteca/teses' },
  { chave: 'resumos', rotulo: 'Resumos', para: '/biblioteca/resumos' },
  { chave: 'precedentes', rotulo: 'Precedentes', para: '/biblioteca/precedentes' },
];

/** Abas da Biblioteca (Peça 3c): Normas, Súmulas, Teses, Resumos e Precedentes. */
export function AbasDaBiblioteca({ atual }: { atual: AbaDaBiblioteca }) {
  return (
    <nav aria-label="Seções da Biblioteca" className="abas">
      {ABAS.map((a) => (
        <Link key={a.chave} to={a.para} {...(a.chave === atual ? { 'aria-current': 'page' } : {})}>
          {a.rotulo}
          <TracoDeSelecao chave={`biblioteca:${a.chave}`} ativo={a.chave === atual} />
        </Link>
      ))}
    </nav>
  );
}
