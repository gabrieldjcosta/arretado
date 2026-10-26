// Peso de cada matéria no Ciclo (domínio puro; plano em planos/trilha-adaptavel-e-ciclos.md §3).
// Peso = quantas vezes a matéria aparece por volta, de 1 a 4. Cada peso sai com o "por quê".

export const PESO_MIN = 1;
export const PESO_MAX = 4;

export interface DesempenhoDaMateria {
  erros: number;
  questoes: number;
}

export interface EntradaDeMateria {
  disciplinaId: string;
  /** Participação na prova (0 a 1, tabela do recorte). Só vale se todas as matérias a trouxerem. */
  incidencia?: number;
  /** A parcela é a média das outras matérias: a tabela não cita esta. */
  incidenciaMedia?: boolean;
  /** Proxy do catálogo: assuntos de faixa Altíssima e Alta. */
  itensAltos: number;
  /** Ajuste manual: vence sempre. */
  pesoManual?: number;
}

export type BaseDoPeso = 'incidencia' | 'edital';

export interface PesoCalculado {
  disciplinaId: string;
  peso: number;
  razao: string;
}

export const limitarPeso = (n: number) => Math.min(PESO_MAX, Math.max(PESO_MIN, Math.round(n)));

/** Taxa de erro suavizada (a erros e b questões imaginários): pouca amostra mexe pouco. */
export function taxaDeErro({ erros, questoes }: DesempenhoDaMateria, a = 1, b = 4): number {
  return (erros + a) / (questoes + b);
}

/** Base pela incidência quando todas a trazem; senão pelos assuntos altos do edital. */
export function calcularPesos(materias: readonly EntradaDeMateria[]): {
  base: BaseDoPeso;
  pesos: PesoCalculado[];
} {
  const porIncidencia = materias.length > 0 && materias.every((m) => (m.incidencia ?? 0) > 0);
  const base: BaseDoPeso = porIncidencia ? 'incidencia' : 'edital';
  const medida = (m: EntradaDeMateria) => (porIncidencia ? (m.incidencia ?? 0) : m.itensAltos);
  const total = materias.reduce((s, m) => s + medida(m), 0);
  const origem = porIncidencia ? 'peso pelas questões da banca' : 'peso estimado pelo edital';

  const pesos = materias.map((m): PesoCalculado => {
    if (m.pesoManual !== undefined) {
      return { disciplinaId: m.disciplinaId, peso: limitarPeso(m.pesoManual), razao: 'ajuste seu' };
    }
    // Participação relativa à média: quem tem o dobro da média aparece 2 vezes.
    const relativo = total > 0 ? (medida(m) / total) * materias.length : 1;
    return {
      disciplinaId: m.disciplinaId,
      peso: limitarPeso(relativo),
      razao: porIncidencia && m.incidenciaMedia ? 'sem dado da banca: peso médio' : origem,
    };
  });
  return { base, pesos };
}
