export const CABECALHO: string[];
export type Linha = Record<string, string | number>;
export function achatar(materia: unknown): Linha[];
export function paraCsv(linhas: Linha[]): string;
export function lerCsv(texto: string): Record<string, string>[];
export function validar(linhas: Record<string, string | number>[]): {
  erros: { linha: number; regra: string; msg: string }[];
  avisos: { linha: number; regra: string; msg: string }[];
};
