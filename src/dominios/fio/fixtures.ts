// Montadores de entrada para os testes do Fio (só testes importam este arquivo).
import type { ArtigoDoFio, EntradaDoFio, MateriaDoFio, NormaDoFio } from './tipos';

export function artigo(n: number, extra: Partial<ArtigoDoFio> = {}): ArtigoDoFio {
  return {
    endereco: `art-${String(n)}`,
    rotulo: `Art. ${String(n)}`,
    grifos: 2,
    lido: false,
    ...extra,
  };
}

/** Norma com `total` artigos (1..total); `mapa` lista os números relevantes, do que mais cai ao menos. */
export function norma(
  id: string,
  total: number,
  opcoes: {
    mapa?: readonly number[];
    semGrifo?: readonly number[];
    lidos?: readonly number[];
  } = {},
): NormaDoFio {
  const artigos = Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    const posicao = opcoes.mapa?.indexOf(n) ?? -1;
    return artigo(n, {
      grifos: opcoes.semGrifo?.includes(n) ? 0 : 2,
      lido: opcoes.lidos?.includes(n) ?? false,
      ...(posicao >= 0 ? { posicaoNoMapa: posicao } : {}),
    });
  });
  return { id, tituloCurto: id.toUpperCase(), artigos };
}

export function materia(id: string, extra: Partial<MateriaDoFio> = {}): MateriaDoFio {
  return { id, nome: `Matéria ${id}`, normas: [norma(`${id}-lei`, 40)], sumulas: [], ...extra };
}

export function entrada(extra: Partial<EntradaDoFio> = {}): EntradaDoFio {
  return {
    hoje: '2026-11-04',
    materias: [materia('penal'), materia('eca')],
    ciclo: { blocos: ['penal', 'eca'], indice: 0 },
    vencidos: 0,
    tarefas: [],
    ...extra,
  };
}

/** Marca como lidos os artigos dados (por endereço) na entrada, como o "Lido até aqui" faria. */
export function marcarLidos(
  e: EntradaDoFio,
  normaId: string,
  enderecos: readonly string[],
): EntradaDoFio {
  const lidos = new Set(enderecos);
  return {
    ...e,
    materias: e.materias.map((m) => ({
      ...m,
      normas: m.normas.map((n) =>
        n.id !== normaId
          ? n
          : {
              ...n,
              artigos: n.artigos.map((a) => (lidos.has(a.endereco) ? { ...a, lido: true } : a)),
            },
      ),
    })),
  };
}
