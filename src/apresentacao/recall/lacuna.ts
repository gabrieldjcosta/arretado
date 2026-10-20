import type { Intervalo } from '../../core/modelo';

const PALAVRA = /[\p{L}\p{N}]/u;

/** Alarga o intervalo até as bordas das palavras e tira os espaços das pontas. */
export function ajustarAPalavras(texto: string, { inicio, fim }: Intervalo): Intervalo | null {
  let i = Math.max(0, inicio);
  let f = Math.min(texto.length, fim);
  while (i < f && /\s/.test(texto[i] ?? '')) i++;
  while (f > i && /\s/.test(texto[f - 1] ?? '')) f--;
  while (i > 0 && PALAVRA.test(texto[i] ?? '') && PALAVRA.test(texto[i - 1] ?? '')) i--;
  while (f < texto.length && PALAVRA.test(texto[f - 1] ?? '') && PALAVRA.test(texto[f] ?? '')) f++;
  return f > i ? { inicio: i, fim: f } : null;
}

/** O offset de um ponto da seleção no texto, pelos `data-inicio` dos pedaços. */
function deslocamento(raiz: HTMLElement, no: Node, offset: number): number | null {
  if (no.nodeType === Node.TEXT_NODE) {
    const el = no.parentElement?.closest<HTMLElement>('[data-inicio]');
    return el && raiz.contains(el) ? Number(el.dataset.inicio) + offset : null;
  }
  if (no === raiz) {
    const filho = raiz.children[offset] as HTMLElement | undefined;
    return filho ? Number(filho.dataset.inicio) : Number(raiz.dataset.tamanho);
  }
  const el = (no as Element).closest<HTMLElement>('[data-inicio]');
  if (!el || !raiz.contains(el)) return null;
  return Number(el.dataset.inicio) + (offset > 0 ? el.textContent.length : 0);
}

/** A seleção atual dentro de `raiz`, como intervalo do texto (ou null). */
export function selecaoNoEditor(raiz: HTMLElement, texto: string): Intervalo | null {
  const s = window.getSelection();
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null;
  const faixa = s.getRangeAt(0);
  const a = deslocamento(raiz, faixa.startContainer, faixa.startOffset);
  const b = deslocamento(raiz, faixa.endContainer, faixa.endOffset);
  if (a === null || b === null) return null;
  return ajustarAPalavras(texto, { inicio: Math.min(a, b), fim: Math.max(a, b) });
}
