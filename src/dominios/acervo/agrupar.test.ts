import type { EntradaDoIndice } from './esquemas';
import { agrupar, filtrarEntradas, SEM_DISCIPLINA, tamanhoLegivel } from './agrupar';

const e = (id: string, grupo: string, disciplinas: string[], tipo = 'norma'): EntradaDoIndice =>
  ({
    id,
    tipo,
    titulo: id.toUpperCase(),
    grupo,
    vinculos: disciplinas.map((disciplina) => ({ disciplina })),
    avisos: [],
    tamanho: 10,
    versao: 1,
    hash: 'a'.repeat(64),
    coletadoEm: '2026-10-10',
  }) as EntradaDoIndice;

describe('agrupar o acervo', () => {
  const itens = [
    e('a', 'Leis', ['Penal', 'Civil']),
    e('b', 'Decretos', []),
    e('c', 'Leis', ['Civil']),
  ];

  it('por disciplina: repete o item em cada uma, "Sem disciplina" por último', () => {
    const g = agrupar(itens, 'disciplina');
    expect(g.map((x) => x.titulo)).toEqual(['Civil', 'Penal', SEM_DISCIPLINA]);
    expect(g[0]?.itens.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('por tipo: pelo grupo', () => {
    expect(agrupar(itens, 'tipo').map((x) => x.titulo)).toEqual(['Decretos', 'Leis']);
  });

  it('busca sem acento nem caixa, por tipo', () => {
    expect(filtrarEntradas(itens, 'norma', 'CIVIL').map((i) => i.id)).toEqual(['a', 'c']);
    expect(filtrarEntradas(itens, 'sumulas', '')).toEqual([]);
  });

  it('tamanho legível', () => {
    expect(tamanhoLegivel(500)).toBe('500 B');
    expect(tamanhoLegivel(2048)).toBe('2 KB');
    expect(tamanhoLegivel(1572864)).toBe('1,5 MB');
  });
});
