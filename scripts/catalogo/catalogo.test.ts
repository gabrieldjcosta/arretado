// @vitest-environment node
import {
  CABECALHO_CONSOLIDADAS,
  CABECALHO_EDITAIS,
  CABECALHO_PRINCIPAL,
  converter,
  csvNormalizado,
  lerCsv,
  separarBlocos,
  validarComplementares,
  validarPrincipal,
} from './nucleo.mjs';

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
