import type { Norma } from '../../core/modelo';
import {
  anoDaNorma,
  haCriterio,
  opcoesDeFiltro,
  passaNoFiltro,
  SEM_CRITERIOS,
  tipoDaNorma,
} from './filtroDeNormas';

const norma = (campos: Partial<Norma>) => ({ tituloCurto: 'X', ...campos }) as Norma;

describe('filtro de normas', () => {
  it('ano: da referência, senão do título oficial', () => {
    expect(anoDaNorma({ referencia: '7.210/1984' })).toBe('1984');
    expect(anoDaNorma({ tituloOficial: 'LEI Nº 8.069, DE 13 DE JULHO DE 1990.' })).toBe('1990');
    expect(anoDaNorma({})).toBeUndefined();
  });

  it('tipo: sem tipo é "Outros"', () => {
    expect(tipoDaNorma({ tipo: 'Lei' })).toBe('Lei');
    expect(tipoDaNorma({})).toBe('Outros');
  });

  it('opções: anos do mais novo ao mais antigo, tipos em ordem', () => {
    const o = opcoesDeFiltro([
      norma({ tipo: 'Lei', referencia: '1/1984' }),
      norma({ tipo: 'Decreto', referencia: '2/2005' }),
      norma({}),
    ]);
    expect(o).toEqual({ anos: ['2005', '1984'], tipos: ['Decreto', 'Lei', 'Outros'] });
  });

  it('passa: ano e tipo combinam; sem critério, tudo passa', () => {
    const n = norma({ tipo: 'Lei', referencia: '1/1984' });
    expect(passaNoFiltro(n, SEM_CRITERIOS)).toBe(true);
    expect(passaNoFiltro(n, { ...SEM_CRITERIOS, ano: '1984', tipo: 'Lei' })).toBe(true);
    expect(passaNoFiltro(n, { ...SEM_CRITERIOS, ano: '2005' })).toBe(false);
    expect(passaNoFiltro(n, { ...SEM_CRITERIOS, tipo: 'Decreto' })).toBe(false);
  });

  it('há critério: busca só com espaço não conta', () => {
    expect(haCriterio({ ...SEM_CRITERIOS, busca: '  ' })).toBe(false);
    expect(haCriterio({ ...SEM_CRITERIOS, disciplina: 'Penal' })).toBe(true);
  });
});
