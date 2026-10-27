import { Link } from 'react-router';
import { TracoDeSelecao } from '../componentes/traco/TracoDeSelecao';

export type AbaDaBiblioteca = 'norma' | 'sumulas' | 'teses' | 'resumos' | 'precedentes';

type GrupoDeAbas = 'normas' | 'colecoes' | 'textos';

interface Aba {
  chave: GrupoDeAbas;
  rotulo: string;
  para: string;
  /** Páginas que a aba reúne; com mais de uma, a aba mostra a escolha logo abaixo. */
  paginas: { chave: AbaDaBiblioteca; rotulo: string; para: string }[];
}

// S5: três abas cabem no celular (as cinco cortavam "Resumos" e escondiam "Precedentes"). Súmulas e
// Teses, Resumos e Precedentes continuam páginas próprias, escolhidas numa segunda linha.
const ABAS: Aba[] = [
  {
    chave: 'normas',
    rotulo: 'Normas',
    para: '/biblioteca',
    paginas: [{ chave: 'norma', rotulo: 'Normas', para: '/biblioteca' }],
  },
  {
    chave: 'colecoes',
    rotulo: 'Súmulas e teses',
    para: '/biblioteca/sumulas',
    paginas: [
      { chave: 'sumulas', rotulo: 'Súmulas', para: '/biblioteca/sumulas' },
      { chave: 'teses', rotulo: 'Teses', para: '/biblioteca/teses' },
    ],
  },
  {
    chave: 'textos',
    rotulo: 'Meus textos',
    para: '/biblioteca/resumos',
    paginas: [
      { chave: 'resumos', rotulo: 'Resumos', para: '/biblioteca/resumos' },
      { chave: 'precedentes', rotulo: 'Precedentes', para: '/biblioteca/precedentes' },
    ],
  },
];

/** Abas da Biblioteca (S5): Normas, Súmulas e teses, Meus textos (resumos e precedentes). */
export function AbasDaBiblioteca({ atual }: { atual: AbaDaBiblioteca }) {
  const grupo = ABAS.find((a) => a.paginas.some((p) => p.chave === atual)) ?? ABAS[0];
  if (grupo === undefined) return null;
  return (
    <>
      <nav aria-label="Seções da Biblioteca" className="abas">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            to={a.para}
            {...(a.chave === grupo.chave ? { 'aria-current': 'page' } : {})}
          >
            {a.rotulo}
            <TracoDeSelecao chave={`biblioteca:${a.chave}`} ativo={a.chave === grupo.chave} />
          </Link>
        ))}
      </nav>
      {grupo.paginas.length > 1 && (
        <nav aria-label={grupo.rotulo} className="sub-abas">
          {grupo.paginas.map((p) => (
            <Link
              key={p.chave}
              to={p.para}
              {...(p.chave === atual ? { 'aria-current': 'page' } : {})}
            >
              {p.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
