import { novoId } from '../../core/ids';
import { Dispositivo, Norma, TextoDeDispositivo, VersaoDeNorma } from '../../core/modelo';
import type { NoRascunho } from './rascunho';
import {
  categoriaDe,
  dadosDaNorma,
  FonteIlegivel,
  lerFonte,
  notaMaisRecenteDoModelo,
  registrosDaArvore,
  serializarFonte,
  sugerirTituloCurto,
} from './registros';

const COMUNS = {
  usuarioId: novoId(),
  criadoEm: '2026-09-23T12:00:00.000Z',
  atualizadoEm: '2026-09-23T12:00:00.000Z',
  tsLogico: '1758628800000-000000-0000abcd',
  origem: 'importacao' as const,
  excluidoEm: null,
};

const no = (parcial: Partial<NoRascunho> & Pick<NoRascunho, 'tipo' | 'endereco'>): NoRascunho => ({
  trechos: [],
  notas: [],
  redacoesAnteriores: [],
  status: 'vigente',
  confianca: 'alta',
  filhos: [],
  linhas: { inicio: 0, fim: 0 },
  ...parcial,
});

describe('título curto sugerido (9.2)', () => {
  it.each([
    [
      'título em caixa alta',
      { tituloOficial: 'CÓDIGO PENAL', tipo: 'Decreto-Lei', referencia: '2.848/1940' },
      'Código Penal',
    ],
    [
      'conectivos em minúscula',
      { tituloOficial: 'LEI DE EXECUÇÃO PENAL DO ESTADO' },
      'Lei de Execução Penal do Estado',
    ],
    ['título que já tem minúscula fica', { tituloOficial: 'Código de Teste' }, 'Código de Teste'],
    ['tipo e número', { tipo: 'Lei', referencia: '7.210/1984' }, 'Lei nº 7.210/1984'],
    [
      'epígrafe sem número (CF)',
      { tipo: 'Constituição', epigrafe: 'CONSTITUIÇÃO DA REPÚBLICA FEDERATIVA DO BRASIL DE 1988.' },
      'Constituição da República Federativa do Brasil de 1988',
    ],
    [
      'título vazio passa ao seguinte',
      { tituloOficial: '   ', tipo: 'Lei', referencia: '1/2000' },
      'Lei nº 1/2000',
    ],
    ['nada', {}, 'Norma sem título'],
  ])('%s', (_nome, metadados, esperado) => {
    expect(sugerirTituloCurto(metadados)).toBe(esperado);
  });

  it('corta no limite do modelo', () => {
    const titulo = sugerirTituloCurto({ tituloOficial: 'X'.repeat(600) });
    expect(titulo).toHaveLength(500);
    expect(titulo.endsWith('…')).toBe(true);
  });

  it('o corte não parte um par substituto (emoji na fronteira)', () => {
    const titulo = sugerirTituloCurto({ tituloOficial: 'x'.repeat(498) + '😀' + 'y'.repeat(10) });
    // Nenhuma metade de par substituto solta.
    expect(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(titulo),
    ).toBe(false);
    expect(titulo).toBe('x'.repeat(498) + '…');
  });
});

describe('nota mais recente nos limites do modelo (9.2)', () => {
  it.each([
    [
      'dentro dos limites',
      { lei: 'Lei nº 14.000', ano: 2021 },
      { lei: 'Lei nº 14.000', ano: 2021 },
    ],
    [
      'lei acima de 500 caracteres',
      { lei: 'Lei nº ' + '1'.repeat(600), ano: 2021 },
      { lei: ('Lei nº ' + '1'.repeat(600)).slice(0, 499) + '…', ano: 2021 },
    ],
    ['lei vazia', { lei: '  ', ano: 2021 }, undefined],
    ['ano impossível', { lei: 'Lei nº 1', ano: 1700 }, undefined],
    ['sem nota', undefined, undefined],
  ])('%s', (_nome, nota, esperada) => {
    const lida = notaMaisRecenteDoModelo(nota);
    expect(lida).toEqual(esperada);
    if (lida) {
      VersaoDeNorma.parse({
        ...COMUNS,
        id: novoId(),
        normaId: novoId(),
        status: 'rascunho',
        capturadaEm: COMUNS.criadoEm,
        origemEntrada: 'html',
        hash: '0'.repeat(64),
        notaVigenciaMaisRecente: lida,
      });
    }
  });
});

describe('dados da norma (9.2)', () => {
  it('título e URL em branco contam como ausentes', () => {
    const dados = dadosDaNorma(
      { tipo: 'Lei', referencia: '1/2000' },
      { tituloCurto: ' ', urlOficial: '  ' },
    );
    expect(dados.tituloCurto).toBe('Lei nº 1/2000');
    expect(dados).not.toHaveProperty('urlOficial');
    expect(dadosDaNorma({}, { urlOficial: ' https://www.planalto.gov.br/x.htm ' }).urlOficial).toBe(
      'https://www.planalto.gov.br/x.htm',
    );
  });
});

describe('categoria (9.2)', () => {
  const titulo = no({ tipo: 'titulo', endereco: 'tit1' });
  const artigo = no({ tipo: 'artigo', endereco: 'art1' });
  it.each([
    ['título', titulo, undefined, 'estrutural'],
    ['nome do título', no({ tipo: 'nome', endereco: 'tit1.nome' }), titulo, 'estrutural'],
    ['bloco (ADCT)', no({ tipo: 'bloco', endereco: 'adct' }), undefined, 'estrutural'],
    ['artigo', artigo, titulo, 'normativo'],
    ['rubrica do artigo', no({ tipo: 'nome', endereco: 'art1.nome' }), artigo, 'normativo'],
    ['preâmbulo', no({ tipo: 'preambulo', endereco: 'preambulo' }), undefined, 'normativo'],
    ['anexo', no({ tipo: 'anexo', endereco: 'anexo' }), undefined, 'normativo'],
  ] as const)('%s', (_nome, alvo, pai, esperada) => {
    expect(categoriaDe(alvo, pai)).toBe(esperada);
  });
});

describe('registros da árvore (9.2)', () => {
  it('ordem de leitura, pai antes do filho e um texto por dispositivo', () => {
    const arvore = [
      no({
        tipo: 'titulo',
        endereco: 'tit1',
        rotulo: 'TÍTULO I',
        filhos: [
          no({ tipo: 'nome', endereco: 'tit1.nome', trechos: [{ texto: 'DO TESTE' }] }),
          no({
            tipo: 'artigo',
            endereco: 'art1',
            rotulo: 'Art. 1º',
            trechos: [{ texto: 'Texto ' }, { texto: 'velho', tachado: true }],
            filhos: [no({ tipo: 'inciso', endereco: 'art1.incI', rotulo: 'I' })],
          }),
        ],
      }),
    ];
    const normaId = novoId();
    const versaoId = novoId();
    const { dispositivos, textos } = registrosDaArvore(arvore, { normaId, versaoId, novoId });
    const idDe = new Map(dispositivos.map((d) => [d.id, d.dados.endereco]));
    expect(
      dispositivos.map((d) => [
        d.dados.ordem,
        d.dados.endereco,
        d.dados.categoria,
        d.dados.paiId && idDe.get(d.dados.paiId),
      ]),
    ).toEqual([
      [1, 'tit1', 'estrutural', undefined],
      [2, 'tit1.nome', 'estrutural', 'tit1'],
      [3, 'art1', 'normativo', 'tit1'],
      [4, 'art1.incI', 'normativo', 'art1'],
    ]);
    expect('paiId' in (dispositivos[0]?.dados ?? {})).toBe(false);
    expect(
      textos.map((t) => [t.dados.versaoId, t.dados.normaId, idDe.get(t.dados.dispositivoId)]),
    ).toEqual(dispositivos.map((d) => [versaoId, normaId, d.dados.endereco]));
    expect(textos[2]?.dados.trechos).toEqual([
      { texto: 'Texto ' },
      { texto: 'velho', tachado: true },
    ]);
    expect('notasVigencia' in (textos[0]?.dados ?? {})).toBe(false);
  });

  it('página hostil: o excedente é cortado nos limites do modelo, não recusa a norma', () => {
    const normaId = novoId();
    const versaoId = novoId();
    const hostil = no({
      tipo: 'artigo',
      endereco: 'art1',
      rotulo: 'R'.repeat(600),
      renumeradoDe: 'art'.repeat(100),
      trechos: [{ texto: 'Texto.', link: 'https://www.planalto.gov.br/x.htm' }],
      notas: [
        {
          texto: '(Vide ' + 'x'.repeat(3_000) + ')',
          tipo: 'vide',
          linha: 0,
          lei: 'L'.repeat(600),
          ano: 1700,
        },
      ],
      redacoesAnteriores: [
        {
          trechos: [{ texto: 'Texto antigo.', tachado: true }],
          nota: 'n'.repeat(3_000),
          origemDeteccao: 'tachado',
          confirmada: true,
          enderecoLido: 'art1',
          linhas: { inicio: 0, fim: 0 },
        },
      ],
    });
    const { dispositivos, textos } = registrosDaArvore([hostil], { normaId, versaoId, novoId });
    const d = Dispositivo.parse({ ...COMUNS, id: novoId(), ...dispositivos[0]?.dados });
    expect(d.rotulo).toHaveLength(500);
    expect(d.renumeradoDe).toHaveLength(200);
    const t = TextoDeDispositivo.parse({ ...COMUNS, id: novoId(), ...textos[0]?.dados });
    expect(t.notasVigencia?.[0]?.texto).toHaveLength(2_000);
    expect(t.notasVigencia?.[0]).not.toHaveProperty('ano');
    expect(t.notasVigencia?.[0]).not.toHaveProperty('tipo');
    expect(t.redacoesAnteriores?.[0]).not.toHaveProperty('linhas');
    expect(t.redacoesAnteriores?.[0]?.nota).toHaveLength(2_000);
    const norma = Norma.parse({
      ...COMUNS,
      id: normaId,
      ...dadosDaNorma(
        { tituloOficial: 'T'.repeat(600), epigrafe: 'E'.repeat(300_000), tipo: '  ' },
        {},
      ),
    });
    expect(norma.tituloOficial).toHaveLength(500);
    expect(norma.epigrafe).toHaveLength(200_000);
    expect(norma).not.toHaveProperty('tipo');
    expect(norma.escopo).toBe('pessoal');
  });
});

describe('fonte (9.2)', () => {
  const blocos = [
    {
      trechos: [
        { texto: 'Art. 1º ' },
        { texto: 'Texto', tachado: true as const, enfase: true as const },
      ],
    },
    { trechos: [{ texto: '(Vide)', link: 'https://www.planalto.gov.br/x.htm' }] },
  ];

  it('volta igual e dá os mesmos bytes para o mesmo conteúdo', () => {
    const bytes = serializarFonte(blocos);
    expect(lerFonte(bytes)).toEqual(blocos);
    const reordenado = [
      { trechos: [{ enfase: true as const, tachado: true as const, texto: 'x' }] },
    ];
    expect(serializarFonte(reordenado)).toEqual(
      serializarFonte([{ trechos: [{ texto: 'x', tachado: true, enfase: true }] }]),
    );
  });

  it.each([
    ['UTF-8 inválido', new Uint8Array([0xff, 0xfe, 0x5b])],
    ['não é JSON', new TextEncoder().encode('<html>')],
    ['fora do formato', new TextEncoder().encode('[{"trechos":[{"texto":"a","cor":"red"}]}]')],
    ['tachado falso', new TextEncoder().encode('[{"trechos":[{"texto":"a","tachado":false}]}]')],
    [
      'link que não é http(s)',
      new TextEncoder().encode('[{"trechos":[{"texto":"a","link":"javascript:alert(1)"}]}]'),
    ],
  ])('recusa: %s', (_nome, bytes) => {
    expect(() => lerFonte(bytes)).toThrow(FonteIlegivel);
  });
});
