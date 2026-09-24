import { sanitizarHtml, textoParaBlocos, type Bloco } from '../../core/seguranca/sanitizador';
import { chaveDeCasamento, normalizar, normalizarBlocos } from './normalizacao';

const L = 'https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm';

function trechos(...lista: Bloco['trechos']): Bloco[] {
  return [{ trechos: lista }];
}

function unico(blocos: Bloco[]): Bloco['trechos'] {
  return normalizarBlocos(blocos).blocos[0]?.trechos ?? [];
}

// Casos do corpus (corpus/normas/*.colado.*) e da página de origem (entidades, bytes windows-1252).
describe('normalização (8.1): entidades, controle e invisíveis', () => {
  it.each([
    ['XVI &#150; atestado de pena a cumprir', 'XVI – atestado de pena a cumprir'], // lep.html, art. 41
    [
      'A pena do feminici&#769;dio e&#769; aumentada', // cp.html, art. 121-A, § 2º
      'A pena do feminicídio é aumentada',
    ],
    [
      'Artigo 1&#176; - Esta lei complementar disp&otilde;e sobre', // lc-sp-988.html
      'Artigo 1º - Esta lei complementar dispõe sobre',
    ],
    ['Lei n&ordm; 7.210 &sect; 1&ordm;', 'Lei nº 7.210 § 1º'],
    ['&Agrave; &yuml; &ldquo;x&rdquo; &minus;', 'À ÿ “x” −'],
    ['a&nbsp;&nbsp;b&#x2014;c', 'a b—c'],
  ])('%s', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado);
  });

  it('decodifica numa passada só e deixa como está o que não é referência completa', () => {
    expect(normalizar('&amp;nbsp; &foo; &amp sem ponto e vírgula')).toBe(
      '&nbsp; &foo; &amp sem ponto e vírgula',
    );
  });

  it('referência inválida vira U+FFFD e conta como caractere perdido', () => {
    const r = normalizarBlocos(trechos({ texto: 'a&#0;b&#xD800;c' }));
    expect(r.blocos[0]?.trechos[0]?.texto).toBe('a\uFFFDb\uFFFDc');
    expect(r.relatorio.perdidos).toBe(2);
    expect(r.relatorio.entidades).toBe(2);
  });

  it('C1 solto segue o windows-1252 (byte 0x96 lido como latin1); C0 e invisíveis somem', () => {
    expect(normalizar('I \u0096 a primazia da dignidade')).toBe('I – a primazia da dignidade'); // lc80, art. 3º-A, I
    expect(normalizar('\u0093Caput\u0094 \u0081x')).toBe('“Caput” x');
    expect(normalizar('\uFEFFArt.\u200B 1\u200Dº\u0007 A\u2060 lei')).toBe('Art. 1º A lei');
  });

  it('acento decomposto vira composto (NFC), nunca NFKC (º e ª ficam)', () => {
    const r = normalizar('Da\u0300 instaurac\u0327a\u0303o, 1º e 2ª');
    expect(r).toBe('Dà instauração, 1º e 2ª');
    expect(r).toBe(r.normalize('NFC'));
  });
});

describe('normalização (8.1): hífen suave', () => {
  it.each([
    [
      'A remoção a pedido far\u00ADse\u00ADá mediante requerimento',
      'A remoção a pedido far-se-á mediante requerimento',
    ], // lc80, art. 37
    ['III - salário\u00ADfamília;', 'III - salário-família;'], // lc80, art. 39, III
    [
      'sala especial de Estado\u00ADMaior, com direito',
      'sala especial de Estado-Maior, com direito',
    ], // lc80, art. 44, III
    ['II - desincumbir\u00ADse das tarefas', 'II - desincumbir-se das tarefas'], // lc80, art. 8º, II
  ])('no Planalto é hífen verdadeiro: %s', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado);
  });

  it('a LC 80 inteira decide por hífen (ênclise, mesóclise, maiúscula)', () => {
    const r = normalizarBlocos(
      [
        'far\u00ADse\u00ADá',
        'salário\u00ADfamília',
        'político\u00ADpartidária',
        'Estado\u00ADMaior',
        'desincumbir\u00ADse',
      ].map((texto) => ({ trechos: [{ texto }] })),
    );
    expect(r.blocos.map((b) => b.trechos[0]?.texto)).toEqual([
      'far-se-á',
      'salário-família',
      'político-partidária',
      'Estado-Maior',
      'desincumbir-se',
    ]);
    expect(r.relatorio).toMatchObject({ hifensSuaves: 6, hifenSuave: 'hifen' });
  });

  it('no lugar do hífen de rótulo, vira hífen; na ponta do bloco ou junto de outro hífen, some', () => {
    expect(normalizar('Art. 9º\u00ADA. O condenado incumbindo\u00ADlhe')).toBe(
      'Art. 9º-A. O condenado incumbindo-lhe',
    );
    expect(normalizar('\u00ADtexto e\u00AD-lhe\u00AD')).toBe('texto e-lhe');
    // Também junto de U+2010 e U+2011, que são o próprio hífen (revisão da 8.1).
    const [suave, hifen, inseparavel] = [0xad, 0x2010, 0x2011].map((c) => String.fromCharCode(c));
    expect(normalizar(`Estado${hifen}${suave}Maior e far${suave}${inseparavel}se`)).toBe(
      'Estado-Maior e far-se',
    );
  });

  it('hifenização silábica (Word, PDF) some, decidida pela norma inteira', () => {
    const r = normalizarBlocos([
      {
        trechos: [
          {
            texto:
              'A De\u00ADfen\u00ADso\u00ADria Pú\u00ADbli\u00ADca é ins\u00ADti\u00ADtui\u00ADção',
          },
        ],
      },
      {
        trechos: [{ texto: 'per\u00ADma\u00ADnen\u00ADte, in\u00ADcum\u00ADbin\u00ADdo\u00ADlhe' }],
      },
    ]);
    expect(r.blocos.map((b) => b.trechos[0]?.texto)).toEqual([
      'A Defensoria Pública é instituição',
      'permanente, incumbindolhe',
    ]);
    expect(r.relatorio).toMatchObject({ hifensSuaves: 15, hifenSuave: 'silabico' });
  });

  it('U+2010 e U+2011 são o próprio hífen; travessões e "--" ficam como vieram', () => {
    expect(normalizar('Estado\u2010Maior, Procuradoria\u2011Geral')).toBe(
      'Estado-Maior, Procuradoria-Geral',
    );
    expect(normalizar('Pena – reclusão — de 20 (vinte) anos')).toBe(
      'Pena – reclusão — de 20 (vinte) anos',
    );
    expect(normalizar('Defensor Público--Geral; aplicando- sê-lhes')).toBe(
      'Defensor Público--Geral; aplicando- sê-lhes',
    );
  });
});

describe('normalização (8.1): espaços e fim de linha', () => {
  it('colapsa e apara atravessando trechos; o espaço fica com a formatação comum aos vizinhos', () => {
    // cp, art. 13, § 1º: espaço com ênfase entre o rótulo e o traço.
    expect(
      unico(
        trechos(
          { texto: '§ 1º' },
          { texto: ' ', enfase: true },
          { texto: '- A superveniência de causa exclui a imputação.  ' },
          { texto: '(Incluído pela Lei nº 7.209, de 11.7.1984)', link: L },
        ),
      ),
    ).toEqual([
      { texto: '§ 1º - A superveniência de causa exclui a imputação. ' },
      { texto: '(Incluído pela Lei nº 7.209, de 11.7.1984)', link: L },
    ]);
    // cp-compilado, rubrica do art. 1º: trecho só de espaço na ponta.
    expect(unico(trechos({ texto: ' ' }, { texto: 'Anterioridade da Lei', enfase: true }))).toEqual(
      [{ texto: 'Anterioridade da Lei', enfase: true }],
    );
    expect(
      unico(
        trechos(
          { texto: 'abc', tachado: true, enfase: true },
          { texto: ' ', tachado: true },
          { texto: 'def', tachado: true },
        ),
      ),
    ).toEqual([
      { texto: 'abc', tachado: true, enfase: true },
      { texto: ' def', tachado: true },
    ]);
    expect(
      unico(trechos({ texto: 'antes', tachado: true }, { texto: '  ' }, { texto: 'depois' })),
    ).toEqual([{ texto: 'antes', tachado: true }, { texto: ' depois' }]);
  });

  it('espaços especiais e quebras dentro do bloco viram um espaço', () => {
    expect(
      normalizar(' \tParágrafo\u00A0único.\u2003Nas\r\nfaltas\u2028graves,\u202F\u3000aplicam-se '),
    ).toBe('Parágrafo único. Nas faltas graves, aplicam-se');
  });

  it('mantém o índice de cada bloco: o que fica vazio continua na lista', () => {
    const r = normalizarBlocos([
      { trechos: [{ texto: '\u200B ' }] },
      { trechos: [{ texto: 'Art. 1o A lei' }] },
    ]);
    expect(r.blocos).toEqual([{ trechos: [] }, { trechos: [{ texto: 'Art. 1º A lei' }] }]);
  });

  it('CRLF, CR e LF dão os mesmos blocos, no texto puro e no HTML', () => {
    const esperado = normalizarBlocos(
      textoParaBlocos('Art. 1º A lei.\n\nArt. 2º O juiz.\n'),
    ).blocos;
    for (const quebra of ['\r\n', '\r', '\n']) {
      const texto = `Art. 1º A lei.${quebra}${quebra}Art. 2º O juiz.${quebra}`;
      expect(normalizarBlocos(textoParaBlocos(texto)).blocos).toEqual(esperado);
      const html = `<p>Art. 1º${quebra}A lei.</p>${quebra}<p>Art. 2º O${quebra}juiz.</p>`;
      expect(normalizarBlocos(sanitizarHtml(html).blocos).blocos).toEqual(esperado);
    }
    // U+2028 e U+2029 (quebra de linha do Word) também separam linhas no texto puro.
    expect(
      normalizarBlocos(textoParaBlocos('Art. 1º A lei.\u2028Art. 2º O juiz.\u2029')).blocos,
    ).toEqual(esperado);
  });
});

describe('normalização (8.1): ordinais', () => {
  it.each([
    [
      '§ 3 o As tarefas a que se refere o § 1 o serão atribuídas',
      '§ 3º As tarefas a que se refere o § 1º serão atribuídas',
    ], // cp, art. 46, § 3º (txt)
    [
      '§ 4 o O disposto nos §§ 1 o , 2 o e 3 o não se aplica',
      '§ 4º O disposto nos §§ 1º , 2º e 3º não se aplica',
    ], // cp, art. 184, § 4º
    [
      '§ 10. Nos casos previstos nos §§ 1 o a 3 o deste artigo',
      '§ 10. Nos casos previstos nos §§ 1º a 3º deste artigo',
    ], // cp, art. 129, § 10
    ['Art. 6 o São direitos sociais a educação', 'Art. 6º São direitos sociais a educação'], // cf, art. 6º (tachado)
    [
      'na forma dos arts. 153, § 5 o ; 157, I; l58, I e II',
      'na forma dos arts. 153, § 5º ; 157, I; l58, I e II',
    ], // cf, ADCT, art. 76
    ['§ 1o. Nessa hipótese, incumbirá à entidade', '§ 1º. Nessa hipótese, incumbirá à entidade'], // lep, art. 34, § 1º
    [
      'previstos no art. 1o da Lei no 8.072, de 25 de julho de 1990',
      'previstos no art. 1º da Lei nº 8.072, de 25 de julho de 1990',
    ], // lep, art. 9º-A
    [
      'DECRETO-LEI No 2.848, DE 7 DE DEZEMBRO DE 1940',
      'DECRETO-LEI Nº 2.848, DE 7 DE DEZEMBRO DE 1940',
    ], // cp, epígrafe
    ['Artigo 1° - Esta lei complementar dispõe', 'Artigo 1º - Esta lei complementar dispõe'], // lc-sp-988, art. 1º
    [
      'LEI COMPLEMENTAR N° 988, DE 09 DE JANEIRO DE 2006',
      'LEI COMPLEMENTAR Nº 988, DE 09 DE JANEIRO DE 2006',
    ], // lc-sp-988, epígrafe
    ['os ascendentes e descendentes em 1° grau.', 'os ascendentes e descendentes em 1º grau.'], // lc-sp-988, art. 138
    [
      '- Artigo 54 revogado pela Lei Complementar n° 1.050',
      '- Artigo 54 revogado pela Lei Complementar nº 1.050',
    ], // forma das notas da lc-sp-988
    ['§ 3 º - O erro quanto à pessoa', '§ 3º - O erro quanto à pessoa'], // cp, art. 20, § 3º
    ['Art. 9o-A. O condenado', 'Art. 9º-A. O condenado'],
    ['o recurso para a 2a instância', 'o recurso para a 2ª instância'],
    ['Art. 1ᵒ e o 2˚ da 3ᵃ Região', 'Art. 1º e o 2º da 3ª Região'],
  ])('%s', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado);
  });

  it.each([
    '§ 2.º A remuneração dos Deputados Estaduais', // cf, art. 27, § 2º: "N.º" é grafia da fonte
    'Art. 2º. No dia 7 de setembro de 1993 o eleitorado definirá', // cf, ADCT
    'na forma prevista nos artigos 77 a 82 do Código Penal.', // lep, art. 156
    'Art. 13 O agente que, voluntariamente, desiste', // cp, redação de 1940 (tachada)
    'Art. 52. A prática de fato previsto como crime doloso', // lep, art. 52
    'Art. 1º - A execução penal tem por objetivo', // lep, art. 1º: o espaço separa separador de sufixo
    'III - apresentar, no 1º (primeiro) trimestre de cada ano', // lep, art. 70: contração
    'contados nos 15 (quinze) dias seguintes',
    'água a 37°C e ângulo de 1,5°',
    'Carlos De’Carli - Carlos Sant’Anna', // cf, signatários
    'a prática da tortura , o tráfico ilícito', // cf, art. 5º, XLIII
    'c ) os nascidos no estrangeiro', // cf, art. 12, I, c
    'Il - faz ou mantém o cultivo de plantas', // cp, art. 281 (tachado): não se corrige a fonte
  ])('fica como está: %s', (texto) => {
    expect(normalizar(texto)).toBe(texto);
  });

  it('o <s>º</s> decorativo da LC 80 segue a formatação do número', () => {
    expect(
      unico(
        trechos(
          { texto: 'Art. 1' },
          { texto: 'º', tachado: true },
          { texto: ' A Defensoria Pública é instituição permanente' },
        ),
      ),
    ).toEqual([{ texto: 'Art. 1º A Defensoria Pública é instituição permanente' }]);
    expect(
      unico(
        trechos(
          { texto: 'Art. 3' },
          { texto: 'º', tachado: true },
          { texto: '-A. São objetivos da Defensoria Pública:' },
        ),
      ),
    ).toEqual([{ texto: 'Art. 3º-A. São objetivos da Defensoria Pública:' }]);
    expect(
      unico(
        trechos(
          { texto: 'I – Defensor Público Federal de 2' },
          { texto: 'ª', tachado: true },
          { texto: ' Categoria (inicial);' },
        ),
      ),
    ).toEqual([{ texto: 'I – Defensor Público Federal de 2ª Categoria (inicial);' }]);
    expect(
      unico(
        trechos(
          { texto: ' inciso LXXIV do art. 5', link: L },
          { texto: 'º', tachado: true, link: L },
          { texto: ' da Constituição Federal', link: L },
        ),
      ),
    ).toEqual([{ texto: 'inciso LXXIV do art. 5º da Constituição Federal', link: L }]);
    expect(
      unico(
        trechos(
          { texto: 'Lei n', link: L },
          { texto: 'º', tachado: true, link: L },
          { texto: ' 8.112, de 1990', link: L },
        ),
      ),
    ).toEqual([{ texto: 'Lei nº 8.112, de 1990', link: L }]);
  });

  it('o <sup><u>o</u></sup> e o <strong>º</strong> do Planalto também', () => {
    expect(
      unico(
        trechos(
          { texto: 'Art. 6' },
          { texto: 'o', enfase: true },
          { texto: ' A classificação será feita' },
        ),
      ),
    ).toEqual([{ texto: 'Art. 6º A classificação será feita' }]); // lep, art. 6º
    expect(
      unico(
        trechos(
          { texto: 'Art. 1' },
          { texto: 'º', enfase: true },
          { texto: ' - Não há crime sem lei anterior' },
        ),
      ),
    ).toEqual([{ texto: 'Art. 1º - Não há crime sem lei anterior' }]); // cp-compilado, art. 1º
    expect(
      unico(
        trechos(
          { texto: '§ 3 ' },
          { texto: 'o ', enfase: true },
          { texto: 'As tarefas a que se refere o § 1 ' },
          { texto: 'o ', enfase: true },
          { texto: 'serão atribuídas' },
        ),
      ),
    ).toEqual([{ texto: '§ 3º As tarefas a que se refere o § 1º serão atribuídas' }]); // cp, art. 46, § 3º
  });

  it('no parágrafo tachado de verdade o ordinal continua tachado', () => {
    expect(
      unico(
        trechos(
          { texto: '§ 9 ', tachado: true },
          { texto: 'o ', tachado: true, enfase: true },
          { texto: 'Se a lesão for praticada', tachado: true },
        ),
      ),
    ).toEqual([{ texto: '§ 9º Se a lesão for praticada', tachado: true }]); // cp, art. 129, § 9º
    expect(
      unico(
        trechos(
          { texto: 'Art. 9', tachado: true },
          { texto: 'o', tachado: true, enfase: true },
          { texto: '-A. Os condenados', tachado: true },
        ),
      ),
    ).toEqual([{ texto: 'Art. 9º-A. Os condenados', tachado: true }]); // lep, art. 9º-A
  });

  it('não junta o que não é ordinal depois de número', () => {
    // lc-sp-988, art. 90 e art. 134 (o espaço fica com a formatação comum aos vizinhos: nenhuma).
    expect(
      unico(trechos({ texto: '1. ', enfase: true }, { texto: 'o exercício de estágio' })),
    ).toEqual([{ texto: '1.', enfase: true }, { texto: ' o exercício de estágio' }]);
    expect(
      unico(
        trechos(
          { texto: 'X ', tachado: true },
          { texto: 'XI -', enfase: true },
          { texto: ' outras previstas em lei.' },
        ),
      ),
    ).toEqual([
      { texto: 'X', tachado: true },
      { texto: ' ' },
      { texto: 'XI -', enfase: true },
      { texto: ' outras previstas em lei.' },
    ]);
  });

  it('o relatório conta as trocas de ordinal, inclusive as só de formatação', () => {
    const r = normalizarBlocos([
      ...trechos({ texto: 'Art. 1' }, { texto: 'º', tachado: true }, { texto: ' A lei' }),
      ...trechos({ texto: 'Art. 2º O juiz e o § 3 o' }),
    ]);
    expect(r.relatorio.ordinais).toBe(2);
  });
});

describe('chave de casamento (8.1)', () => {
  it('unifica travessões e aspas sem mudar o comprimento', () => {
    const texto = 'I – a “Caput” — d’água ‘x’ «y» 1′ 2″ a−b \u2010 \u2011 ‒ ― ﹘ ﹣ － ´ `';
    const chave = chaveDeCasamento(texto);
    expect(chave).toBe("I - a \"Caput\" - d'água 'x' \"y\" 1' 2\" a-b - - - - - - - ' '");
    expect(chave).toHaveLength(texto.length);
  });

  it('não mexe no resto (º, ª, §, acentos, espaço antes de pontuação)', () => {
    const texto = 'Art. 9º-A. § 2.º da 2ª Região , c ) Público--Geral';
    expect(chaveDeCasamento(texto)).toBe(texto);
  });
});

describe('idempotência (8.1)', () => {
  it('normalizar duas vezes dá o mesmo resultado', () => {
    for (const texto of [
      '§ 4 o O disposto nos §§ 1 o , 2 o e 3 o não se aplica',
      'far\u00ADse\u00ADá  &#150; Artigo 1&#176;',
      'Lei no 8.072 e N° 988, 2a instância',
    ]) {
      const uma = normalizar(texto);
      expect(normalizar(uma)).toBe(uma);
    }
  });
});

describe('correções da revisão da 8.1', () => {
  const [SH, AGUDO] = [0xad, 0x301].map((c) => String.fromCharCode(c));

  it.each([
    'declividade superior a 45°, equivalente a 100% (cem por cento)', // Código Florestal, art. 4º, V
    'inclinação entre 25° e 45°, serão permitidos', // Código Florestal, art. 11
    'latitude 23°32′S e ângulo de 90°',
    'O disposto nesta Lei nos 2 (dois) primeiros anos de vigência',
    'aplicando-se esta Lei no 1º (primeiro) exercício financeiro',
    'na forma do item 1a) do anexo',
  ])('grau de verdade e contração ficam como estão: %s', (texto) => {
    expect(normalizar(texto)).toBe(texto);
  });

  it.each([
    ['Lei n o 8.069, de 13 de julho de 1990', 'Lei nº 8.069, de 13 de julho de 1990'], // ECA (sup com espaço)
    ['Decreto Legislativo n o 1, de 1992', 'Decreto Legislativo nº 1, de 1992'],
    ['Lei n.° 7.347 e § 2.° - Ocorrido o parto', 'Lei n.º 7.347 e § 2.º - Ocorrido o parto'], // Lei 10.261/68 (ALESP)
    ['Lei n.o 8.078 e arts. n.os 1 e 2', 'Lei n.º 8.078 e arts. n.ºs 1 e 2'],
    ['da 1a, 2a e 3a Regiões; capital da 3a.', 'da 1ª, 2ª e 3ª Regiões; capital da 3ª.'],
  ])('%s', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado);
  });

  it('o "o" com espaço num trecho próprio também vira º (ECA, art. 37)', () => {
    expect(
      unico(trechos({ texto: 'Lei n ' }, { texto: 'o', enfase: true }, { texto: ' 10.406' })),
    ).toEqual([{ texto: 'Lei nº 10.406' }]);
  });

  it('o espaço ao lado do ordinal corrigido não quebra tachado nem link', () => {
    expect(
      unico(
        trechos(
          { texto: 'Art. 1', tachado: true },
          { texto: 'º' },
          { texto: ' A lei', tachado: true },
        ),
      ),
    ).toEqual([{ texto: 'Art. 1º A lei', tachado: true }]);
    expect(
      unico(trechos({ texto: 'Lei n', link: L }, { texto: 'o' }, { texto: ' 8.072', link: L })),
    ).toEqual([{ texto: 'Lei nº 8.072', link: L }]);
  });

  it('a saída é sempre NFC: marca órfã no começo e acento depois de hífen suave silábico', () => {
    const orfa = normalizar(`${AGUDO}abc`);
    expect(orfa).toBe(orfa.normalize('NFC'));
    const r = normalizarBlocos(
      trechos({ texto: `De${SH}fen${SH}so${SH}ria Pu${SH}bli${SH}ca, e${SH}${AGUDO}` }),
    );
    expect(r.blocos[0]?.trechos[0]?.texto).toBe('Defensoria Publica, é');
    expect(r.relatorio.hifenSuave).toBe('silabico');
  });

  it('hífen suave separado da ponta só por espaço e outro hífen suave some', () => {
    expect(normalizar(`${SH} ${SH}texto`)).toBe('texto');
    expect(normalizar(`texto${SH} ${SH}`)).toBe('texto');
    expect(normalizar(`I ${SH} texto`)).toBe('I - texto');
  });

  it('composto em minúscula conta como hífen quando a palavra existe solta na norma', () => {
    const r = normalizarBlocos(
      [
        `auxílio${SH}doença, salário${SH}maternidade, auxílio${SH}acidente e salário${SH}família`,
        'a doença, a maternidade, o acidente e a família',
      ].map((texto) => ({ trechos: [{ texto }] })),
    );
    expect(r.blocos[0]?.trechos[0]?.texto).toBe(
      'auxílio-doença, salário-maternidade, auxílio-acidente e salário-família',
    );
    expect(r.relatorio.hifenSuave).toBe('hifen');
  });
});
