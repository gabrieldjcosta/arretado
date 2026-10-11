// Coleções aderidas (súmulas e teses): listar por espécie e achar um número ("súmula 593", "SV 11", "tese 12").
import type { Norma } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { abrirNorma, normasPublicadas } from './leitor';
import { analisarSumula, analisarTese } from './sumulas';

export type EspecieDeColecao = 'sumulas' | 'teses';

/** As coleções publicadas da espécie, em ordem de título. */
export async function colecoesPublicadas(
  repo: Repositorio,
  especie: EspecieDeColecao,
): Promise<Norma[]> {
  return (await normasPublicadas(repo)).filter((n) => n.especie === especie);
}

export interface AchadoNaColecao {
  norma: Norma;
  endereco: string;
}

/**
 * Onde o número digitado existe, entre as coleções. Texto que não é número da espécie → `[]`;
 * número solto ("11") vale para súmula comum e vinculante.
 */
export async function acharNasColecoes(
  repo: Repositorio,
  colecoes: readonly Norma[],
  especie: EspecieDeColecao,
  texto: string,
): Promise<AchadoNaColecao[]> {
  const enderecos = especie === 'sumulas' ? analisarSumula(texto) : analisarTese(texto);
  if (enderecos.length === 0) return [];
  const achados: AchadoNaColecao[] = [];
  for (const norma of colecoes) {
    const { nos } = await abrirNorma(repo, norma.id);
    const endereco = enderecos.find((e) => nos.some((n) => n.dispositivo.endereco === e));
    if (endereco !== undefined) achados.push({ norma, endereco });
  }
  return achados;
}
