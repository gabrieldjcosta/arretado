// @vitest-environment node
import {
  CABECALHO_CONSOLIDADAS,
  CABECALHO_EDITAIS,
  CABECALHO_PRINCIPAL,
  converter,
  descartar,
  faixaDerivada,
  csvNormalizado,
  lerCsv,
  separarBlocos,
  validarComplementares,
  validarPrincipal,
  dividirLinhas,
} from './nucleo.mjs';
import { dividirItem, dividirItens, limparRuido } from './dividir.mjs';

const CAB = CABECALHO_PRINCIPAL.join(',');
const URL = 'https://www.fcc.org.br/edital.pdf';
const linha = (o: Record<string, string> = {}) => {
  const base: Record<string, string> = {
    carreira: 'Defensoria Pública',
    orgao: 'DPE-SP',
    uf: 'SP',
    banca: 'FCC',
    ano_edital: '2024',
    cargo: 'Defensor Público',
    fase: 'objetiva',
    disciplina: 'Direito Penal',
    ordem_disciplina: '1',
    numero_item: '1',
    assunto: 'Princípios penais; aplicação da lei penal',
    faixa: '',
    obs_faixa: '',
    recorrencia: '3/3',
    fonte_url: URL,
  };
  return CABECALHO_PRINCIPAL.map((c) => ({ ...base, ...o })[c]).join(',');
};
const ler = (...ls: string[]) => separarBlocos([CAB, ...ls].join('\n'));
const avisos = (ls: string[]) =>
  validarPrincipal(ler(...ls).principal!)
    .filter((x) => x.nivel === 'aviso')
    .map((x) => x.regra);
const regras = (ls: string[]) =>
  validarPrincipal(ler(...ls).principal!)
    .filter((x) => x.nivel === 'erro')
    .map((x) => x.regra);

describe('catálogo: leitura', () => {
  it('lê aspas, vírgula e quebra de linha dentro de campo', () => {
    expect(lerCsv('a,"b,c","d ""e""\nf"\r\n1,2,3\n')).toEqual([
      ['a', 'b,c', 'd "e"\nf'],
      ['1', '2', '3'],
    ]);
  });

  it('extrai os blocos de uma resposta com cercas e prosa', () => {
    const texto = [
      'Segue.',
      '```csv',
      CAB,
      linha(),
      '```',
      '```csv',
      CABECALHO_CONSOLIDADAS.join(','),
      'Defensoria Pública,Direito Penal,,1,1,',
      '```',
      '```csv',
      'orgao,ano,banca,url,situação',
      `DPE-SP,2024,FCC,${URL},completo`,
      '```',
      'Lacunas: nenhuma.',
    ].join('\n');
    const b = separarBlocos(texto);
    expect(b.erros).toEqual([]);
    expect([b.principal?.length, b.consolidadas?.length, b.editais?.length]).toEqual([1, 1, 1]);
    expect(validarComplementares(b)).toEqual([]);
  });

  it('cabeçalho diferente do contrato é erro', () => {
    expect(separarBlocos('carreira;orgao\nx;y').erros[0]).toMatch(/cabeçalho não reconhecido/);
  });
});

describe('catálogo: validação do bloco principal', () => {
  it('aceita linha válida', () => {
    expect(validarPrincipal(ler(linha()).principal!)).toEqual([]);
  });

  it.each([
    ['sem fonte', linha({ fonte_url: '' }), 'fonte_url'],
    ['fonte de agregador', linha({ fonte_url: 'https://www.pciconcursos.com.br/x' }), 'fonte_url'],
    ['faixa sem base', linha({ faixa: 'Alta' }), 'faixa'],
    ['faixa inválida', linha({ faixa: 'Enorme', obs_faixa: 'x' }), 'faixa'],
    ['carreira fora da lista', linha({ carreira: 'Astronauta' }), 'carreira'],
    ['ano inválido', linha({ ano_edital: '24' }), 'ano'],
    ['fase inválida', linha({ fase: 'prática' }), 'fase'],
    ['recorrência incoerente', linha({ recorrencia: '4/3' }), 'recorrencia'],
    ['assunto vazio', linha({ assunto: '' }), 'assunto'],
    [
      'NÃO LOCALIZADO com assunto',
      linha({ disciplina: 'NÃO LOCALIZADO', assunto: 'Direito Penal' }),
      'nao_localizado',
    ],
  ])('rejeita: %s', (_nome, l, regra) => {
    expect(regras([l])).toContain(regra);
  });

  it('aceita NÃO LOCALIZADO sem assuntos', () => {
    const l = linha({
      disciplina: 'NÃO LOCALIZADO',
      ordem_disciplina: '',
      numero_item: '',
      assunto: '',
      recorrencia: '',
    });
    expect(regras([l])).toEqual([]);
  });

  it('pega duplicata e banca divergente (erro); ordem e item repetidos só avisam', () => {
    expect(regras([linha(), linha()])).toContain('duplicata');
    expect(regras([linha(), linha({ numero_item: '2', banca: 'FGV' })])).toContain('banca');
    const reinicio = [linha(), linha({ disciplina: 'Direito Civil', numero_item: '2' })];
    expect(regras(reinicio)).toEqual([]);
    expect(avisos(reinicio)).toContain('ordem');
    const item = [linha(), linha({ assunto: 'Outro assunto qualquer' })];
    expect(regras(item)).toEqual([]);
    expect(avisos(item)).toContain('item');
  });

  it('duas edições do mesmo ano (fonte_url diferente) não são duplicata', () => {
    const outra = linha({ fonte_url: 'https://www.fcc.org.br/edital-2.pdf' });
    expect(regras([linha(), outra])).toEqual([]);
  });

  it('NÃO LOCALIZADO aceito em assunto ou disciplina, com o resto vazio (inclusive ano e cargo)', () => {
    const vazio = (o: Record<string, string>) =>
      linha({
        banca: '',
        ano_edital: '',
        cargo: '',
        fase: '',
        disciplina: '',
        ordem_disciplina: '',
        numero_item: '',
        assunto: '',
        recorrencia: '',
        fonte_url: '',
        ...o,
      });
    expect(regras([vazio({ assunto: 'NÃO LOCALIZADO' })])).toEqual([]);
    expect(regras([vazio({ disciplina: 'NÃO LOCALIZADO' })])).toEqual([]);
    expect(regras([vazio({ assunto: 'NÃO LOCALIZADO', numero_item: '1' })])).toContain(
      'nao_localizado',
    );
  });

  it('avisa numero_item implausível (trecho de texto no lugar do número)', () => {
    expect(avisos([linha({ numero_item: '19421427000191' })])).toContain('numero_item');
  });

  it('UF DFT vira DF', () => {
    expect(regras([linha({ uf: 'DFT' })])).toEqual([]);
  });

  it('linha com vírgula sem aspas vira erro de colunas', () => {
    expect(regras([linha().replace('Princípios penais;', 'Princípios, penais;')])).toContain(
      'colunas',
    );
  });

  it('avisa (sem bloquear) edital antigo, subitem solto e disciplina geral sem prefixo', () => {
    const av = validarPrincipal(
      ler(
        linha({ ano_edital: '2019' }),
        linha({ numero_item: '2', assunto: 'a) algo solto' }),
        linha({ disciplina: 'Língua Portuguesa', ordem_disciplina: '2', numero_item: '1' }),
      ).principal!,
    ).filter((x) => x.nivel === 'aviso');
    expect(av.map((x) => x.regra)).toEqual(expect.arrayContaining(['ano', 'subitem']));
  });
});

describe('catálogo: normalização e conversão', () => {
  const sujo = linha({
    carreira: 'defensoria publica',
    uf: 'sp',
    fase: 'Objetiva',
    faixa: 'altissima',
    obs_faixa: '3/3 editais',
    disciplina: 'Língua Portuguesa',
  }).replace('3/3,', ' 3 / 3 ,');

  it('normaliza carreira, UF, fase, faixa, prefixo [Geral] e recorrência', () => {
    const [l] = lerCsv(csvNormalizado(ler(sujo).principal!)).slice(1);
    expect(l).toEqual(
      expect.arrayContaining([
        'Defensoria Pública',
        'SP',
        'objetiva',
        'Altíssima',
        '[Geral] Língua Portuguesa',
        '3/3',
      ]),
    );
  });

  it('o CSV normalizado volta a validar sem erro (idempotente)', () => {
    const csv = csvNormalizado(ler(sujo).principal!);
    const b = separarBlocos(csv);
    expect(validarPrincipal(b.principal!).filter((x) => x.nivel === 'erro')).toEqual([]);
    expect(csvNormalizado(b.principal!)).toBe(csv);
  });

  it('converte em editais → disciplinas → itens, com rótulo da fonte', () => {
    const b = separarBlocos(
      [
        CAB,
        linha(),
        linha({
          numero_item: '2',
          assunto: 'Teoria do crime',
          faixa: 'Alta',
          obs_faixa: '12 de 60 questões',
        }),
        linha({ disciplina: 'Direito Civil', ordem_disciplina: '2', assunto: 'Pessoas naturais' }),
        linha({
          orgao: 'DPE-BA',
          uf: 'BA',
          ano_edital: '2023',
          disciplina: 'NÃO LOCALIZADO',
          ordem_disciplina: '',
          numero_item: '',
          assunto: '',
          recorrencia: '',
        }),
      ].join('\n'),
    );
    const j = converter(b, 'Defensoria Pública');
    expect(j.slug).toBe('defensoria-publica');
    expect(j.editais).toHaveLength(2);
    const [sp, ba] = [j.editais[0], j.editais[1]];
    expect(sp?.rotulo).toBe('baseado no edital DPE-SP de 2024');
    expect(sp?.disciplinas.map((d) => d.nome)).toEqual(['Direito Penal', 'Direito Civil']);
    expect(sp?.disciplinas[0]?.itens[1]).toMatchObject({
      faixa: 'Alta',
      obsFaixa: '12 de 60 questões',
    });
    expect(ba?.situacao).toBe('NÃO LOCALIZADO');
  });
});

describe('catálogo: disciplinas consolidadas', () => {
  it('une o nome original do edital ao nome consolidado pelas variantes', () => {
    const b = separarBlocos(
      [
        '```',
        CAB,
        linha({ disciplina: 'DIREITO PENAL – PARTE GERAL' }),
        '```',
        '```',
        CABECALHO_CONSOLIDADAS.join(','),
        'Defensoria Pública,Direito Penal,DIREITO PENAL – PARTE GERAL; DIREITO PENAL,1,1,',
        '```',
      ].join('\n'),
    );
    expect(validarComplementares(b)).toEqual([]);
    const d = converter(b, 'Defensoria Pública').editais[0]?.disciplinas[0];
    expect(d).toMatchObject({ nome: 'Direito Penal', nomeNoEdital: 'DIREITO PENAL – PARTE GERAL' });
  });

  it('separa duas edições do mesmo ano no JSON', () => {
    const b = ler(linha(), linha({ fonte_url: 'https://www.fcc.org.br/edital-2.pdf' }));
    const j = converter(b, 'Defensoria Pública');
    expect(j.editais.map((e) => e.id)).toEqual([
      'dpe-sp-2024-defensor-publico-objetiva',
      'dpe-sp-2024-defensor-publico-objetiva-2',
    ]);
  });
});

describe('catálogo: descarte e faixa derivada', () => {
  it('descarta assunto fragmento e numero_item que não é numeração; mantém o resto e as linhas NÃO LOCALIZADO', () => {
    const b = ler(
      linha(),
      linha({ numero_item: '2', assunto: 'Nº' }),
      linha({ numero_item: '19421427000191', assunto: 'Razão: Eu sou o autor deste documento' }),
      linha({
        orgao: 'DPE-BA',
        ano_edital: '',
        assunto: 'NÃO LOCALIZADO',
        disciplina: '',
        numero_item: '',
        ordem_disciplina: '',
        recorrencia: '',
        fonte_url: '',
        banca: '',
        cargo: '',
        fase: '',
      }),
    );
    const { mantidas, descartadas } = descartar(b.principal!);
    expect(mantidas).toHaveLength(2);
    expect(descartadas.map((d) => d.motivo)).toEqual([
      'assunto fragmento',
      'numero_item implausível',
    ]);
  });

  it.each([
    [17, 17, 'Altíssima'],
    [14, 17, 'Alta'],
    [7, 13, 'Média'],
    [1, 17, 'Baixa'],
    [1, 2, null],
  ])('faixaDerivada(%i de %i) = %s', (p, t, esperado) => {
    expect(faixaDerivada(p, t)).toBe(esperado);
  });

  it('converter preenche faixa_sugerida vazia pela presença, marcando a origem', () => {
    const b = separarBlocos(
      [
        '```',
        CAB,
        linha(),
        '```',
        '```',
        CABECALHO_CONSOLIDADAS.join(','),
        'Defensoria Pública,Direito Penal,,10,13,',
        'Defensoria Pública,Direito Civil,,10,13,Média',
        '```',
      ].join('\n'),
    );
    const [penal, civil] = converter(b, 'Defensoria Pública').disciplinas;
    expect(penal).toMatchObject({
      faixaSugerida: 'Alta',
      faixaOrigem: 'derivada',
      faixaBase: 'presente em 10 de 13 editais',
    });
    expect(civil).toMatchObject({ faixaSugerida: 'Média', faixaOrigem: 'edital' });
  });
});

describe('catálogo: blocos complementares', () => {
  it('avisa/erra em consolidadas e editais incoerentes com o principal', () => {
    const b = separarBlocos(
      [
        '```',
        CAB,
        linha(),
        '```',
        '```',
        CABECALHO_CONSOLIDADAS.join(','),
        'Defensoria Pública,Direito Civil,,2,1,Enorme',
        '```',
        '```',
        CABECALHO_EDITAIS.join(','),
        'DPE-SP,2024,FCC,,NÃO LOCALIZADO',
        '```',
      ].join('\n'),
    );
    const r = validarComplementares(b);
    expect(r.filter((x) => x.nivel === 'erro').length).toBeGreaterThanOrEqual(3);
    expect(r.some((x) => x.nivel === 'aviso')).toBe(true);
  });
});

describe('divisão de assuntos juntados (dividir.mjs)', () => {
  it('separa marcadores numerados embutidos e dá a cada pedaço o próprio número', () => {
    const r = dividirItem(
      '17',
      'Poder Legislativo: a) Funções; b) Atos. 18. Poder Executivo: a) Presidente; b) Ministros. 19. Poder Judiciário: a) Funções',
    );
    expect(r.map((x) => x.numero)).toEqual(['17', '18', '19']);
    expect(r[1]?.assunto).toBe('Poder Executivo: a) Presidente; b) Ministros.');
  });

  it('aceita marcador composto (17.5 → 17.6, 18)', () => {
    const r = dividirItem(
      '17.5',
      'Ações prejudiciais. 17.6. Embargos à execução. 17.7. Suspensão do processo. 18. Processos nos tribunais',
    );
    expect(r.map((x) => x.numero)).toEqual(['17.5', '17.6', '17.7', '18']);
  });

  it('não confunde "art. 5." nem número fora de sequência com marcador', () => {
    const t = 'Direitos fundamentais (CF, art. 5. Liberdade de expressão). Lei 8.078. Consumidor';
    expect(dividirItem('3', t)).toHaveLength(1);
  });

  it('quebra item longo em frases, juntando títulos curtos ao assunto seguinte', () => {
    const frasesLongas = [
      'Poder Executivo.',
      'Presidente e Vice-Presidente da República: atribuições e responsabilidades.',
      'Poder Legislativo.',
      'Órgãos, funcionamento e competências do Congresso Nacional e das Casas legislativas.',
      'Processo legislativo ordinário e especial, com as espécies normativas do art. 59 da Constituição.',
      'Fiscalização contábil, financeira e orçamentária pelo Tribunal de Contas da União e pelo Congresso.',
      'Poder Judiciário: Supremo Tribunal Federal, competência originária e recursal, súmula vinculante.',
    ].join(' ');
    const r = dividirItem('9', frasesLongas);
    expect(r.length).toBeGreaterThan(2);
    expect(r.map((x) => x.numero)).toEqual(r.map((_, i) => `9.${String(i + 1)}`));
    expect(r.every((x) => x.assunto.length >= 90)).toBe(true);
    expect(r.map((x) => x.assunto).join(' ')).toBe(frasesLongas);
  });

  it('não divide item curto nem desmonta "art." no meio da frase', () => {
    expect(dividirItem('1', 'Princípios do Direito Penal; aplicação da lei penal')).toEqual([
      { numero: '1', assunto: 'Princípios do Direito Penal; aplicação da lei penal' },
    ]);
  });

  it('tira cabeçalho de página e descarta anexo do edital', () => {
    expect(
      limparRuido(
        'Edital Nº 0031/2026-DMAG retificação (9998416) SEI 8.2026.7030/000283-0 / pg. 39 Usucapião',
      ),
    ).toBe('Usucapião');
    expect(
      dividirItem(
        '44',
        'ANEXO II - MODELO DE DECLARAÇÃO DE HIPOSSUFICIÊNCIA Eu, ____, CPF ____, declaro',
      ),
    ).toEqual([]);
  });

  it('é idempotente e a divisão de linhas herda os campos e some com cópias idênticas', () => {
    const longo = Array.from(
      { length: 8 },
      (_, i) =>
        `Tópico número ${String(i + 1)} do edital com texto suficiente para passar do mínimo de um assunto.`,
    ).join(' ');
    const l = (num: string, assunto: string) => ({
      l: [
        'Defensoria Pública',
        'DPE-SP',
        'SP',
        'FCC',
        '2024',
        'Defensor',
        'objetiva',
        'Direito Penal',
        '1',
        num,
        assunto,
        'Alta',
        'base',
        '3/3',
        URL,
      ],
      n: 1,
    });
    const { mantidas } = dividirLinhas([l('2', longo), l('2', longo)]);
    expect(mantidas.length).toBeGreaterThan(2);
    expect(mantidas.every((x) => x.l[11] === 'Alta' && x.l[13] === '3/3')).toBe(true);
    const de = dividirLinhas(mantidas).mantidas;
    expect(de.map((x) => x.l)).toEqual(mantidas.map((x) => x.l));
    const itens = dividirItens([
      {
        numero: '2',
        assunto: longo,
        faixa: 'Alta',
        obsFaixa: 'base',
        recorrencia: '3/3',
        fonteUrl: URL,
      },
    ]).itens;
    expect(dividirItens(itens).itens).toEqual(itens);
  });
});
