import { lerAto, notaVigenciaMaisRecente, tipoDaNota } from './notas';

// Formas do corpus (colados de corpus/normas/, 24/09/2026).
describe('notas de vigência (regra 7, 8.5): lei e ano', () => {
  it.each([
    ['(Redação dada pela Lei nº 13.964, de 2019)', 'Lei nº 13.964', 2019],
    ['(Redação dada pela Lei nº 7.209, de 11.7.1984)', 'Lei nº 7.209', 1984],
    ['(Vide Lei nº 8.072, de 25.7.90)', 'Lei nº 8.072', 1990],
    ['(Incluído pela Lei Complementar nº 132, de 2009).', 'Lei Complementar nº 132', 2009],
    ['(Incluído pela Emenda Constitucional nº 132, de 2023)', 'Emenda Constitucional nº 132', 2023],
    [
      '(Redação dada pela Emenda Constitucional nº 8, de 15/08/95:)',
      'Emenda Constitucional nº 8',
      1995,
    ],
    [
      '(Incluída pela Emenda Constituição Constitucional nº 58, de 2009)',
      'Emenda Constitucional nº 58',
      2009,
    ],
    [
      '(Incluído pela Emenda Constituicional nº 126, de 2022)',
      'Emenda Constitucional nº 126',
      2022,
    ],
    [
      '(Redação dada pela Emenda constitucional nº 93, de 2016)',
      'Emenda Constitucional nº 93',
      2016,
    ],
    [
      '(Redação dada pela Emenda Constitucional nº 41, 19.12.2003)',
      'Emenda Constitucional nº 41',
      2003,
    ],
    [
      '(Incluído pela Emenda Constitucional de Revisão nº 6, de 1994)',
      'Emenda Constitucional de Revisão nº 6',
      1994,
    ],
    ['(Redação dada pela Lei nº 12.033. de 2009)', 'Lei nº 12.033', 2009],
    ['(Incluído pela Lei nº 10.224, de 15 de 2001)', 'Lei nº 10.224', 2001],
    ['(Incluído pela Lei 12.550. de 2011)', 'Lei nº 12.550', 2011],
    ['(Vide Decreto-Lei nº 3.688, de 1941)', 'Decreto-Lei nº 3.688', 1941],
    [
      '(Incluído pela Medida Provisória nº 2.180-35, de 2001)',
      'Medida Provisória nº 2.180-35',
      2001,
    ],
    [
      'Inciso IX com redação dada pela Lei Complementar nº 1.098, de 25 de setembro de 2009.',
      'Lei Complementar nº 1.098',
      2009,
    ],
    [
      'Artigo 54 revogado pela Lei Complementar nº 1.315, de 11/01/2018, com efeitos a partir de 01/10/2017.',
      'Lei Complementar nº 1.315',
      2018,
    ],
  ])('%s', (texto, lei, ano) => {
    expect(lerAto(texto)).toMatchObject({ lei, ano });
  });

  it('sem ato normativo (ADI, ADPF, MI, a Constituição) ou sem ano', () => {
    expect(lerAto('(Vide ADI 7032)')).toBeUndefined();
    expect(lerAto('(Vide ADPF 1207 MC/DF)')).toBeUndefined();
    expect(lerAto('(Vide Constituição Federal)')).toBeUndefined();
    expect(lerAto('Vigência')).toBeUndefined();
    expect(lerAto('7.627')).toBeUndefined();
    expect(lerAto('(Vide Lei nº 8.072)')).toEqual({ lei: 'Lei nº 8.072', numero: 8072 });
  });
});

describe('notas de vigência (regra 7, 8.5): espécie', () => {
  it.each([
    ['(Redação dada pela Lei nº 1, de 2000)', 'redacao_dada'],
    ['(Incluído dada pela Emenda constitucional nº 93, de 2016)', 'incluido'],
    ['(Renumerado do parágrafo único, pela Emenda Constitucional nº 10, de 1996)', 'renumerado'],
    ['(Revogado pela Lei nº 9.455, de 7.4.1997', 'revogado'],
    ['(Vide ADI 7032)', 'vide'],
    ['(Produção de efeito)', 'vigencia'],
    ['Produção de efeitos', 'vigencia'],
    ['(Expressão substituída pela Lei nº 12.010, de 2009)', 'expressao'],
    ['(Expressão declarada inconstitucional pela ADIN 869)', 'expressao'],
    ['(NR)', 'nr'],
    [
      'Inciso X renumerado para inciso XI pela Lei Complementar nº 1.295, de 02/01/2017.',
      'renumerado',
    ],
    [
      'Parágrafo único transformado em § 1º pela Lei Complementar nº 1.295, de 02/01/2017.',
      'renumerado',
    ],
    ['"Caput" acrescentado pela Lei Complementar nº 1.434, de 11/09/2025.', 'incluido'],
    ['Artigo 234 declarado inconstitucional, em controle concentrado, pelo STF.', 'outra'],
    ['7.627', 'outra'],
  ])('%s → %s', (texto, tipo) => {
    expect(tipoDaNota(texto)).toBe(tipo);
  });
});

describe('notas de vigência (regra 7, 8.5): a mais recente', () => {
  const n = (texto: string) => ({ texto, tipo: tipoDaNota(texto) });

  it('o maior ano; no mesmo ano, a data completa e depois o número; "Vide", "Regulamento" e "Vigência" não contam', () => {
    expect(
      notaVigenciaMaisRecente([
        n('(Redação dada pela Lei nº 12.015, de 2009)'),
        n('(Incluído pela Lei nº 13.964, de 2019)'),
        n('(Vide Lei Complementar nº 230, de 2026)'),
        n('(Regulamento)'),
        n('(Incluído pela Lei nº 13.869, de 2019)'),
      ]),
    ).toEqual({ lei: 'Lei nº 13.964', ano: 2019 });
    expect(
      notaVigenciaMaisRecente([
        n('(Redação dada pela Lei nº 13.008, de 26.6.2014)'),
        n('(Incluído pela Lei nº 13.104, de 2014)'),
      ]),
    ).toEqual({ lei: 'Lei nº 13.008', ano: 2014 });
    expect(notaVigenciaMaisRecente([n('(Vide ADI 7032)'), n('Vigência')])).toBeUndefined();
  });
});
