import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { esquecerVolta, passouTempoFora, voltouDeLonge } from './volta';

describe('passouTempoFora', () => {
  it('só conta a partir de 3 dias', () => {
    expect(passouTempoFora('2026-11-02', '2026-11-04')).toBe(false);
    expect(passouTempoFora('2026-11-01', '2026-11-04')).toBe(true);
    expect(passouTempoFora(null, '2026-11-04')).toBe(false);
    expect(passouTempoFora('lixo', '2026-11-04')).toBe(false);
  });
});

describe('voltouDeLonge', () => {
  beforeEach(() => {
    window.localStorage.clear();
    esquecerVolta();
  });
  afterEach(() => {
    window.localStorage.clear();
    esquecerVolta();
  });
  it('primeira vez não floresce e grava o dia', () => {
    expect(voltouDeLonge(new Date(2026, 10, 4))).toBe(false);
    expect(window.localStorage.getItem('arretado:ultima-visita:v1')).toBe('2026-11-04');
  });
  it('depois de dias fora, floresce até recarregar', () => {
    window.localStorage.setItem('arretado:ultima-visita:v1', '2026-10-28');
    expect(voltouDeLonge(new Date(2026, 10, 4))).toBe(true);
    expect(voltouDeLonge(new Date(2026, 10, 4))).toBe(true);
  });
});
