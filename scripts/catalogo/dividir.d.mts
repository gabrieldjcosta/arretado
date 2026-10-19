import type { Item } from './nucleo.mjs';
export function limparRuido(assunto: string): string;
export function ehAnexo(assunto: string): boolean;
export function dividirItem(
  numero: string | null,
  assunto: string,
): { numero: string | null; assunto: string }[];
export function dividirItens(itens: Item[]): { itens: Item[]; anexos: number };
