export interface Fonte {
  id: string;
  orgao: string;
  banca: string;
  url: string;
  tipo: 'indice' | 'edital';
  padrao?: string;
}
export interface Leitura {
  fonte: Fonte;
  links?: string[];
  erro?: string;
}
export type Estado = Record<string, { links: string[]; lidoEm: string }>;
export interface ItemDaFila {
  fonte: string;
  orgao: string;
  banca: string;
  tipo: 'novo' | 'retificado';
  url: string;
  detectadoEm: string;
}
export function extrairLinks(html: string, base: string, padrao?: string): string[];
export function comparar(
  estado: Estado,
  leituras: Leitura[],
  hoje: string,
): { novoEstado: Estado; fila: ItemDaFila[]; avisos: string[] };
export function rodar(args: {
  fontes: Fonte[];
  estado: Estado;
  hoje: string;
  buscar?: (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
}): Promise<{ novoEstado: Estado; fila: ItemDaFila[]; avisos: string[] }>;
