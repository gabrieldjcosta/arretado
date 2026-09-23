import { completude, sugerirCausa } from './causa';

describe('causa sugerida (6.1)', () => {
  it.each([
    ['Errei o prazo de 15 dias do recurso', 'literalidade'],
    ['Não lembrava da exceção: salvo disposição em contrário', 'literalidade'],
    ['Confundi furto com roubo', 'confusao'],
    ['Achei que era competência do STF', 'confusao'],
    ['Li errado o enunciado, era INCORRETA', 'leitura'],
    ['Marquei a errada sem querer', 'leitura'],
  ] as const)('"%s" → %s', (oQueFoi, causa) => {
    expect(sugerirCausa({ oQueFoi, resultado: 'errou' })).toBe(causa);
  });

  it('sem pista e com convicção baixa sugere lacuna', () => {
    expect(
      sugerirCausa({ oQueFoi: 'Não sabia o instituto', resultado: 'errou', conviccao: 1 }),
    ).toBe('lacuna');
  });

  it('sem pista nenhuma não sugere nada', () => {
    expect(sugerirCausa({ oQueFoi: 'Questão sobre remição', resultado: 'errou' })).toBeUndefined();
  });

  it('completude: rápido até ter frase correta e causa', () => {
    expect(completude({})).toBe('rapido');
    expect(completude({ fraseCorreta: 'x' })).toBe('rapido');
    expect(completude({ fraseCorreta: 'x', causa: 'lacuna' })).toBe('completo');
  });
});
