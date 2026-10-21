export function normaDe(ref: unknown): string | null;
export function artigosDe(texto: unknown): string[];
export function referenciaDe(l: Record<string, string>): string;
export function pesoPorArtigo(linhas: Record<string, string>[]): {
  norma: string;
  artigo: string;
  peso: number;
  faixa: string;
  fonte: string;
}[];
