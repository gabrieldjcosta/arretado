import { describe, expect, it } from 'vitest';
import { detectarRemissoes } from './remissoes';

const trechos = (texto: string, atual: string) =>
  detectarRemissoes(texto, atual).map((r) => ({
    t: texto.slice(r.inicio, r.fim),
    tipo: r.tipo,
    e: r.enderecos,
  }));

describe('detectarRemissoes', () => {
  it('artigo com inciso, parágrafo e alínea, na ordem da escrita', () => {
    expect(trechos('nos termos do art. 84, XIX, desta Constituição', 'art5')).toEqual([
      { t: 'art. 84, XIX', tipo: 'interna', e: ['art84.incXIX'] },
    ]);
    expect(trechos('na forma do art. 37, § 4º.', 'art5')).toEqual([
      { t: 'art. 37, § 4º', tipo: 'interna', e: ['art37.par4'] },
    ]);
    expect(trechos('previsto no art. 26, II, c', 'art5')).toEqual([
      { t: 'art. 26, II', tipo: 'interna', e: ['art26.incII'] },
    ]);
  });

  it('do item ao artigo', () => {
    expect(trechos('conforme o § 2º do art. 5º', 'art9')[0]).toMatchObject({
      t: '§ 2º do art. 5º',
      e: ['art5.par2'],
    });
    expect(trechos('o inciso II do art. 26', 'art9')[0]?.e).toEqual(['art26.incII']);
    expect(trechos('a alínea b do inciso II do art. 26', 'art9')[0]?.e).toEqual([
      'art26.incII.alB',
    ]);
  });

  it('artigo com letra e plural', () => {
    expect(trechos('o art. 9º-A', 'art1')[0]?.e).toEqual(['art9A']);
    expect(trechos('os arts. 5º e 6º', 'art1').map((r) => r.e)).toEqual([['art5'], ['art6']]);
    expect(trechos('os incisos I e II do art. 7º', 'art1').map((r) => r.e)).toEqual([
      ['art7.incI'],
      ['art7.incII'],
    ]);
  });

  it('relativas', () => {
    expect(trechos('nos casos deste artigo', 'art41.par2')).toEqual([
      { t: 'deste artigo', tipo: 'interna', e: ['art41'] },
    ]);
    expect(trechos('na hipótese do caput', 'art41.par2')[0]?.e).toEqual(['art41']);
    expect(trechos('neste parágrafo', 'art41.par2.incI')[0]?.e).toEqual(['art41.par2']);
    expect(trechos('neste parágrafo', 'art41')).toEqual([]);
    expect(trechos('os incisos I a III', 'art41.par2')[0]?.e).toEqual([
      'art41.par2.incI',
      'art41.incI',
    ]);
    expect(trechos('o § 1º', 'art41.par2')[0]?.e).toEqual(['art41.par1']);
  });

  it('bloco e outra norma', () => {
    expect(trechos('o art. 76 do ADCT', 'art5')[0]?.e).toEqual(['adct.art76']);
    expect(trechos('o art. 76', 'adct.art5')[0]?.e).toEqual(['adct.art76', 'art76']);
    expect(trechos('o art. 121 do Código Penal', 'art5')).toEqual([
      { t: 'art. 121', tipo: 'externa', e: [] },
    ]);
    expect(trechos('o art. 2º da Lei nº 8.072', 'art5')[0]?.tipo).toBe('externa');
    expect(trechos('o art. 2º desta Lei', 'art5')[0]).toMatchObject({ tipo: 'interna' });
  });

  it('não confunde texto comum', () => {
    expect(trechos('o item é comum e a alínea também', 'art1')).toEqual([]);
    expect(trechos('Art. sem número', 'art1')).toEqual([]);
    expect(trechos('', 'art1')).toEqual([]);
  });
});

describe('detectarRemissoes — entradas hostis', () => {
  it('é linear em texto grande e repetitivo', () => {
    const inicio = performance.now();
    detectarRemissoes('art. 5º, § 1º, '.repeat(60_000), 'art1');
    detectarRemissoes('arts. 1, '.repeat(100_000), 'art1');
    detectarRemissoes('§ '.repeat(300_000) + 'I, '.repeat(300_000), 'art1');
    expect(performance.now() - inicio).toBeLessThan(5000);
  });
});
