import { somarDias } from '../../core/datas';
import { agendar, agendarFrase, INTERVALOS, intervaloDaCaixa } from './agendamento';

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

describe('agendamento de frases (Frases 2)', () => {
  it('"de novo" volta amanhã; "li" sobe um degrau a cada leitura', () => {
    expect(agendarFrase({ proximaRevisao: '2026-09-23' }, 'de_novo', '2026-09-23')).toEqual({
      proximaDepois: '2026-09-24',
      atrasoDias: 0,
    });
    // Nunca revisada: anterior = 1 → próximo degrau = 3.
    expect(agendarFrase({ proximaRevisao: '2026-09-23' }, 'li', '2026-09-23').proximaDepois).toBe(
      '2026-09-26',
    );
    // Última revisão em 09-23, marcada para 09-26 (3 dias) → 7.
    expect(
      agendarFrase(
        { proximaRevisao: '2026-09-26', ultimaRevisao: '2026-09-23T15:00:00.000Z' },
        'li',
        '2026-09-26',
      ).proximaDepois,
    ).toBe('2026-10-03');
  });

  it('no último degrau fica em 60 dias; atraso não penaliza', () => {
    const r = agendarFrase(
      { proximaRevisao: '2026-09-01', ultimaRevisao: '2026-07-03T15:00:00.000Z' },
      'li',
      '2026-09-10',
    );
    expect(r).toEqual({ proximaDepois: '2026-11-09', atrasoDias: 9 });
  });
});

describe('a prova no centro (AP-03)', () => {
  const HOJE = '2026-10-25';
  const emDias = (n: number) => somarDias(HOJE, n);
  const estado = { caixa: 5, proximaRevisao: HOJE };

  it.each([77, 30, 7])('com a prova em %i dias, nenhuma Revisão cai depois dela', (horizonte) => {
    const prova = { data: emDias(horizonte) };
    for (const caixa of [1, 2, 3, 4, 5, 6]) {
      for (const resposta of ['errei', 'dificil', 'facil'] as const) {
        const { proximaDepois } = agendar({ caixa, proximaRevisao: HOJE }, resposta, HOJE, prova);
        expect(proximaDepois <= prova.data).toBe(true);
        expect(proximaDepois >= emDias(1)).toBe(true);
      }
    }
    const frase = agendarFrase(
      { proximaRevisao: HOJE, ultimaRevisao: '2026-09-01T12:00:00Z' },
      'li',
      HOJE,
      prova,
    );
    expect(frase.proximaDepois <= prova.data).toBe(true);
  });

  it('a caixa 6 (60 dias) com prova em 30 dias fica antes da prova, não em 60', () => {
    const { proximaDepois } = agendar(estado, 'facil', HOJE, { data: emDias(30) });
    expect(proximaDepois).toBe(emDias(29));
  });

  it('Altíssima e Alta passam de novo uma semana antes da prova; Média só é limitada', () => {
    const data = emDias(77);
    expect(agendar(estado, 'facil', HOJE, { data, faixa: 'altissima' }).proximaDepois).toBe(
      emDias(60),
    );
    // Prova em 40 dias: o intervalo de 60 passaria dela; a faixa alta volta no dia 33.
    expect(agendar(estado, 'facil', HOJE, { data: emDias(40), faixa: 'alta' }).proximaDepois).toBe(
      emDias(33),
    );
    expect(agendar(estado, 'facil', HOJE, { data: emDias(40), faixa: 'media' }).proximaDepois).toBe(
      emDias(39),
    );
  });

  it('sem prova, com prova hoje ou já passada, nada muda', () => {
    const base = agendar(estado, 'facil', HOJE);
    expect(base.proximaDepois).toBe(emDias(60));
    expect(agendar(estado, 'facil', HOJE, undefined)).toEqual(base);
    expect(agendar(estado, 'facil', HOJE, { data: HOJE })).toEqual(base);
    expect(agendar(estado, 'facil', HOJE, { data: emDias(-3) })).toEqual(base);
  });

  it('prova amanhã: a Revisão vai para amanhã, nunca para depois', () => {
    expect(agendar(estado, 'facil', HOJE, { data: emDias(1) }).proximaDepois).toBe(emDias(1));
  });
});
