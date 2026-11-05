import { beforeEach, describe, expect, it } from 'vitest';
import {
  esquecerBuscas,
  lembrarBusca,
  MAXIMO_DE_BUSCAS,
  reiniciarUltimasBuscas,
  ultimasBuscas,
} from './ultimas-buscas';

describe('últimas buscas da lista de normas', () => {
  beforeEach(() => {
    reiniciarUltimasBuscas();
  });

  it('começa vazia', () => {
    expect(ultimasBuscas()).toEqual([]);
  });

  it('põe a mais nova primeiro e não repete, sem diferenciar a caixa', () => {
    lembrarBusca('LEP');
    lembrarBusca('Lei 8.112');
    expect(lembrarBusca('lep')).toEqual(['lep', 'Lei 8.112']);
  });

  it('tira o espaço sobrando e ignora o que tem menos de duas letras', () => {
    lembrarBusca('  Lei   Maria  da Penha ');
    lembrarBusca('a');
    lembrarBusca('   ');
    expect(ultimasBuscas()).toEqual(['Lei Maria da Penha']);
  });

  it('guarda só as últimas', () => {
    for (const q of ['um um', 'dois', 'três', 'quatro', 'cinco']) lembrarBusca(q);
    expect(ultimasBuscas()).toHaveLength(MAXIMO_DE_BUSCAS);
    expect(ultimasBuscas()[0]).toBe('cinco');
    expect(ultimasBuscas()).not.toContain('um um');
  });

  it('lembra entre aberturas e esquece quando mandado', () => {
    lembrarBusca('Estatuto');
    expect(window.localStorage.getItem('arretado:normas:ultimas-buscas:v1')).toContain('Estatuto');
    expect(esquecerBuscas()).toEqual([]);
    expect(ultimasBuscas()).toEqual([]);
  });
});
