export interface Selecionado {
  texto: string;
  inicio: number;
  fim: number;
}

/** O trecho selecionado dentro do corpo (texto puro, uma só âncora de deslocamento). */
export function selecaoNoCorpo(raiz: HTMLElement | null): Selecionado | undefined {
  const sel = window.getSelection();
  if (!raiz || !sel || sel.rangeCount === 0 || sel.isCollapsed) return undefined;
  const faixa = sel.getRangeAt(0);
  if (!raiz.contains(faixa.commonAncestorContainer)) return undefined;
  const antes = document.createRange();
  antes.selectNodeContents(raiz);
  antes.setEnd(faixa.startContainer, faixa.startOffset);
  const inicio = antes.toString().length;
  const texto = faixa.toString();
  if (!texto.trim()) return undefined;
  return { texto, inicio, fim: inicio + texto.length };
}
