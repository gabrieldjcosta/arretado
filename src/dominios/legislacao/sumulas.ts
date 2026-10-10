// Súmulas (acervo, Peça 4): endereço canônico, rótulo e a leitura de "súmula 593", "SV 11" na busca.
// Cada coleção é uma `Norma` com `especie: 'sumulas'`; cada súmula é um dispositivo `sumula` na raiz.
import { analisarEndereco, dobrar } from './busca';
import { chaveDeCasamento } from './normalizacao';

/** `s593` (súmula) e `sv11` (súmula vinculante). */
export const enderecoDeSumula = (numero: number, vinculante: boolean): string =>
  `${vinculante ? 'sv' : 's'}${String(numero)}`;

/** "Súmula 593", "Súmula Vinculante 11". */
export const rotuloDeSumula = (numero: number, vinculante: boolean): string =>
  `Súmula${vinculante ? ' Vinculante' : ''} ${String(numero)}`;

const NUMERO = String.raw`(\d{1,4})`;
const VINCULANTE = new RegExp(
  String.raw`^(?:sumula\s+vinculante|sv)\.?\s*(?:n[o]?\.?\s*)?${NUMERO}$`,
  'u',
);
const COMUM = new RegExp(String.raw`^(?:sumula|sum\.?|s)\.?\s*(?:n[o]?\.?\s*)?${NUMERO}$`, 'u');
const SOLTO = new RegExp(String.raw`^${NUMERO}$`, 'u');

/**
 * Endereços possíveis para o que a pessoa digitou numa coleção de súmulas: "súmula 593" → `s593`;
 * "SV 11" e "súmula vinculante 11" → `sv11`; "11" sozinho → `s11` e `sv11` (a coleção tem uma das duas
 * formas, ou as duas; vale a primeira que existir). Vazio se o texto não é um número de súmula.
 */
export function analisarSumula(texto: string): string[] {
  const dobrado = dobrar(chaveDeCasamento(texto))
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/[.;:]$/u, '');
  const vinculante = VINCULANTE.exec(dobrado);
  if (vinculante) return [`sv${String(Number(vinculante[1]))}`];
  const comum = COMUM.exec(dobrado);
  if (comum) return [`s${String(Number(comum[1]))}`];
  const solto = SOLTO.exec(dobrado);
  if (solto) return [`s${String(Number(solto[1]))}`, `sv${String(Number(solto[1]))}`];
  return [];
}

/** Os endereços de artigo e os de súmula que o texto pode ser; o leitor procura o primeiro que a norma tem. */
export const possiveisEnderecos = (texto: string): string[] => [
  ...analisarEndereco(texto),
  ...analisarSumula(texto),
];
