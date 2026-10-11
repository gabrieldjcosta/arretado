// Agrupamento da tela do acervo (Peça 3c): puro, sem repositório nem rede.
import type { EntradaDoIndice, TipoDoAcervo } from './esquemas';
import { nomeComparavel } from './adesao';

export type ModoDeAgrupar = 'disciplina' | 'tipo';

export interface GrupoDoAcervo {
  titulo: string;
  itens: EntradaDoIndice[];
}

export const SEM_DISCIPLINA = 'Sem disciplina';

/** Filtra por tipo e busca (sem acento nem caixa) no título, no grupo e nas disciplinas. */
export function filtrarEntradas(
  itens: readonly EntradaDoIndice[],
  tipo: TipoDoAcervo,
  busca: string,
): EntradaDoIndice[] {
  const q = nomeComparavel(busca);
  return itens.filter((i) => {
    if (i.tipo !== tipo) return false;
    if (q === '') return true;
    const alvo = [i.titulo, i.grupo, ...i.vinculos.map((v) => v.disciplina)].map(nomeComparavel);
    return alvo.some((t) => t.includes(q));
  });
}

/** Por disciplina, um item aparece em cada disciplina a que se vincula; por tipo, no seu grupo. */
export function agrupar(itens: readonly EntradaDoIndice[], modo: ModoDeAgrupar): GrupoDoAcervo[] {
  const mapa = new Map<string, EntradaDoIndice[]>();
  const pôr = (titulo: string, item: EntradaDoIndice) => {
    const lista = mapa.get(titulo);
    if (lista) lista.push(item);
    else mapa.set(titulo, [item]);
  };
  for (const i of itens) {
    if (modo === 'tipo') pôr(i.grupo, i);
    else if (i.vinculos.length === 0) pôr(SEM_DISCIPLINA, i);
    else for (const d of new Set(i.vinculos.map((v) => v.disciplina))) pôr(d, i);
  }
  return [...mapa.entries()]
    .map(([titulo, lista]) => ({ titulo, itens: lista }))
    .sort((a, b) => {
      if (a.titulo === SEM_DISCIPLINA) return 1;
      if (b.titulo === SEM_DISCIPLINA) return -1;
      return a.titulo.localeCompare(b.titulo, 'pt-BR');
    });
}

/** "12 KB", "1,4 MB": o que será baixado. */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
