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

describe('correções da revisão da etapa 6', () => {
  it('"inciso X" não é confusão e "Enunciado da Súmula" não é leitura', () => {
    expect(
      sugerirCausa({ oQueFoi: 'Não sabia o inciso X do art. 5º', resultado: 'errou' }),
    ).toBeUndefined();
    expect(
      sugerirCausa({ oQueFoi: 'Enunciado 7 da Súmula do STJ', resultado: 'errou' }),
    ).toBeUndefined();
    expect(sugerirCausa({ oQueFoi: 'Li o enunciado errado', resultado: 'errou' })).toBe('leitura');
    expect(sugerirCausa({ oQueFoi: 'Furto vs. roubo', resultado: 'errou' })).toBe('confusao');
  });
});
