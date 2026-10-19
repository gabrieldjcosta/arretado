// Gera os blocos de uma volta a partir dos pesos (plano §5): maior resto primeiro, sem repetir a
// mesma matéria em blocos vizinhos sempre que for possível.
import type { PesoCalculado } from './pesos';

export interface BlocoGerado {
  disciplinaId: string;
  minutos: number;
}

export function gerarBlocos(pesos: readonly PesoCalculado[], minutos: number): BlocoGerado[] {
  const restante = new Map(pesos.map((p) => [p.disciplinaId, p.peso]));
  const ordem = pesos.map((p) => p.disciplinaId);
  const blocos: BlocoGerado[] = [];
  let ultima: string | undefined;
  while ([...restante.values()].some((n) => n > 0)) {
    const candidatas = ordem.filter((id) => (restante.get(id) ?? 0) > 0);
    // shortcut: se só sobrou a mesma matéria, ela repete; sem alternar pesada/leve (não há dado), subir se houver.
    const escolhida = candidatas
      .filter((id) => id !== ultima || candidatas.length === 1)
      .reduce((a, b) => ((restante.get(b) ?? 0) > (restante.get(a) ?? 0) ? b : a));
    restante.set(escolhida, (restante.get(escolhida) ?? 0) - 1);
    blocos.push({ disciplinaId: escolhida, minutos });
    ultima = escolhida;
  }
  return blocos;
}

/** Quantas voltas cabem numa semana com `horas` de estudo (informativo para a prévia). */
export function voltasPorSemana(blocos: readonly BlocoGerado[], horas: number): number {
  const total = blocos.reduce((s, b) => s + b.minutos, 0);
  return total > 0 ? (horas * 60) / total : 0;
}
