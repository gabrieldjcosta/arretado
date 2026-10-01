// A métrica da regressão do corpus (8.9) com rascunhos montados à mão: cada divergência derruba a
// métrica do jeito certo, e as regras de exceção aceitam o caso da página e recusam o parecido. Um
// dispositivo de cada forma de endereço (bloco, parágrafo único, alínea, sufixo).
import type { Bloco, Trecho } from '../core/seguranca/sanitizador';
import { estruturar } from '../dominios/legislacao/estruturador';
import { dispositivosDe, type Gabarito } from './gabarito';
import {
  compararComGabarito,
  compararComLinhaDeBase,
  ehRedacaoDeSufixoSemHifen,
  gabaritosPendentes,
  descreverDivergencia,
  LIMITE_DE_DIVERGENCIAS,
  linhaDoPortao,
  linhaDoRelatorio,
  milhar,
  percentual,
  redacoesEsperadas,
  resumoDasDivergencias,
  type DispositivoMedido,
  type Motivo,
} from './metrica';

type GabaritoMedido = Pick<Gabarito, 'dispositivos' | 'casos' | 'amostra' | 'contagens'>;

/** Gabarito pequeno: 7 dispositivos, 3 redações (1 no ancestral), 1 na amostra. */
function gabarito(): GabaritoMedido {
  return {
    dispositivos: [
      { endereco: 'art1', status: 'vigente', notas: 1, redacoes: 1 },
      { endereco: 'art1.parUnico', status: 'vigente', notas: 0, redacoes: 0 },
      { endereco: 'art1.incI', status: 'vigente', notas: 0, redacoes: 0 },
      { endereco: 'art1.incI.alA', status: 'vigente', notas: 0, redacoes: 0 },
      { endereco: 'art9A', status: 'revogado', notas: 1, redacoes: 2 },
      { endereco: 'art9A.par1', status: 'revogado', notas: 0, redacoes: 0 },
      { endereco: 'adct.art1', status: 'vetado', notas: 0, redacoes: 0 },
    ],
    contagens: { redacoesAnteriores: 3, redacoesNoAncestral: 1 },
    casos: [],
    amostra: [
      {
        endereco: 'art1',
        status: 'vigente',
        texto: 'Art. 1o Esta Lei vale , , no dia 1º.',
        notas: ['(Redação dada pela Lei nº 1, de 2000)'],
      },
    ],
  };
}

const d = (
  endereco: string,
  status: string,
  {
    notas = [],
    redacoes = [],
    texto = '',
    noAncestral = 0,
    renumerado = false,
  }: Partial<Omit<DispositivoMedido, 'textosDasRedacoes'> & { redacoes: string[] }> = {},
): DispositivoMedido => ({
  endereco,
  status,
  renumerado,
  texto,
  notas,
  textosDasRedacoes: redacoes,
  noAncestral,
});

/** O rascunho que bate com `gabarito()` (o texto com outra pontuação e o ordinal de outro jeito). */
function rascunho(): DispositivoMedido[] {
  return [
    d('art1', 'vigente', {
      texto: 'Art. 1º Esta Lei vale no dia 1o',
      notas: ['(Redação dada pela Lei n o 1, de 2000)'],
      redacoes: ['Art. 1º Texto antigo.'],
    }),
    d('art1.parUnico', 'vigente'),
    d('art1.incI', 'vigente'),
    d('art1.incI.alA', 'vigente'),
    d('art9A', 'revogado', {
      notas: ['(Revogado pela Lei nº 2, de 2001)'],
      redacoes: ['Art. 9º-A Texto.', '§ 2º Parágrafo que foi para o artigo.'],
      noAncestral: 1,
    }),
    d('art9A.par1', 'revogado'),
    d('adct.art1', 'vetado', { texto: '(VETADO)' }),
  ];
}

const medir = (
  dispositivos: DispositivoMedido[],
  g: GabaritoMedido = gabarito(),
  anomalias: { tipo: 'endereco_duplicado' | 'duplicata'; endereco?: string }[] = [],
) => compararComGabarito({ dispositivos, anomalias }, g);

/** Troca um dispositivo do rascunho pelo endereço. */
function com(endereco: string, novo: Partial<DispositivoMedido>): DispositivoMedido[] {
  return rascunho().map((x) => (x.endereco === endereco ? { ...x, ...novo } : x));
}

describe('compararComGabarito (8.9)', () => {
  it('rascunho igual ao gabarito: 100%, sem duplicados, todas as redações', () => {
    const m = medir(rascunho());
    expect(m).toMatchObject({
      compilada: false,
      total: 7,
      resumidos: 0,
      aMais: 0,
      corretos: 7,
      percentual: 100,
      duplicados: [],
      divergencias: [],
      renumerados: [],
    });
    expect(m.redacoes).toEqual({
      esperadas: 3,
      lidas: 3,
      noEnderecoCerto: 3,
      dispositivosIguais: 7,
      noAncestral: { esperadas: 1, lidas: 1 },
      tachadoParcial: 0,
      sufixoSemHifen: 0,
      percentual: 100,
      completas: true,
    });
  });

  it('status trocado: um correto a menos', () => {
    const m = medir(com('art9A.par1', { status: 'vigente' }));
    expect([m.corretos, m.total]).toEqual([6, 7]);
    expect(m.percentual).toBeCloseTo((100 * 6) / 7);
    expect(m.divergencias).toEqual([{ endereco: 'art9A.par1', motivos: ['status'] }]);
    expect(m.redacoes?.completas).toBe(true);
  });

  it('uma redação a menos: os dispositivos continuam corretos, as redações não', () => {
    const m = medir(com('art9A', { textosDasRedacoes: ['Art. 9º-A Texto.'] }));
    expect(m.corretos).toBe(7);
    expect(m.divergencias).toEqual([{ endereco: 'art9A', motivos: ['redacoes'] }]);
    expect(m.redacoes).toMatchObject({
      esperadas: 3,
      lidas: 2,
      noEnderecoCerto: 2,
      dispositivosIguais: 6,
      completas: false,
    });
    expect(m.redacoes?.percentual).toBeCloseTo((100 * 2) / 3);
  });

  it('redação no endereço errado ou a mais: não completa, mesmo com o total certo', () => {
    // A redação do art. 1º foi para o parágrafo único: 3 lidas, só 2 no endereço certo.
    const trocada = medir(
      rascunho().map((x) =>
        x.endereco === 'art1'
          ? { ...x, textosDasRedacoes: [] }
          : x.endereco === 'art1.parUnico'
            ? { ...x, textosDasRedacoes: ['Parágrafo único. Antigo.'] }
            : x,
      ),
    );
    expect(trocada.redacoes).toMatchObject({ lidas: 3, noEnderecoCerto: 2, completas: false });
    expect(trocada.divergencias.map((e) => e.endereco)).toEqual(['art1', 'art1.parUnico']);
    const aMais = medir(com('art1.incI', { textosDasRedacoes: ['I - antigo;'] }));
    expect(aMais.redacoes).toMatchObject({ lidas: 4, noEnderecoCerto: 3, completas: false });
  });

  it('redação no ancestral fora da conta: não completa', () => {
    const m = medir(com('art9A', { noAncestral: 0 }));
    expect(m.redacoes).toMatchObject({ noAncestral: { esperadas: 1, lidas: 0 }, completas: false });
    expect(m.redacoes?.percentual).toBe(100);
  });

  it('endereço repetido: duplicado, pela lista e pelo conflito `endereco_duplicado`, uma vez cada', () => {
    const repetido = [...rascunho(), d('art1.parUnico', 'vigente')];
    expect(medir(repetido).duplicados).toEqual(['art1.parUnico']);
    // O primeiro com o endereço é o que se compara: o repetido não tira o correto.
    expect(medir(repetido).corretos).toBe(7);
    const anomalias = [
      { tipo: 'endereco_duplicado' as const, endereco: 'art1.parUnico' },
      { tipo: 'endereco_duplicado' as const, endereco: 'art1.incI' },
      // A `duplicata` (repetido sem tachado, já fundido: vale o último) não é duplicado.
      { tipo: 'duplicata' as const, endereco: 'art1' },
    ];
    expect(medir(repetido, gabarito(), anomalias).duplicados).toEqual([
      'art1.parUnico',
      'art1.incI',
    ]);
  });

  it('texto da amostra diferente: diverge no texto; pontuação, espaço e ordinal não contam', () => {
    expect(medir(rascunho()).corretos).toBe(7);
    const m = medir(com('art1', { texto: 'Art. 1º Esta Lei vale no dia 2.' }));
    expect(m.divergencias).toEqual([{ endereco: 'art1', motivos: ['texto'] }]);
    expect(m.corretos).toBe(6);
    // Fora da amostra, o texto não se compara.
    expect(medir(com('art1.incI', { texto: 'Outro texto.' })).corretos).toBe(7);
  });

  it('notas: a contagem em todos e o texto na amostra', () => {
    const menos = medir(com('art9A', { notas: [] }));
    expect(menos.divergencias).toEqual([{ endereco: 'art9A', motivos: ['notas'] }]);
    const outra = medir(com('art1', { notas: ['(Incluído pela Lei nº 1, de 2000)'] }));
    expect(outra.divergencias).toEqual([{ endereco: 'art1', motivos: ['notas'] }]);
  });

  it('dispositivo ausente e dispositivo a mais: os dois tiram do percentual', () => {
    const sem = medir(rascunho().filter((x) => x.endereco !== 'art1.incI.alA'));
    expect(sem).toMatchObject({ total: 7, corretos: 6, aMais: 0 });
    expect(sem.divergencias).toEqual([{ endereco: 'art1.incI.alA', motivos: ['ausente'] }]);
    const mais = medir([...rascunho(), d('art1.incI.alB', 'vigente')]);
    expect(mais).toMatchObject({ total: 7, corretos: 7, aMais: 1 });
    expect(mais.percentual).toBeCloseTo((100 * 7) / 8);
    expect(mais.divergencias).toEqual([{ endereco: 'art1.incI.alB', motivos: ['a_mais'] }]);
  });

  it('a lista inteira na métrica; a mensagem cortada em LIMITE_DE_DIVERGENCIAS, com o resto', () => {
    const g = gabarito();
    for (let k = 0; k < 30; k++)
      g.dispositivos.push({
        endereco: `art${String(k + 10)}`,
        status: 'vigente',
        notas: 0,
        redacoes: 0,
      });
    const m = medir(rascunho(), g);
    expect(m.divergencias).toHaveLength(30);
    expect(resumoDasDivergencias(m).split('\n')).toEqual([
      ...Array.from({ length: LIMITE_DE_DIVERGENCIAS }, (_, k) => `art${String(k + 10)}: ausente`),
      '… e mais 10',
    ]);
    expect(descreverDivergencia({ endereco: 'art1', motivos: ['status', 'notas'] })).toBe(
      'art1: status, notas',
    );
  });

  it('renumerado (regra 10): vigente para o gabarito, e listado à parte para a linha de base', () => {
    // O gabarito não lê a renumeração: o renumerado é `vigente` nele e continua correto.
    const m = medir(com('art1.parUnico', { renumerado: true }));
    expect(m).toMatchObject({ corretos: 7, divergencias: [], renumerados: ['art1.parUnico'] });
    expect(medir(rascunho()).renumerados).toEqual([]);
  });
});

describe('regra (a): tachado parcial', () => {
  // ECA, art. 21: "O ~~pátrio poder~~ poder familiar…"; o gabarito conta a linha como redação.
  const comCaso = (caso: { tipo: string; endereco?: string }): GabaritoMedido => {
    const g = gabarito();
    g.dispositivos[1] = { endereco: 'art1.parUnico', status: 'vigente', notas: 0, redacoes: 1 };
    g.contagens.redacoesAnteriores = 4;
    g.casos = [caso];
    return g;
  };

  it('o caso `tachado-parcial` tira a linha da conta do gabarito', () => {
    const m = medir(rascunho(), comCaso({ tipo: 'tachado-parcial', endereco: 'art1.parUnico' }));
    expect(m.redacoes).toMatchObject({ esperadas: 3, tachadoParcial: 1, completas: true });
  });

  it('outro caso no endereço, ou o caso em outro endereço: a linha continua faltando', () => {
    for (const caso of [
      { tipo: 'revogacao-reescrita', endereco: 'art1.parUnico' },
      { tipo: 'tachado-parcial', endereco: 'art1.incI' },
      { tipo: 'tachado-parcial' },
    ]) {
      const m = medir(rascunho(), comCaso(caso));
      expect(m.redacoes?.completas).toBe(false);
      expect(m.divergencias).toEqual([{ endereco: 'art1.parUnico', motivos: ['redacoes'] }]);
    }
  });

  it('o rascunho que duplica a linha do tachado parcial numa redação erra', () => {
    const m = medir(
      com('art1.parUnico', { textosDasRedacoes: ['Parágrafo único. O pátrio poder…'] }),
      comCaso({ tipo: 'tachado-parcial', endereco: 'art1.parUnico' }),
    );
    expect(m.redacoes).toMatchObject({ esperadas: 3, lidas: 4, completas: false });
  });
});

describe('regra (b): inciso com sufixo sem hífen que o gabarito não lê', () => {
  const VIIIA =
    'VIIIA a remoção a pedido ou a permuta de magistrados de comarca de igual entrância;';
  // CF, art. 93: o gabarito não tem a redação do VIII-A (perde a linha "~~VIIIA a remoção…~~").
  const gabaritoDaCf = (): GabaritoMedido => {
    const g = gabarito();
    g.dispositivos.push(
      { endereco: 'art93', status: 'vigente', notas: 0, redacoes: 0 },
      { endereco: 'art93.incVIII', status: 'vigente', notas: 0, redacoes: 0 },
      { endereco: 'art93.incVIIIA', status: 'vigente', notas: 1, redacoes: 0 },
      { endereco: 'art93.incIX', status: 'vigente', notas: 0, redacoes: 0 },
      { endereco: 'art93.incXC', status: 'vigente', notas: 0, redacoes: 0 },
    );
    return g;
  };
  const rascunhoDaCf = (redacoes: Record<string, string[]>) => [
    ...rascunho(),
    ...['art93', 'art93.incVIII', 'art93.incVIIIA', 'art93.incIX', 'art93.incXC'].map((e) =>
      d(e, 'vigente', {
        notas: e === 'art93.incVIIIA' ? ['(Incluído pela EC 45)'] : [],
        redacoes: redacoes[e] ?? [],
      }),
    ),
  ];

  it('a forma: romano com a letra colada, sem hífen, do próprio inciso', () => {
    expect(ehRedacaoDeSufixoSemHifen(VIIIA, 'art93.incVIIIA')).toBe(true);
    expect(ehRedacaoDeSufixoSemHifen(`  ${VIIIA}`, 'adct.art2.par1.incVIIIA')).toBe(true);
    expect(ehRedacaoDeSufixoSemHifen('VIII-A - a remoção…', 'art93.incVIIIA')).toBe(false);
    expect(ehRedacaoDeSufixoSemHifen('VIII a remoção…', 'art93.incVIIIA')).toBe(false);
    expect(ehRedacaoDeSufixoSemHifen(VIIIA, 'art93.incIX')).toBe(false);
    expect(ehRedacaoDeSufixoSemHifen(VIIIA, 'art93.par1')).toBe(false);
    // "XC" é noventa: a letra do sufixo não pode ser a de um romano.
    expect(ehRedacaoDeSufixoSemHifen('XC a remoção…', 'art93.incXC')).toBe(false);
  });

  it('aceita a redação "VIIIA" no VIII-A que o gabarito não tem', () => {
    const m = medir(rascunhoDaCf({ 'art93.incVIIIA': [VIIIA] }), gabaritoDaCf());
    expect(m.redacoes).toMatchObject({
      esperadas: 4,
      lidas: 4,
      sufixoSemHifen: 1,
      completas: true,
    });
    expect(m.divergencias).toEqual([]);
  });

  it('não acrescenta nada quando o gabarito já a tem', () => {
    const g = gabaritoDaCf();
    const viiiA = g.dispositivos.find((x) => x.endereco === 'art93.incVIIIA');
    if (viiiA) viiiA.redacoes = 1;
    const m = medir(rascunhoDaCf({ 'art93.incVIIIA': [VIIIA] }), g);
    expect(m.redacoes).toMatchObject({ esperadas: 4, sufixoSemHifen: 0, completas: true });
    expect(
      redacoesEsperadas(
        { endereco: 'art93.incVIIIA', redacoes: 1 },
        { textosDasRedacoes: [VIIIA] },
      ),
    ).toBe(1);
  });

  it('recusa o parecido: com hífen, de outra forma, em outro inciso, ou além do que sobra', () => {
    for (const redacoes of [
      { 'art93.incVIIIA': ['VIII-A - a remoção a pedido…'] } as Record<string, string[]>,
      { 'art93.incVIIIA': ['VIII a remoção a pedido…'] },
      { 'art93.incIX': [VIIIA] },
      { 'art93.incXC': ['XC a remoção…'] },
    ]) {
      const m = medir(rascunhoDaCf(redacoes), gabaritoDaCf());
      expect(m.redacoes?.completas).toBe(false);
      expect(m.redacoes?.sufixoSemHifen).toBe(0);
    }
    // Duas a mais, uma só da forma: só ela entra.
    const duas = medir(
      rascunhoDaCf({ 'art93.incVIIIA': [VIIIA, 'VIII-A - outra.'] }),
      gabaritoDaCf(),
    );
    expect(duas.redacoes).toMatchObject({
      esperadas: 4,
      lidas: 5,
      sufixoSemHifen: 1,
      completas: false,
    });
  });

  it('o caso da página pelo estruturador: a redação "VIIIA" vai para o VIII-A, e a regra a aceita', () => {
    const b = (...trechos: Trecho[]): Bloco => ({ trechos });
    const t = (texto: string): Trecho => ({ texto });
    const r = estruturar([
      b(t('Art. 93. Lei complementar disporá sobre o Estatuto da Magistratura:')),
      b(t('VIII - o ato de remoção do magistrado;')),
      b({ texto: VIIIA, tachado: true }),
      b(t('VIII-A - a remoção a pedido de magistrados de comarca de igual entrância;')),
    ]);
    const dispositivos = dispositivosDe(r.nos);
    expect(dispositivos.map((x) => [x.endereco, x.textosDasRedacoes])).toEqual([
      ['art93', []],
      ['art93.incVIII', []],
      ['art93.incVIIIA', [VIIIA]],
    ]);
    const m = compararComGabarito(
      { dispositivos, anomalias: r.anomalias },
      {
        dispositivos: [
          { endereco: 'art93', status: 'vigente', notas: 0, redacoes: 0 },
          { endereco: 'art93.incVIII', status: 'vigente', notas: 0, redacoes: 0 },
          { endereco: 'art93.incVIIIA', status: 'vigente', notas: 0, redacoes: 0 },
        ],
        contagens: { redacoesAnteriores: 0, redacoesNoAncestral: 0 },
        casos: [],
        amostra: [],
      },
    );
    expect(m).toMatchObject({ corretos: 3, percentual: 100, duplicados: [] });
    expect(m.redacoes).toMatchObject({ sufixoSemHifen: 1, completas: true });
  });
});

describe('regra (c) e a compilada', () => {
  const compilada = (dispositivos: DispositivoMedido[]) =>
    compararComGabarito({ dispositivos, anomalias: [] }, gabarito(), { compilada: true });
  // A compilada resume o art. 9º-A revogado numa linha, sem o § 1º, e não tem redação nenhuma.
  const resumida = () =>
    rascunho()
      .filter((x) => x.endereco !== 'art9A.par1')
      .map((x) => ({ ...x, textosDasRedacoes: [], noAncestral: 0 }));

  it('o filho do revogado ausente sai do total; as redações não se medem', () => {
    const m = compilada(resumida());
    expect(m).toMatchObject({
      compilada: true,
      total: 6,
      resumidos: 1,
      corretos: 6,
      percentual: 100,
    });
    expect(m.redacoes).toBeUndefined();
    expect(m.divergencias).toEqual([]);
  });

  it('o filho do revogado presente conta; o de vigente ausente diverge', () => {
    expect(compilada(rascunho())).toMatchObject({ total: 7, resumidos: 0, corretos: 7 });
    const m = compilada(resumida().filter((x) => x.endereco !== 'art1.incI.alA'));
    expect(m).toMatchObject({ total: 6, resumidos: 1, corretos: 5 });
    expect(m.divergencias).toEqual([{ endereco: 'art1.incI.alA', motivos: ['ausente'] }]);
  });

  it('fora da compilada, o filho do revogado ausente diverge', () => {
    const m = medir(resumida());
    expect(m).toMatchObject({ total: 7, resumidos: 0, corretos: 6 });
    expect(m.divergencias[0]).toEqual({ endereco: 'art1', motivos: ['redacoes'] });
    expect(m.divergencias).toContainEqual({ endereco: 'art9A.par1', motivos: ['ausente'] });
  });
});

describe('linha de base, relatório e conferência', () => {
  const m = (
    corretos: number,
    total: number,
    aMais = 0,
    { divergencias = [] as string[], renumerados = [] as string[] } = {},
  ) => ({
    corretos,
    total,
    aMais,
    percentual: (100 * corretos) / (total + aMais),
    divergencias: divergencias.map((x) => {
      const [endereco = '', motivos = ''] = x.split(': ');
      return { endereco, motivos: motivos.split(', ') as Motivo[] };
    }),
    renumerados,
  });
  const CAIU =
    'Regressão do estruturador ou gabarito mudado: examine cada diferença antes do commit; o número novo só entra em LINHA_DE_BASE se o gabarito foi corrigido e o rascunho está certo.';
  const MUDOU =
    'Examine cada diferença (o renumerado, na página: o gabarito não lê a renumeração) e atualize LINHA_DE_BASE no teste do corpus no mesmo commit.';

  it('linha de base: igual passa; caiu falha sem culpar só o estruturador; subiu ou mudou pede a tabela', () => {
    expect(
      compararComLinhaDeBase(m(1_357, 1_366, 6), { corretos: 1_357, de: 1_372 }),
    ).toBeUndefined();
    expect(compararComLinhaDeBase(m(1_356, 1_366, 6), { corretos: 1_357, de: 1_372 })).toBe(
      ['caiu: 1.356/1.372 (98,83%); a linha de base era 1.357/1.372 (98,90%).', CAIU].join('\n'),
    );
    expect(compararComLinhaDeBase(m(1_358, 1_366, 6), { corretos: 1_357, de: 1_372 })).toBe(
      ['mudou: 1.358/1.372 (98,97%); a linha de base era 1.357/1.372 (98,90%).', MUDOU].join('\n'),
    );
    // O corpus mudou (mais dispositivos), sem cair: muda a tabela.
    expect(compararComLinhaDeBase(m(1_402, 1_402), { corretos: 1_400, de: 1_400 })).toMatch(
      /^mudou/,
    );
  });

  it('linha de base com as divergências: trocar uma por outra cai, com as duas na mensagem', () => {
    const base = { corretos: 6, de: 8, divergencias: ['art1: notas', 'art2: a_mais'] };
    expect(
      compararComLinhaDeBase(m(6, 7, 1, { divergencias: ['art1: notas', 'art2: a_mais'] }), base),
    ).toBeUndefined();
    // Corrigiu as notas do art. 1º e quebrou o status do art. 3º: a contagem é a mesma.
    expect(
      compararComLinhaDeBase(m(6, 7, 1, { divergencias: ['art3: status', 'art2: a_mais'] }), base),
    ).toBe(
      [
        'caiu: 6/8 (75,00%); a linha de base era 6/8 (75,00%).',
        '  divergência nova: art3: status',
        '  divergência que sumiu: art1: notas',
        CAIU,
      ].join('\n'),
    );
    // Só corrigiu: subiu.
    expect(compararComLinhaDeBase(m(7, 7, 1, { divergencias: ['art2: a_mais'] }), base)).toBe(
      [
        'mudou: 7/8 (87,50%); a linha de base era 6/8 (75,00%).',
        '  divergência que sumiu: art1: notas',
        MUDOU,
      ].join('\n'),
    );
  });

  it('o dispositivo a mais que some (a compilada o tem) cai, mesmo com o percentual subindo', () => {
    const base = { corretos: 6, de: 8, divergencias: ['art1: notas', 'art2: a_mais'] };
    expect(compararComLinhaDeBase(m(6, 7, 0, { divergencias: ['art1: notas'] }), base)).toBe(
      [
        'caiu: 6/7 (85,71%); a linha de base era 6/8 (75,00%).',
        '  dispositivo a mais que sumiu (a fonte o tem: texto perdido?): art2: a_mais',
        CAIU,
      ].join('\n'),
    );
  });

  it('renumerados fixados: perder o status cai; renumerado novo muda; a lista vai na mensagem', () => {
    const base = { corretos: 7, de: 7, renumerados: ['art1.par1', 'art2.par1'] };
    expect(
      compararComLinhaDeBase(m(7, 7, 0, { renumerados: ['art1.par1', 'art2.par1'] }), base),
    ).toBeUndefined();
    expect(compararComLinhaDeBase(m(7, 7, 0, { renumerados: ['art1.par1'] }), base)).toBe(
      [
        'caiu: 7/7 (100,00%); a linha de base era 7/7 (100,00%).',
        '  renumerado que perdeu o status: art2.par1',
        CAIU,
      ].join('\n'),
    );
    expect(
      compararComLinhaDeBase(
        m(7, 7, 0, { renumerados: ['art1.par1', 'art2.par1', 'art3.par1'] }),
        base,
      ),
    ).toBe(
      [
        'mudou: 7/7 (100,00%); a linha de base era 7/7 (100,00%).',
        '  renumerado novo: art3.par1',
        MUDOU,
      ].join('\n'),
    );
  });

  it('a mensagem da linha de base corta cada lista em LIMITE_DE_DIVERGENCIAS', () => {
    const novas = Array.from({ length: 25 }, (_, k) => `art${String(k + 1)}: ausente`);
    const linhas =
      compararComLinhaDeBase(m(0, 25, 0, { divergencias: novas }), { corretos: 25, de: 25 })?.split(
        '\n',
      ) ?? [];
    expect(linhas.filter((l) => l.startsWith('  divergência nova: art'))).toHaveLength(
      LIMITE_DE_DIVERGENCIAS,
    );
    expect(linhas).toContain('  divergência nova: … e mais 5');
  });

  it('números como nos documentos', () => {
    expect([milhar(7), milhar(1_402), milhar(1_234_567)]).toEqual(['7', '1.402', '1.234.567']);
    expect([percentual(100), percentual(99.999), percentual(98.90670553)]).toEqual([
      '100,00%',
      '99,99%',
      '98,90%',
    ]);
  });

  it('uma linha por página e a do portão', () => {
    expect(linhaDoRelatorio('cf', medir(rascunho()), 'pendente')).toBe(
      'cf              7/7 (100,00%)  duplicados 0  redações 3/3 (ancestral 1/1)  pendente',
    );
    const resumida = compararComGabarito(
      {
        dispositivos: [
          ...rascunho().filter((x) => x.endereco !== 'art9A.par1'),
          d('art2', 'vigente'),
        ],
        anomalias: [],
      },
      gabarito(),
      { compilada: true },
    );
    expect(linhaDoRelatorio('lep-compilado', resumida, 'conferida')).toBe(
      'lep-compilado   6/7 (85,71%) [1 a mais; 1 resumidos]  duplicados 0  redações — (compilada)  conferida',
    );
    expect(linhaDoPortao(['cp', 'cf'])).toBe(
      'Portão da F2 (13.4) não medido: gabarito ainda não conferido pelo Gabriel em cp, cf.',
    );
    expect(linhaDoPortao([])).toBe('Portão da F2 (13.4): medido, com os 7 gabaritos conferidos.');
  });

  it('gabaritos pendentes: os que não estão `conferida`, na ordem dada', () => {
    const conferencia = (estado: 'conferida' | 'pendente') => ({
      conferencia: { estado, por: estado === 'conferida' ? 'Gabriel' : null, em: null },
    });
    expect(
      gabaritosPendentes([
        ['lep', conferencia('conferida')],
        ['cp', conferencia('pendente')],
        ['cf', conferencia('pendente')],
      ]),
    ).toEqual(['cp', 'cf']);
  });
});
