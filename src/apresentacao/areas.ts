import { ROTULO_DA_AREA } from './textos';

/**
 * As quatro áreas do app, na ordem das abas: a rota, o nome que a pessoa lê e o ícone de linha (24 × 24).
 * A navegação (`Shell`) e o passeio da Chegada (`entrada/passeio/passos.ts`) leem daqui, para os dois mostrarem
 * o mesmo ícone e o mesmo nome.
 */
export const AREAS = [
  {
    caminho: '/',
    nome: ROTULO_DA_AREA.hoje,
    icone: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z',
  },
  { caminho: '/plano', nome: ROTULO_DA_AREA.plano, icone: 'M5 5h14v14H5zM5 10h14M9 3v4M15 3v4' },
  {
    caminho: '/recall',
    nome: ROTULO_DA_AREA.recall,
    icone: 'M5 8h11a3 3 0 0 1 3 3v7H8a3 3 0 0 1-3-3zM8 5h11',
  },
  {
    caminho: '/biblioteca',
    nome: ROTULO_DA_AREA.biblioteca,
    icone:
      'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19',
  },
] as const;
