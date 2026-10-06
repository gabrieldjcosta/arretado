// Destaque automático (9.8): o detector, com casos tirados do corpus. O ruído por norma e as 11
// páginas inteiras ficam no `estruturador-corpus.test.ts`; a entrada hostil, no `desempenho.test.ts`.
import { detectarDestaques, type CategoriaDestaque } from './destaques';

/** Os trechos acesos, com a categoria: o que a tela mostra. */
const acesos = (texto: string): [string, CategoriaDestaque][] =>
  detectarDestaques(texto).map((d) => [texto.slice(d.inicio, d.fim), d.categoria]);

describe('destaque automático (9.8): prazos e tempo', () => {
  it.each<[string, string, [string, CategoriaDestaque][]]>([
    [
      'LEP, art. 86, § 3º',
      'Caberá ao juiz competente, no prazo de 24 (vinte e quatro) horas, a requerimento da administração',
      [['prazo de 24 (vinte e quatro) horas', 'prazo']],
    ],
    [
      'LEP, art. 9º-A, § 10',
      'deverão ser realizados, se possível, em até 30 (trinta) dias contados da recepção da amostra',
      [['até 30 (trinta) dias', 'prazo']],
    ],
    [
      'ECA, art. 108',
      'pode ser determinada pelo prazo máximo de quarenta e cinco dias.',
      [['prazo máximo de quarenta e cinco dias', 'prazo']],
    ],
    [
      'CP, art. 77',
      'A execução da pena privativa de liberdade, não superior a 2 (dois) anos, poderá ser suspensa, por 2 (dois) a 4 (quatro) anos, desde que:',
      [
        ['não superior a 2 (dois) anos', 'prazo'],
        ['2 (dois) a 4 (quatro) anos', 'prazo'],
        ['desde que', 'condicao'],
      ],
    ],
    [
      'CF, art. 7º, XXV',
      'assistência gratuita aos filhos e dependentes desde o nascimento até 5 (cinco) anos de idade',
      [['até 5 (cinco) anos de idade', 'prazo']],
    ],
    [
      'ECA, art. 162, § 2º',
      'e o Ministério Público, pelo tempo de 20 (vinte) minutos cada um, prorrogável por mais 10 (dez) minutos.',
      [
        ['20 (vinte) minutos', 'prazo'],
        ['prorrogável', 'prazo'],
        ['10 (dez) minutos', 'prazo'],
      ],
    ],
    [
      'ECA, art. 19-A, § 3º',
      'respeitará o prazo máximo de 90 (noventa) dias, prorrogável por igual período.',
      [
        ['prazo máximo de 90 (noventa) dias', 'prazo'],
        ['prorrogável por igual período', 'prazo'],
      ],
    ],
    [
      'LC-SP 988, art. 149, parágrafo único',
      'poderá ser renovado por igual período, uma única vez, a critério do Conselho Superior.',
      [
        ['por igual período', 'prazo'],
        ['a critério do', 'condicao'],
      ],
    ],
  ])('%s', (_caso, texto, esperado) => {
    expect(acesos(texto)).toEqual(esperado);
  });
});

describe('destaque automático (9.8): exceções e condições', () => {
  it.each<[string, string, [string, CategoriaDestaque][]]>([
    [
      'CF, art. 5º, XL',
      'a lei penal não retroagirá, salvo para beneficiar o réu;',
      [['salvo', 'condicao']],
    ],
    [
      'CP, art. 34, § 2º',
      'ocupações anteriores do condenado, desde que compatíveis com a execução da pena.',
      [['desde que', 'condicao']],
    ],
    [
      // "sempre que" é condição: a locução vem antes do "sempre" absoluto.
      'ECA, art. 101, § 7º',
      'como parte do processo de reintegração familiar, sempre que identificada a necessidade',
      [['sempre que', 'condicao']],
    ],
    [
      // "Somente" é absoluto; o "se" é pronome ("se procede"), não acende.
      'CP, art. 130, § 2º',
      'Somente se procede mediante representação.',
      [
        ['Somente', 'absoluto'],
        ['mediante representação', 'condicao'],
      ],
    ],
    [
      'ECA, art. 197-D, parágrafo único',
      'Caso não sejam requeridas diligências, ou sendo essas indeferidas',
      [['Caso', 'condicao']],
    ],
    [
      'CF, art. 37, XXI',
      'ressalvados os casos especificados na legislação, as obras, serviços, compras e alienações serão contratados mediante processo de licitação pública que assegure igualdade de condições a todos os concorrentes',
      [
        ['ressalvados', 'condicao'],
        ['todos', 'absoluto'],
      ],
    ],
    [
      'CP, art. 92, § 3º',
      'Em caso de reincidência da conduta prevista no inciso IV do caput deste artigo',
      [['Em caso de', 'condicao']],
    ],
  ])('%s', (_caso, texto, esperado) => {
    expect(acesos(texto)).toEqual(esperado);
  });
});

describe('destaque automático (9.8): termos absolutos', () => {
  it.each<[string, string, [string, CategoriaDestaque][]]>([
    [
      'CF, art. 5º',
      'Todos são iguais perante a lei, sem distinção de qualquer natureza',
      [
        ['Todos', 'absoluto'],
        ['de qualquer natureza', 'absoluto'],
      ],
    ],
    [
      'ECA, art. 112, § 2º',
      'Em hipótese alguma e sob pretexto algum, será admitida a prestação de trabalho forçado.',
      [['Em hipótese alguma', 'absoluto']],
    ],
    [
      'CP, art. 94, parágrafo único',
      'Negada a reabilitação, poderá ser requerida, a qualquer tempo, desde que o pedido seja instruído',
      [
        ['a qualquer tempo', 'absoluto'],
        ['desde que', 'condicao'],
      ],
    ],
    [
      'ECA, art. 59-A, parágrafo único',
      'que desenvolvem atividades com crianças e adolescentes, independentemente de recebimento de recursos públicos',
      [['independentemente', 'absoluto']],
    ],
    [
      'CF, art. 62, § 10',
      'É vedada a reedição, na mesma sessão legislativa, de medida provisória que tenha sido rejeitada ou que tenha perdido sua eficácia por decurso de prazo.',
      [['vedada', 'absoluto']],
    ],
  ])('%s', (_caso, texto, esperado) => {
    expect(acesos(texto)).toEqual(esperado);
  });
});

describe('destaque automático (9.8): penas, quóruns e frações', () => {
  it.each<[string, string, [string, CategoriaDestaque][]]>([
    [
      // O intervalo da pena inteiro, não o tempo solto ("vinte anos") de dentro dele.
      'CP, art. 121',
      'Matar alguem:\nPena - reclusão, de seis a vinte anos.',
      [['reclusão, de seis a vinte anos', 'pena']],
    ],
    [
      'CP, art. 155, § 10',
      'A pena é de reclusão, de 4 (quatro) a 10 (dez) anos, e multa, se a subtração for de',
      [
        ['reclusão, de 4 (quatro) a 10 (dez) anos', 'pena'],
        ['e multa', 'pena'],
      ],
    ],
    [
      'CP, art. 184',
      'Pena – detenção, de 3 (três) meses a 1 (um) ano, ou multa.',
      [
        ['detenção, de 3 (três) meses a 1 (um) ano', 'pena'],
        ['ou multa', 'pena'],
      ],
    ],
    [
      'CP, art. 49',
      'será, no mínimo, de 10 (dez) e, no máximo, de 360 (trezentos e sessenta) dias-multa.',
      [['360 (trezentos e sessenta) dias-multa', 'pena']],
    ],
    [
      'CP, art. 342, § 1º',
      'As penas aumentam-se de um sexto a um terço, se o crime é praticado mediante suborno',
      [['de um sexto a um terço', 'pena']],
    ],
    [
      'LEP, art. 112, IV',
      '30% (trinta por cento) da pena, se o apenado for reincidente',
      [['30% (trinta por cento)', 'pena']],
    ],
    [
      // O percentual antes da fração ("cinco décimos") que está dentro dele.
      'CF, art. 100, § 23, VIII',
      '4,5% (quatro inteiros e cinco décimos por cento) da receita corrente líquida apurada no exercício financeiro anterior',
      [['4,5% (quatro inteiros e cinco décimos por cento)', 'pena']],
    ],
    [
      'CF, art. 60, § 2º',
      'considerando-se aprovada se obtiver, em ambos, três quintos dos votos dos respectivos membros.',
      [['três quintos', 'pena']],
    ],
    [
      'CF, art. 67',
      'mediante proposta da maioria absoluta dos membros de qualquer das Casas',
      [
        ['maioria absoluta', 'pena'],
        ['qualquer', 'absoluto'],
      ],
    ],
  ])('%s', (_caso, texto, esperado) => {
    expect(acesos(texto)).toEqual(esperado);
  });
});

describe('destaque automático (9.8): o que não acende', () => {
  it.each([
    // Os genéricos que acenderiam boa parte das linhas (LEP: "é", "pode", "não", "deve").
    ['os genéricos', 'É dever do Estado, que pode e deve, quando não houver, se for o caso.'],
    ['"desde" temporal', 'Os efeitos contam-se desde a data da publicação.'],
    ['"ainda" sozinho', 'O juiz ainda decidirá sobre a questão.'],
    ['a pena privativa de liberdade', 'substitui a pena privativa de liberdade aplicada'],
    ['o todo (CP, art. 298)', 'Falsificar, no todo ou em parte, documento particular'],
    ['a data da lei', 'Lei nº 7.210, de 11 de julho de 1984, alterada em 2 de março de 2026'],
    ['o caso substantivo', 'interrompe o prazo, caso em que o reinício da contagem'],
    ['o ordinal', 'nos termos do art. 2º ano a ano'],
  ])('%s', (_caso, texto) => {
    expect(acesos(texto)).toEqual([]);
  });

  it('a hora-aula não é prazo; a fração acende (LC-SP 988, art. 59-A, § 2º)', () => {
    expect(acesos('na proporção de 4 horas-aula para cada 1/5 da jornada ordinária')).toEqual([
      ['1/5', 'pena'],
    ]);
  });

  it('"a salvo de" (CF, art. 227) não é exceção', () => {
    expect(acesos('além de colocá-los a salvo de toda forma de negligência')).toEqual([
      ['toda', 'absoluto'],
    ]);
  });

  it('um destaque nunca atravessa a quebra de linha', () => {
    expect(acesos('no prazo de\n5 (cinco) dias')).toEqual([['5 (cinco) dias', 'prazo']]);
  });

  it('texto vazio', () => {
    expect(detectarDestaques('')).toEqual([]);
  });
});

describe('destaque automático (9.8): índices e casamento', () => {
  it('casa na chave de casamento, e os índices valem no texto exibido (travessão e aspas)', () => {
    const texto = '“Pena – reclusão, de 2 (dois) a 8 (oito) anos” — salvo';
    expect(acesos(texto)).toEqual([
      ['reclusão, de 2 (dois) a 8 (oito) anos', 'pena'],
      ['salvo', 'condicao'],
    ]);
  });

  it('sem diferença de maiúsculas, com acento (flag `i`, sem `toLowerCase`)', () => {
    expect(acesos('SALVO, INDEPENDENTEMENTE, No Prazo De 5 (Cinco) Dias Úteis')).toEqual([
      ['SALVO', 'condicao'],
      ['INDEPENDENTEMENTE', 'absoluto'],
      ['Prazo De 5 (Cinco) Dias Úteis', 'prazo'],
    ]);
  });

  it('o espaço do tachado trocado por espaços liga o que vem antes e depois, como na lei', () => {
    // "prazo de [30 (trinta)] 60 (sessenta) dias": o leitor troca o tachado por espaços.
    const texto = `no prazo de ${' '.repeat(12)} 60 (sessenta) dias`;
    expect(acesos(texto)).toEqual([[texto.slice(3), 'prazo']]);
  });

  it('em ordem e sem sobreposição: as locuções antes das palavras soltas', () => {
    const texto =
      'Salvo se, em qualquer caso, no prazo de até 30 (trinta) dias, sempre que a pena de reclusão, de um a quatro anos, e multa, for aumentada de um terço até a metade.';
    const ds = detectarDestaques(texto);
    for (let i = 1; i < ds.length; i++) {
      expect(ds[i]!.inicio).toBeGreaterThanOrEqual(ds[i - 1]!.fim);
    }
    expect(acesos(texto)).toEqual([
      ['Salvo', 'condicao'],
      ['em qualquer caso', 'absoluto'],
      ['prazo de até 30 (trinta) dias', 'prazo'],
      ['sempre que', 'condicao'],
      ['reclusão, de um a quatro anos', 'pena'],
      ['e multa', 'pena'],
      ['de um terço até a metade', 'pena'],
    ]);
  });
});
