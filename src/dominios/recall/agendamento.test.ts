import { agendar, INTERVALOS, intervaloDaCaixa } from './agendamento';

describe('agendamento em 6 caixas (6.5)', () => {
  it('intervalos 1, 3, 7, 15, 30, 60', () => {
    expect(INTERVALOS).toEqual([1, 3, 7, 15, 30, 60]);
    expect([1, 2, 3, 4, 5, 6].map(intervaloDaCaixa)).toEqual([1, 3, 7, 15, 30, 60]);
  });

  it.each([
    // caixa, resposta, caixaDepois, próxima (a partir de 2026-09-23)
    [1, 'facil', 2, '2026-09-26'],
    [2, 'facil', 3, '2026-09-30'],
    [5, 'facil', 6, '2026-11-22'],
    [6, 'facil', 6, '2026-11-22'],
    [4, 'dificil', 4, '2026-10-08'],
    [1, 'dificil', 1, '2026-09-24'],
    [6, 'errei', 1, '2026-09-24'],
    [3, 'errei', 1, '2026-09-24'],
  ] as const)('caixa %i + %s → caixa %i, próxima %s', (caixa, resposta, caixaDepois, proxima) => {
    expect(agendar({ caixa, proximaRevisao: '2026-09-23' }, resposta, '2026-09-23')).toEqual({
      caixaDepois,
      proximaDepois: proxima,
      atrasoDias: 0,
    });
  });

  it('atraso não penaliza: atrasado revisado como fácil sobe normalmente', () => {
    expect(agendar({ caixa: 2, proximaRevisao: '2026-09-10' }, 'facil', '2026-09-23')).toEqual({
      caixaDepois: 3,
      proximaDepois: '2026-09-30',
      atrasoDias: 13,
    });
  });

  it('revisão antecipada não tem atraso negativo', () => {
    expect(
      agendar({ caixa: 2, proximaRevisao: '2026-09-30' }, 'facil', '2026-09-23').atrasoDias,
    ).toBe(0);
  });
});
