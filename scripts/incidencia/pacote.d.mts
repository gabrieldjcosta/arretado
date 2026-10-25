export function itemDoAcervo(slug: string): string | null;
export function montarPacote(
  linhas: ReadonlyArray<{ norma: string; artigo: string; faixa: string }>,
  opcoes: { id: string; titulo: string; faixas?: string[] },
): {
  pacote: { id: string; titulo: string; normas: Record<string, string[]> };
  ignoradas: string[];
};
