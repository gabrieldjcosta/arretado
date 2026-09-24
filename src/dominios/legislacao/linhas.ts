// Linhas do estruturador (F2, 8.2): o bloco normalizado com o texto, a chave de casamento e o
// sinal de tachado que as regras 2–13 consultam. Bloco vazio não vira linha, mas o índice `i`
// continua o do `Bloco[]` da entrada, que é o que as `FaixaDeLinhas` guardam.
import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import { chaveDeCasamento } from './normalizacao';

export interface Linha {
  /** Índice do bloco na entrada. */
  i: number;
  trechos: Trecho[];
  /** Texto normalizado, como exibido. */
  texto: string;
  /** `chaveDeCasamento(texto)`: onde as regex casam; mesmos índices do texto. */
  chave: string;
  /**
   * Redação anterior: há tachado e, fora dele, só sobra de rótulo ("A~~rt. 76.~~", "III ~~- …~~",
   * "c~~) …~~"), numeral romano ou nota ("(Revogado pela…)", "Vigência"). A 8.6 refina.
   */
  tachada: boolean;
}

/** Blocos normalizados (regra 1) → linhas não vazias, na ordem. */
export function prepararLinhas(blocos: readonly Bloco[]): Linha[] {
  const linhas: Linha[] = [];
  blocos.forEach((bloco, i) => {
    const texto = bloco.trechos.map((t) => t.texto).join('');
    if (!/\S/.test(texto)) return;
    linhas.push({
      i,
      trechos: bloco.trechos,
      texto,
      chave: chaveDeCasamento(texto),
      tachada: ehTachada(bloco.trechos),
    });
  });
  return linhas;
}

const GRUPO_ENTRE_PARENTESES = /\((?:[^()]|\([^()]*\))*\)/g;
const ROMANO_SOLTO = /(?<!\p{L})[IVXLCDM]+(?!\p{L})/gu;

function ehTachada(trechos: readonly Trecho[]): boolean {
  if (!trechos.some((t) => t.tachado && /\S/.test(t.texto))) return false;
  const fora = trechos
    .filter((t) => !t.tachado)
    .map((t) => t.texto)
    .join(' ')
    .replace(GRUPO_ENTRE_PARENTESES, ' ')
    .replace(/\b(?:Vigência|Regulamento)\b/gu, ' ')
    .replace(ROMANO_SOLTO, ' ');
  return !/\p{L}{2,}/u.test(fora);
}

/** Recorte dos trechos entre dois índices do texto da linha, com a formatação de cada pedaço. */
export function recortar(trechos: readonly Trecho[], inicio: number, fim: number): Trecho[] {
  const saida: Trecho[] = [];
  let pos = 0;
  for (const t of trechos) {
    const a = Math.max(inicio, pos);
    const b = Math.min(fim, pos + t.texto.length);
    if (a < b) saida.push({ ...t, texto: t.texto.slice(a - pos, b - pos) });
    pos += t.texto.length;
  }
  return saida;
}

/** Primeiro link entre dois índices do texto da linha. */
export function linkEntre(
  trechos: readonly Trecho[],
  inicio: number,
  fim: number,
): string | undefined {
  return recortar(trechos, inicio, fim).find((t) => t.link)?.link;
}

/** Junta linhas num texto só (nome do nó em duas linhas, preâmbulo da ALESP), com um espaço entre elas. */
export function juntarTrechos(partes: readonly Trecho[][]): Trecho[] {
  const saida: Trecho[] = [];
  partes.forEach((trechos, n) => {
    if (n > 0 && trechos.length > 0) saida.push({ texto: ' ' });
    acrescentar(saida, trechos);
  });
  return aparar(saida);
}

/** `push(...itens)` estoura a pilha com centenas de milhares de itens (página hostil). */
export function acrescentar<T>(destino: T[], itens: readonly T[]): void {
  for (const x of itens) destino.push(x);
}

/** Tira os espaços das pontas (o recorte antes de uma nota deixa o espaço no fim). */
export function aparar(trechos: readonly Trecho[]): Trecho[] {
  const saida = trechos.map((t) => ({ ...t }));
  while (saida.length > 0) {
    const t = saida[0];
    if (t === undefined) break;
    t.texto = t.texto.replace(/^\s+/, '');
    if (t.texto !== '') break;
    saida.shift();
  }
  while (saida.length > 0) {
    const t = saida[saida.length - 1];
    if (t === undefined) break;
    t.texto = t.texto.replace(/\s+$/, '');
    if (t.texto !== '') break;
    saida.pop();
  }
  return saida;
}

export const textoDe = (trechos: readonly Trecho[]) => trechos.map((t) => t.texto).join('');

/** Só maiúsculas (ao menos duas letras): nome de nó do Planalto, título "CÓDIGO PENAL". */
export const ehCaixaAlta = (texto: string) =>
  !/\p{Ll}/u.test(texto) && /\p{Lu}.*\p{Lu}/u.test(texto);
