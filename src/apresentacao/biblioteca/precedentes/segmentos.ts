import type { TrechoChave } from '../../../core/modelo';

export interface Segmento {
  texto: string;
  /** O trecho-chave que cobre este pedaço (o primeiro, se vários). */
  trecho?: TrechoChave;
}

/** O texto cortado nos trechos-chave válidos, na ordem; sobreposição cede ao que começa antes. */
export function segmentar(texto: string, trechos: readonly TrechoChave[]): Segmento[] {
  const validos = trechos
    .filter((t) => t.status !== 'pendente' && t.fim <= texto.length)
    .sort((a, b) => a.inicio - b.inicio);
  const saida: Segmento[] = [];
  let cursor = 0;
  for (const t of validos) {
    if (t.inicio < cursor) continue;
    if (t.inicio > cursor) saida.push({ texto: texto.slice(cursor, t.inicio) });
    saida.push({ texto: texto.slice(t.inicio, t.fim), trecho: t });
    cursor = t.fim;
  }
  if (cursor < texto.length) saida.push({ texto: texto.slice(cursor) });
  return saida;
}
