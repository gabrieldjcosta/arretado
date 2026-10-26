// Modelos de ciclo (plano §5): cada um é só uma função dos pesos. A pessoa escolhe pelo nome; o
// "por quê" de cada peso vai junto para a prévia.
import type { ModeloDeCiclo } from '../../core/modelo';
import { sugerirAjustes } from './ajuste';
import {
  calcularPesos,
  limitarPeso,
  type BaseDoPeso,
  type DesempenhoDaMateria,
  type PesoCalculado,
} from './pesos';

export interface MateriaParaModelo {
  disciplinaId: string;
  nome: string;
  /** Assuntos de faixa Altíssima e Alta no plano (proxy enquanto não há incidência do TEC). */
  itensAltos: number;
  incidencia?: number;
  incidenciaMedia?: boolean;
  desempenho?: DesempenhoDaMateria;
}

export interface PesosDoModelo {
  pesos: PesoCalculado[];
  base: BaseDoPeso;
  /** Frase para a prévia quando o modelo não pôde usar o que prometia. */
  aviso?: string;
}

export const ROTULO_DO_MODELO: Record<Exclude<ModeloDeCiclo, 'manual'>, string> = {
  equilibrado: 'Equilibrado',
  reforco: 'Reforço de erros',
  reta_final: 'Reta final',
  igual: 'Igual para todas',
};

export function pesosDoModelo(
  modelo: ModeloDeCiclo,
  materias: readonly MateriaParaModelo[],
): PesosDoModelo {
  const equilibrado = calcularPesos(materias);
  if (modelo === 'igual' || modelo === 'manual') {
    return {
      base: equilibrado.base,
      pesos: materias.map((m) => ({
        disciplinaId: m.disciplinaId,
        peso: 1,
        razao: 'igual para todas',
      })),
    };
  }
  if (modelo === 'equilibrado') return equilibrado;

  const porId = new Map(materias.map((m) => [m.disciplinaId, m]));
  if (modelo === 'reta_final') {
    return {
      base: equilibrado.base,
      pesos: equilibrado.pesos.map((p) => {
        const m = porId.get(p.disciplinaId);
        const cobrada = (m?.incidencia ?? m?.itensAltos ?? 0) > 0;
        return cobrada && p.peso >= 2
          ? { ...p, peso: limitarPeso(p.peso + 1), razao: 'reta final: a prova cobra mais aqui' }
          : {
              ...p,
              peso: cobrada ? p.peso : 1,
              razao: cobrada ? p.razao : 'reta final: pouco cobrada',
            };
      }),
    };
  }

  // reforço de erros: parte do equilíbrio e sobe/desce pelo desempenho, só com amostra suficiente.
  const ajustes = new Map(
    sugerirAjustes(
      equilibrado.pesos.flatMap((p) => {
        const m = porId.get(p.disciplinaId);
        return m?.desempenho
          ? [{ disciplinaId: p.disciplinaId, nome: m.nome, peso: p.peso, desempenho: m.desempenho }]
          : [];
      }),
    ).map((s) => [s.disciplinaId, s]),
  );
  const aviso =
    ajustes.size === 0
      ? 'Ainda não há questões suficientes por matéria; usei o equilíbrio do edital.'
      : undefined;
  return {
    base: equilibrado.base,
    pesos: equilibrado.pesos.map((p) => {
      const a = ajustes.get(p.disciplinaId);
      return a ? { ...p, peso: a.para, razao: a.razao } : p;
    }),
    ...(aviso ? { aviso } : {}),
  };
}
