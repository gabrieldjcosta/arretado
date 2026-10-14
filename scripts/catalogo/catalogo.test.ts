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

  it('pega duplicata, ordem repetida, item com dois assuntos e banca divergente', () => {
    expect(regras([linha(), linha()])).toContain('duplicata');
    expect(regras([linha(), linha({ disciplina: 'Direito Civil', numero_item: '2' })])).toContain(
      'ordem',
    );
    expect(regras([linha(), linha({ assunto: 'Outro assunto qualquer' })])).toContain('item');
    expect(regras([linha(), linha({ numero_item: '2', banca: 'FGV' })])).toContain('banca');
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
