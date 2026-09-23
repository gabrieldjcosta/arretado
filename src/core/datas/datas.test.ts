import { dataCivil, diferencaEmDias, horaCivil, somarDias } from './index';

describe('datas civis (T14)', () => {
  it('às 22 h de Brasília ainda é o mesmo dia, embora já seja amanhã em UTC', () => {
    const instante = new Date('2026-09-24T01:00:00.000Z'); // 22:00 de 23/09 em Brasília
    expect(dataCivil(instante)).toBe('2026-09-23');
    expect(dataCivil(instante, 'UTC')).toBe('2026-09-24');
  });

  it('soma dias atravessando mês e ano bissexto', () => {
    expect(somarDias('2026-09-30', 1)).toBe('2026-10-01');
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(somarDias('2026-12-31', 60)).toBe('2027-03-01');
    expect(somarDias('2026-01-10', -10)).toBe('2025-12-31');
  });

  it('diferença em dias', () => {
    expect(diferencaEmDias('2026-09-23', '2026-10-23')).toBe(30);
    expect(diferencaEmDias('2026-09-23', '2026-09-20')).toBe(-3);
  });
});

describe('horaCivil', () => {
  it('usa o fuso de Brasília', () => {
    expect(horaCivil(new Date('2026-09-24T01:05:00.000Z'))).toBe('22:05');
  });
});
