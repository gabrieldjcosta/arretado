// Onde a pessoa está no Ciclo (plano §6). Não é gravado: sai das Sessões encerradas do Ciclo e dos
// blocos pulados, em ordem de tempo. Pular e trocar de lugar são neutros: nada fica "atrasado".

export interface MarcaDeBloco {
  /** Instante em que o bloco foi feito ou pulado. */
  em: string;
  blocoOrdem: number;
}

export interface PosicaoNoCiclo {
  /** Bloco atual (índice em `blocos`). */
  indice: number;
  /** Volta atual, a partir de 1. */
  volta: number;
}

// shortcut: um bloco feito fora de ordem faz o ciclo seguir a partir dele; subir se a pessoa pedir
// para voltar ao bloco que ficou para trás.
export function posicaoNoCiclo(
  totalDeBlocos: number,
  marcas: readonly MarcaDeBloco[],
): PosicaoNoCiclo {
  let indice = 0;
  let volta = 1;
  for (const m of [...marcas].sort((a, b) => a.em.localeCompare(b.em))) {
    if (m.blocoOrdem >= totalDeBlocos) continue;
    const proximo = m.blocoOrdem + 1;
    if (proximo >= totalDeBlocos) {
      indice = 0;
      volta += 1;
    } else indice = proximo;
  }
  return { indice, volta };
}
