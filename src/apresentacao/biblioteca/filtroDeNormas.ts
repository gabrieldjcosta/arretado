import type { Norma } from '../../core/modelo';

/** Os critérios da lista de Normas; guardados no endereço, vazio = sem critério. */
export interface CriteriosDeNormas {
  disciplina: string;
  ano: string;
  tipo: string;
  busca: string;
}

export const SEM_CRITERIOS: CriteriosDeNormas = { disciplina: '', ano: '', tipo: '', busca: '' };

/** Sem disciplina escolhida e sem outro critério, a lista completa fica recolhida. */
export function haCriterio(c: CriteriosDeNormas): boolean {
  return c.disciplina !== '' || c.ano !== '' || c.tipo !== '' || c.busca.trim() !== '';
}

/** Tipo de norma para o filtro: "Lei", "Decreto-Lei"…; sem tipo cai em "Outros". */
export function tipoDaNorma(norma: Pick<Norma, 'tipo'>): string {
  return norma.tipo?.trim() || 'Outros';
}

/** Ano da norma: o que vem depois da barra da referência ("7.210/1984"), ou o ano do título oficial. */
export function anoDaNorma(norma: Pick<Norma, 'referencia' | 'tituloOficial'>): string | undefined {
  const daReferencia = /\/(\d{4})\b/.exec(norma.referencia ?? '');
  if (daReferencia) return daReferencia[1];
  return /(\d{4})\D*$/.exec(norma.tituloOficial ?? '')?.[1];
}

/** Opções do filtro: anos do mais novo ao mais antigo; tipos em ordem alfabética. */
export function opcoesDeFiltro(normas: readonly Norma[]): { anos: string[]; tipos: string[] } {
  const anos = new Set<string>();
  const tipos = new Set<string>();
  for (const n of normas) {
    const ano = anoDaNorma(n);
    if (ano) anos.add(ano);
    tipos.add(tipoDaNorma(n));
  }
  return {
    anos: [...anos].sort((a, b) => b.localeCompare(a)),
    tipos: [...tipos].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

/** A norma passa por ano e tipo (a disciplina e a busca são tratadas por quem agrupa). */
export function passaNoFiltro(norma: Norma, c: CriteriosDeNormas): boolean {
  return (
    (c.ano === '' || anoDaNorma(norma) === c.ano) &&
    (c.tipo === '' || tipoDaNorma(norma) === c.tipo)
  );
}
