import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import { lerRotuloEstrutural } from './estrutura';
import { estruturar, VERSAO_ESTRUTURADOR } from './estruturador';
import { prepararLinhas, textoDe } from './linhas';
import type { NoRascunho, Rascunho } from './rascunho';

// Casos tirados do corpus (colados de corpus/normas/, 24/09/2026), reduzidos ao que a regra pede.
const b = (...trechos: (string | Trecho)[]): Bloco => ({
  trechos: trechos.map((t) => (typeof t === 'string' ? { texto: t } : t)),
});
const tachado = (texto: string): Trecho => ({ texto, tachado: true });
const blocos = (...linhas: (string | Bloco)[]) =>
  linhas.map((l) => (typeof l === 'string' ? b(l) : l));

/** Todos os nós, em ordem (pré-ordem). */
function todos(nos: readonly NoRascunho[]): NoRascunho[] {
  return nos.flatMap((no) => [no, ...todos(no.filhos)]);
}
const porEndereco = (r: Rascunho, endereco: string) =>
  todos(r.nos).find((no) => no.endereco === endereco);
const nomeDe = (no: NoRascunho | undefined) =>
  textoDe(no?.filhos.find((f) => f.tipo === 'nome')?.trechos ?? []);
const tipos = (r: Rascunho) => r.anomalias.map((a) => a.tipo);

describe('estruturador: blocos pré-normativos (regra 2)', () => {
  it('Planalto: cabeçalho, epígrafe, notas da norma, ementa, preâmbulo e o título em caixa alta', () => {
    const r = estruturar(
      blocos(
        'Presidência da República',
        'Casa Civil',
        'Subchefia para Assuntos Jurídicos',
        'DECRETO-LEI No 2.848, DE 7 DE DEZEMBRO DE 1940',
        'Texto compilado',
        b({ texto: 'Vigência', link: 'https://www.planalto.gov.br/vigencia' }),
        b({ texto: '(Vide Lei nº 1.521, de 1951)', link: 'https://www.planalto.gov.br/l1521' }),
        'Código Penal.',
        'O PRESIDENTE DA REPÚBLICA , usando da atribuição que lhe confere o art. 180 da Constituição, decreta a seguinte Lei:',
        'CÓDIGO PENAL',
        'PARTE GERAL',
        'TÍTULO I',
        'DA APLICAÇÃO DA LEI PENAL',
        'Art. 1º - Não há crime sem lei anterior que o defina.',
      ),
    );
    expect(r.metadados).toEqual({
      epigrafe: 'DECRETO-LEI Nº 2.848, DE 7 DE DEZEMBRO DE 1940',
      tipo: 'Decreto-Lei',
      referencia: '2.848/1940',
      ementa: 'Código Penal.',
      preambulo:
        'O PRESIDENTE DA REPÚBLICA , usando da atribuição que lhe confere o art. 180 da Constituição, decreta a seguinte Lei:',
      tituloOficial: 'CÓDIGO PENAL',
    });
    expect(r.notasDaNorma).toEqual([
      {
        texto: 'Vigência',
        tipo: 'vigencia',
        linha: 5,
        link: 'https://www.planalto.gov.br/vigencia',
      },
      {
        texto: '(Vide Lei nº 1.521, de 1951)',
        tipo: 'vide',
        linha: 6,
        link: 'https://www.planalto.gov.br/l1521',
      },
    ]);
    expect(r.descartes).toEqual([
      { motivo: 'cabecalho', linhas: { inicio: 0, fim: 2 } },
      { motivo: 'cabecalho', linhas: { inicio: 4, fim: 4 } },
    ]);
    const [preambulo, parte] = r.nos;
    expect(preambulo).toMatchObject({
      tipo: 'preambulo',
      endereco: 'preambulo',
      linhas: { inicio: 8, fim: 8 },
    });
    expect(parte).toMatchObject({ tipo: 'parte', endereco: 'parteGeral', rotulo: 'PARTE GERAL' });
    expect(r.versaoEstruturador).toBe(VERSAO_ESTRUTURADOR);
  });

  it('ALESP: preâmbulo em duas linhas e "(Última atualização…)" como nota da norma', () => {
    const r = estruturar(
      blocos(
        'Assembleia Legislativa do Estado de São Paulo Ficha informativa',
        'Texto compilado',
        'LEI COMPLEMENTAR N° 988, DE 09 DE JANEIRO DE 2006',
        '(Última atualização: Lei Complementar n° 1.434, de 11/09/2025)',
        'Organiza a Defensoria Pública do Estado e dá outras providências',
        'O GOVERNADOR DO ESTADO DE SÃO PAULO:',
        'Faço saber que a Assembléia Legislativa decreta e eu promulgo a seguinte lei complementar:',
        'TÍTULO I',
        'Disposições Iniciais',
        'Artigo 1° - Esta lei complementar dispõe sobre a organização da Defensoria Pública.',
      ),
    );
    expect(r.metadados.referencia).toBe('988/2006');
    expect(r.notasDaNorma).toHaveLength(1);
    expect(r.metadados.preambulo).toBe(
      'O GOVERNADOR DO ESTADO DE SÃO PAULO: Faço saber que a Assembléia Legislativa decreta e eu promulgo a seguinte lei complementar:',
    );
    expect(r.nos[0]?.linhas).toEqual({ inicio: 5, fim: 6 });
    expect(porEndereco(r, 'art1')?.rotuloLido).toBe('Artigo 1º -');
  });

  it('CF: rótulo "PREÂMBULO", sem ementa e sem número', () => {
    const r = estruturar(
      blocos(
        'CONSTITUIÇÃO DA REPÚBLICA FEDERATIVA DO BRASIL DE 1988',
        'Vide Emenda Constitucional nº 91, de 2016',
        'Atos decorrentes do disposto no § 3º do art. 5º',
        'ÍNDICE TEMÁTICO',
        'PREÂMBULO',
        'Nós, representantes do povo brasileiro, reunidos em Assembléia Nacional Constituinte, promulgamos a seguinte CONSTITUIÇÃO.',
        'TÍTULO I',
        'Dos Princípios Fundamentais',
        'Art. 1º A República Federativa do Brasil tem como fundamentos:',
      ),
    );
    expect(r.metadados.tipo).toBe('Constituição');
    expect(r.metadados.epigrafe).toMatch(/^CONSTITUIÇÃO/);
    expect(r.metadados.referencia).toBeUndefined();
    expect(r.metadados.ementa).toBeUndefined();
    expect(r.notasDaNorma.map((n) => n.tipo)).toEqual(['vide']);
    expect(r.nos[0]).toMatchObject({
      tipo: 'preambulo',
      rotulo: 'PREÂMBULO',
      linhas: { inicio: 4, fim: 5 },
    });
  });

  it('sem epígrafe (só alguns artigos colados): nada de metadado, os artigos na raiz', () => {
    const r = estruturar(blocos('Art. 1º Texto.', 'Art. 2º Texto.'));
    expect(r.metadados).toEqual({});
    expect(r.nos.map((n) => n.endereco)).toEqual(['art1', 'art2']);
    expect(r.descartes).toEqual([]);
    expect(r.anomalias).toEqual([]);
  });
});

describe('estruturador: rótulo estrutural (regra 3)', () => {
  const ler = (texto: string | Bloco) => {
    const [linha] = prepararLinhas([typeof texto === 'string' ? b(texto) : texto]);
    return linha && lerRotuloEstrutural(linha);
  };

  it.each([
    ['TÍTULO I', 'titulo', 'TÍTULO I', 'tit1'],
    ['Seção I', 'secao', 'Seção I', 'sec1'], // LEP
    ['Título XIV', 'titulo', 'Título XIV', 'tit14'], // ECA
    ['CAPÍTULO II-A', 'capitulo', 'CAPÍTULO II-A', 'cap2A'], // CP
    ['Seção V-A', 'secao', 'Seção V-A', 'sec5A'], // ECA
    ['SUBSEÇÃO VII', 'subsecao', 'SUBSEÇÃO VII', 'subsec7'], // LC-SP 988
    ['PARTE GERAL', 'parte', 'PARTE GERAL', 'parteGeral'],
    ['Parte Especial', 'parte', 'Parte Especial', 'parteEspecial'], // ECA
    ['LIVRO III', 'livro', 'LIVRO III', 'liv3'],
    ['CAPÍTULO ÚNICO', 'capitulo', 'CAPÍTULO ÚNICO', 'capUnico'],
    ['TÍTULO I - DISPOSIÇÕES GERAIS', 'titulo', 'TÍTULO I', 'tit1'],
  ])('%s', (texto, tipo, rotulo, segmento) => {
    expect(ler(texto)).toMatchObject({ tipo, rotulo, segmento });
  });

  it.each([
    'Parte civil legítima para a ação',
    'Capítulo de livro',
    'Título executivo extrajudicial',
    'Seções I e II deste Capítulo',
    'TÍTULOS',
  ])('não é nó: %s', (texto) => {
    expect(ler(texto)).toBeUndefined();
  });

  it('tachado não abre nó (a Parte Geral de 1940 do CP)', () => {
    expect(ler(b(tachado('Parte Geral')))).toBeUndefined();
  });
});

describe('estruturador: hierarquia, nome e endereço (regra 3)', () => {
  it('caminho dos nós, nível ausente e artigo no nó mais interno', () => {
    const r = estruturar(
      blocos(
        'CAPÍTULO I',
        'Das Disposições Gerais',
        'Art. 1º Um.',
        'PARTE ESPECIAL',
        '(Vide Lei nº 7.209, de 1984)',
        'TÍTULO I',
        'DOS CRIMES CONTRA A PESSOA',
        'CAPÍTULO I',
        'DOS CRIMES CONTRA A VIDA',
        'Homicídio simples',
        'Art. 121. Matar alguem:',
        'Pena - reclusão, de seis a vinte anos.',
        'SEÇÃO I',
        'Da seção',
        'Art. 122 Dois.',
        'TÍTULO II',
        'DOS CRIMES CONTRA O PATRIMÔNIO',
        'CAPÍTULO I',
        'DO FURTO',
        'Art. 155 - Subtrair coisa alheia móvel:',
      ),
    );
    expect(todos(r.nos).map((n) => n.endereco)).toEqual([
      'cap1',
      'cap1.nome',
      'art1',
      'parteEspecial',
      'parteEspecial.tit1',
      'parteEspecial.tit1.nome',
      'parteEspecial.tit1.cap1',
      'parteEspecial.tit1.cap1.nome',
      'art121',
      'art121.nome',
      'parteEspecial.tit1.cap1.sec1',
      'parteEspecial.tit1.cap1.sec1.nome',
      'art122',
      'parteEspecial.tit2',
      'parteEspecial.tit2.nome',
      'parteEspecial.tit2.cap1',
      'parteEspecial.tit2.cap1.nome',
      'art155',
    ]);
    const parte = porEndereco(r, 'parteEspecial');
    expect(nomeDe(parte)).toBe('');
    expect(parte?.notas.map((n) => n.tipo)).toEqual(['vide']);
    // A rubrica (8.3) e a continuação ("Pena - …", 8.4) ficam na faixa do artigo.
    expect(nomeDe(porEndereco(r, 'art121'))).toBe('Homicídio simples');
    expect(porEndereco(r, 'art121')?.linhas).toEqual({ inicio: 9, fim: 11 });
    expect(porEndereco(r, 'parteEspecial.tit1.cap1')?.linhas).toEqual({ inicio: 7, fim: 8 });
  });

  it('nota antes do nome, nome em duas linhas em caixa alta e rubrica fora do nome', () => {
    const r = estruturar(
      blocos(
        'TÍTULO XII',
        '(Incluído pela Lei nº 14.197, de 2021) (Vigência)',
        'DOS CRIMES CONTRA O ESTADO',
        'DEMOCRÁTICO DE DIREITO',
        'CAPÍTULO I-A',
        '(Incluído pela Lei nº 13.772, de 2018)',
        'DA EXPOSIÇÃO DA INTIMIDADE SEXUAL',
        'Registro não autorizado da intimidade sexual',
        'Art. 216-B. Produzir, fotografar, filmar ou registrar.',
      ),
    );
    const titulo = porEndereco(r, 'tit12');
    expect(nomeDe(titulo)).toBe('DOS CRIMES CONTRA O ESTADO DEMOCRÁTICO DE DIREITO');
    expect(titulo?.notas.map((n) => n.tipo)).toEqual(['incluido', 'vigencia']);
    const capitulo = porEndereco(r, 'tit12.cap1A');
    expect(nomeDe(capitulo)).toBe('DA EXPOSIÇÃO DA INTIMIDADE SEXUAL');
    expect(porEndereco(r, 'art216B')?.linhas).toEqual({ inicio: 7, fim: 8 });
  });

  it('nome com notas no fim ("(VETADO)" fica), nome em minúscula e nome na linha do rótulo', () => {
    const r = estruturar(
      blocos(
        'CAPÍTULO V',
        '(Incluído pela Lei 12.550. de 2011)',
        'das fraudes em certames de interesse público',
        'Art. 311-A. Utilizar ou divulgar.',
        'CAPÍTULO VI',
        '(VETADO) (Incluído pela Lei nº 14.197, de 2021) (Vigência)',
        'CAPÍTULO VII - DISPOSIÇÕES COMUNS (Incluído pela Lei nº 14.197, de 2021)',
        'Art. 359-T. Não constitui crime.',
      ),
    );
    expect(nomeDe(porEndereco(r, 'cap5'))).toBe('das fraudes em certames de interesse público');
    const vetado = porEndereco(r, 'cap6');
    expect(nomeDe(vetado)).toBe('(VETADO)');
    expect(vetado?.notas.map((n) => n.texto)).toEqual([
      '(Incluído pela Lei nº 14.197, de 2021)',
      '(Vigência)',
    ]);
    const comuns = porEndereco(r, 'cap7');
    expect(nomeDe(comuns)).toBe('DISPOSIÇÕES COMUNS');
    expect(comuns?.notas).toHaveLength(1);
  });

  it('nome em caixa mista não continua na linha seguinte (rubrica do artigo, LC 80)', () => {
    const r = estruturar(
      blocos(
        'TÍTULO I',
        'Das Disposições Preliminares',
        'Disposições Gerais',
        '(Redação dada pela Lei Complementar nº 132, de 2009).',
        'Art. 1º A Defensoria Pública é instituição permanente.',
      ),
    );
    expect(nomeDe(porEndereco(r, 'tit1'))).toBe('Das Disposições Preliminares');
    expect(porEndereco(r, 'tit1')?.notas).toEqual([]);
    // A 3ª linha é a rubrica do art. 1º (8.3), com a nota em linha própria.
    const artigo = porEndereco(r, 'art1');
    expect(nomeDe(artigo)).toBe('Disposições Gerais');
    expect(artigo?.filhos[0]?.notas.map((n) => n.linha)).toEqual([3]);
    expect(artigo?.linhas).toEqual({ inicio: 2, fim: 4 });
  });

  it('nota da ALESP em linha própria vai para o nó', () => {
    const r = estruturar(
      blocos(
        'SUBSEÇÃO VII',
        'Do Grupo de Assessoramento de Demandas Estruturais',
        '- Subseção VII acrescentada pela Lei Complementar n° 1.434, de 11/09/2025.',
        'Artigo 71-A - O Grupo de Assessoramento.',
      ),
    );
    const no = porEndereco(r, 'subsec7');
    expect(no?.notas).toEqual([
      {
        texto: 'Subseção VII acrescentada pela Lei Complementar nº 1.434, de 11/09/2025.',
        tipo: 'incluido',
        linha: 2,
      },
    ]);
    expect(porEndereco(r, 'art71A')).toBeDefined();
  });

  it('nó repetido sem artigo no meio: vale o último, e o anterior vira redação anterior (CP, Título VI)', () => {
    const r = estruturar(
      blocos(
        'PARTE ESPECIAL',
        'TÍTULO VI',
        'DOS CRIMES CONTRA OS COSTUMES',
        'CAPÍTULO I',
        'DOS CRIMES CONTRA A LIBERDADE SEXUAL',
        'TÍTULO VI',
        'DOS CRIMES CONTRA A DIGNIDADE SEXUAL',
        '(Redação dada pela Lei nº 12.015, de 2009)',
        'CAPÍTULO I',
        'DOS CRIMES CONTRA A LIBERDADE SEXUAL',
        '(Redação dada pela Lei nº 12.015, de 2009)',
        'Estupro',
        'Art. 213. Constranger alguém.',
      ),
    );
    const titulo = porEndereco(r, 'parteEspecial.tit6');
    expect(todos(r.nos).filter((n) => n.tipo === 'titulo')).toHaveLength(1);
    expect(nomeDe(titulo)).toBe('DOS CRIMES CONTRA A DIGNIDADE SEXUAL');
    expect(titulo?.redacoesAnteriores).toEqual([
      {
        trechos: [
          { texto: 'TÍTULO VI' },
          { texto: ' ' },
          { texto: 'DOS CRIMES CONTRA OS COSTUMES' },
        ],
        origemDeteccao: 'heuristica',
        confirmada: false,
        linhas: { inicio: 1, fim: 2 },
      },
    ]);
    const capitulos = todos(r.nos).filter((n) => n.tipo === 'capitulo');
    expect(capitulos.map((n) => n.endereco)).toEqual(['parteEspecial.tit6.cap1']);
    expect(capitulos[0]?.redacoesAnteriores).toHaveLength(1);
    expect(capitulos[0]?.filhos.map((f) => f.endereco)).toEqual([
      'parteEspecial.tit6.cap1.nome',
      'art213',
    ]);
    expect(tipos(r)).toEqual(['estrutural_substituido', 'estrutural_substituido']);
  });

  it('nó repetido com artigo no meio continua (a 8.7 acusa o endereço duplicado)', () => {
    const r = estruturar(
      blocos('CAPÍTULO I', 'Um', 'Art. 1º A.', 'CAPÍTULO I', 'Dois', 'Art. 2º B.'),
    );
    expect(todos(r.nos).filter((n) => n.tipo === 'capitulo')).toHaveLength(2);
    expect(tipos(r)).toEqual([]);
  });
});

describe('estruturador: tachado até a 8.6 (salvaguarda da leitura antecipada)', () => {
  it('linha tachada vira descarte `redacao_anterior`, nunca nó nem texto, com um aviso só', () => {
    const r = estruturar(
      blocos(
        b(tachado('Parte Geral')),
        b(tachado('TÍTULO I')),
        b(tachado('Art. 1º Texto de 1940.')),
        'PARTE GERAL',
        'TÍTULO I',
        'DA APLICAÇÃO DA LEI PENAL',
        'Anterioridade da Lei',
        b(tachado('Art. 1º - Texto antigo.'), {
          texto: ' (Redação dada pela Lei nº 7.209, de 1984)',
        }),
        'Art. 1º - Não há crime sem lei anterior. (Redação dada pela Lei nº 7.209, de 1984)',
        b({ texto: 'A' }, tachado('rt. 2º Capitular tachada.')),
      ),
    );
    expect(r.descartes).toEqual([
      { motivo: 'redacao_anterior', linhas: { inicio: 0, fim: 2 } },
      { motivo: 'redacao_anterior', linhas: { inicio: 7, fim: 7 } },
      { motivo: 'redacao_anterior', linhas: { inicio: 9, fim: 9 } },
    ]);
    expect(todos(r.nos).map((n) => n.endereco)).toEqual([
      'parteGeral',
      'parteGeral.tit1',
      'parteGeral.tit1.nome',
      'art1',
      'art1.nome',
    ]);
    // A redação antiga (tachada) entre a rubrica e o artigo vigente não a separa dele.
    expect(nomeDe(porEndereco(r, 'art1'))).toBe('Anterioridade da Lei');
    expect(porEndereco(r, 'art1')?.linhas).toEqual({ inicio: 6, fim: 8 });
    expect(r.anomalias).toEqual([
      expect.objectContaining({ tipo: 'redacao_anterior_nao_tratada', gravidade: 'aviso' }),
    ]);
    expect(r.anomalias[0]?.mensagem).toMatch(/^5 linha\(s\) tachada\(s\)/);
  });

  it('pedaço tachado no nome do nó fica na redação anterior (ECA)', () => {
    const r = estruturar(
      blocos(
        'Seção II',
        b({ texto: 'Da Perda e da Suspensão do ' }, tachado('Pátrio Poder'), {
          texto: ' Poder Familiar',
        }),
        'Art. 155. O procedimento.',
      ),
    );
    const secao = porEndereco(r, 'sec2');
    expect(nomeDe(secao)).toBe('Da Perda e da Suspensão do Poder Familiar');
    expect(secao?.redacoesAnteriores).toEqual([
      expect.objectContaining({
        origemDeteccao: 'tachado',
        confirmada: true,
        linhas: { inicio: 1, fim: 1 },
      }),
    ]);
  });
});

describe('estruturador: fecho, anexo e o que falta', () => {
  it('fecho (local e data, assinaturas, aviso do DOU) e anexo depois dele', () => {
    const r = estruturar(
      blocos(
        'Art. 204. Esta Lei entra em vigor.',
        'Brasília, 11 de julho de 1984; 163º da Independência e 96º da República.',
        'JOÃO FIGUEIREDO',
        'Este texto não substitui o publicado no DOU de 13.7.1984',
        'ANEXO',
        'Tabela de cargos',
      ),
    );
    expect(r.descartes).toEqual([{ motivo: 'fecho', linhas: { inicio: 1, fim: 3 } }]);
    expect(r.nos.map((n) => [n.tipo, n.endereco, n.linhas])).toEqual([
      ['artigo', 'art204', { inicio: 0, fim: 0 }],
      ['anexo', 'anexo', { inicio: 4, fim: 5 }],
    ]);
  });

  it('sem artigo: conflito "sem_artigos" (a 9.5 mostra "Não consegui identificar artigos")', () => {
    const r = estruturar(blocos('Um texto qualquer.', 'Outro parágrafo.'));
    expect(r.anomalias).toEqual([
      { tipo: 'sem_artigos', gravidade: 'conflito', mensagem: 'Não consegui identificar artigos.' },
    ]);
  });

  it('linha depois do nome que não chega a artigo: sobra, com aviso', () => {
    const r = estruturar(
      blocos('CAPÍTULO I', 'Nome', 'Rubrica sem artigo', 'CAPÍTULO II', 'Outro', 'Art. 1º A.'),
    );
    expect(r.descartes).toEqual([{ motivo: 'sobra', linhas: { inicio: 2, fim: 2 } }]);
    expect(tipos(r)).toEqual(['linha_solta']);
  });

  it('artigo: sufixo sem espaço; "- A" com espaço é separador (fatos da normalização)', () => {
    const r = estruturar(
      blocos(
        'Art. 9º-A. Sufixo.',
        'Art. 1º - A execução penal.',
        'Art 67. Sem ponto.',
        'Art. 359-M-A. Dois.',
      ),
    );
    expect(r.nos.map((n) => [n.endereco, n.rotulo, n.rotuloLido, textoDe(n.trechos)])).toEqual([
      ['art9A', 'Art. 9º-A', 'Art. 9º-A.', 'Sufixo.'],
      ['art1', 'Art. 1º', 'Art. 1º -', 'A execução penal.'],
      ['art67', 'Art. 67', 'Art 67.', 'Sem ponto.'],
      ['art359MA', 'Art. 359-M-A', 'Art. 359-M-A.', 'Dois.'],
    ]);
  });

  it('texto puro: confiança "a confirmar" (regra 12)', () => {
    const r = estruturar(blocos('TÍTULO I', 'Nome', 'Rubrica', 'Art. 1º A.'), { formato: 'texto' });
    expect(nomeDe(porEndereco(r, 'art1'))).toBe('Rubrica');
    expect(r.formatoEntrada).toBe('texto');
    expect(todos(r.nos).every((n) => n.confianca === 'a_confirmar')).toBe(true);
    expect(estruturar(blocos('Art. 1º A.')).nos[0]?.confianca).toBe('alta');
  });
});

describe('estruturador: artigo tolerante (regra 5)', () => {
  const artigos = (r: Rascunho) =>
    todos(r.nos)
      .filter((n) => n.tipo === 'artigo')
      .map((n) => [n.endereco, n.rotulo, n.rotuloLido, textoDe(n.trechos)]);

  it('formas do corpus (CF, CP, ALESP) e de fora dele', () => {
    const r = estruturar(
      blocos(
        'Art.246. Sem espaço.',
        'Art. 60.Nos dez primeiros anos.',
        'Art. 216-A . Espaço antes do ponto.',
        'Artigo 12 - Da ALESP.',
        'ARTIGO 13 - Em maiúsculas.',
        'A rt. 14 Capitular separada.',
        'Art. 15ºA. Sufixo sem hífen.',
        'Art. 16A - Sufixo sem hífen nem ordinal.',
        'Art. 1.000. Milhar.',
        'Artigo único. Único.',
      ),
    );
    expect(artigos(r)).toEqual([
      ['art246', 'Art. 246', 'Art.246.', 'Sem espaço.'],
      ['art60', 'Art. 60', 'Art. 60.', 'Nos dez primeiros anos.'],
      ['art216A', 'Art. 216-A', 'Art. 216-A .', 'Espaço antes do ponto.'],
      ['art12', 'Art. 12', 'Artigo 12 -', 'Da ALESP.'],
      ['art13', 'Art. 13', 'ARTIGO 13 -', 'Em maiúsculas.'],
      ['art14', 'Art. 14', 'A rt. 14', 'Capitular separada.'],
      ['art15A', 'Art. 15-A', 'Art. 15ºA.', 'Sufixo sem hífen.'],
      ['art16A', 'Art. 16-A', 'Art. 16A -', 'Sufixo sem hífen nem ordinal.'],
      ['art1000', 'Art. 1.000', 'Art. 1.000.', 'Milhar.'],
      ['artUnico', 'Art. único', 'Artigo único.', 'Único.'],
    ]);
  });

  it('não abre artigo: citação em minúscula ou entre aspas, "Artigos", "Arte"; letra solta não é sufixo', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Um.',
        'Artes e ofícios.',
        'Artigos 5º e 6º desta Lei.',
        'art. 5º da Lei nº 7.210, de 1984.',
        '"Art. 102. Citação da lei alterada."',
        'Art. 2º A execução.',
      ),
    );
    expect(artigos(r)).toEqual([
      ['art1', 'Art. 1º', 'Art. 1º', 'Um.'],
      ['art2', 'Art. 2º', 'Art. 2º', 'A execução.'],
    ]);
    expect(porEndereco(r, 'art1')?.linhas).toEqual({ inicio: 0, fim: 4 });
  });

  it('"Art" quebrado: a palavra numa linha e o número na seguinte', () => {
    const r = estruturar(blocos('Art. 1º Um.', 'Art.', '2º Dois.', 'Art.', 'Texto sem número.'));
    expect(artigos(r)).toEqual([
      ['art1', 'Art. 1º', 'Art. 1º', 'Um.'],
      ['art2', 'Art. 2º', 'Art. 2º', 'Dois.'],
    ]);
    expect(porEndereco(r, 'art2')?.linhas).toEqual({ inicio: 1, fim: 4 });
    // Tachado nas duas linhas: redação anterior numa faixa só; no fim da entrada, a linha fica.
    const t = estruturar(
      blocos('Art. 1º Um.', b(tachado('Art.')), b(tachado('1º Antigo.')), 'Art.'),
    );
    expect(t.descartes).toEqual([{ motivo: 'redacao_anterior', linhas: { inicio: 1, fim: 2 } }]);
    expect(porEndereco(t, 'art1')?.linhas).toEqual({ inicio: 0, fim: 3 });
  });
});

describe('estruturador: rubrica, o nome do artigo (regra 4)', () => {
  const nome = (r: Rascunho, endereco: string) =>
    porEndereco(r, endereco)?.filhos.find((f) => f.tipo === 'nome');

  it('linha curta antes do artigo vira o filho `nome`, com as notas dela (CP)', () => {
    const r = estruturar(
      blocos(
        'Art. 5º - Aplica-se a lei brasileira.',
        '§ 2º - É também aplicável.',
        'Lugar do crime (Redação dada pela Lei nº 7.209, de 1984)',
        'Art. 6º - Considera-se praticado o crime.',
        'Pena de multa',
        '(Incluído pela Lei nº 9.714, de 1998)',
        'Art. 49 - A pena de multa.',
      ),
    );
    expect(porEndereco(r, 'art5')?.linhas).toEqual({ inicio: 0, fim: 1 });
    const lugar = nome(r, 'art6');
    expect(lugar).toMatchObject({
      endereco: 'art6.nome',
      confianca: 'alta',
      linhas: { inicio: 2, fim: 2 },
    });
    expect(textoDe(lugar?.trechos ?? [])).toBe('Lugar do crime');
    expect(lugar?.notas.map((n) => n.texto)).toEqual(['(Redação dada pela Lei nº 7.209, de 1984)']);
    expect(porEndereco(r, 'art6')?.linhas).toEqual({ inicio: 2, fim: 3 });
    // "Pena de multa" é rubrica; a nota em linha própria logo depois é dela.
    const multa = nome(r, 'art49');
    expect(textoDe(multa?.trechos ?? [])).toBe('Pena de multa');
    expect(multa?.notas.map((n) => n.linha)).toEqual([5]);
    expect(multa?.linhas).toEqual({ inicio: 4, fim: 5 });
    expect(porEndereco(r, 'art49')?.linhas).toEqual({ inicio: 4, fim: 6 });
  });

  it('texto do artigo anterior não é rubrica: pena sem hífen, inciso, parágrafo, citação, minúscula, frase que continua', () => {
    const r = estruturar(
      blocos(
        'Art. 63. Omitir dizeres.',
        'Pena Detenção de um a seis meses ou multa.', // CDC, sem hífen
        'Art. 64. Deixar de comunicar.',
        'IV as ilhas fluviais e lacustres.', // CF, inciso sem hífen
        'Art. 65. Três.',
        'Parágrafo único. Texto.',
        'Art. 66. Quatro.',
        '6º) a perda e a suspensão do pátrio poder. "', // ECA, citação da lei alterada
        'Art. 67. Cinco.',
        'e continua na linha seguinte', // linha continuada (LC-SP 988)
        'Art. 68. Seis.',
        'Na forma do regulamento:',
        'Art. 69. Sete.',
      ),
    );
    const arts = todos(r.nos).filter((n) => n.tipo === 'artigo');
    expect(arts.map((a) => [a.endereco, a.filhos.length, a.linhas.inicio, a.linhas.fim])).toEqual([
      ['art63', 0, 0, 1],
      ['art64', 0, 2, 3],
      ['art65', 0, 4, 5],
      ['art66', 0, 6, 7],
      ['art67', 0, 8, 9],
      ['art68', 0, 10, 11],
      ['art69', 0, 12, 12],
    ]);
  });

  it('rubrica que começa com letra de numeral romano não é inciso ("Dano", "Mil…", "Civil…")', () => {
    const r = estruturar(
      blocos(
        'Dano',
        'Art. 163. Um.',
        'Mil vezes',
        'Art. 164. Dois.',
        'Civil e penal',
        'Art. 165. Três.',
      ),
    );
    expect(['art163', 'art164', 'art165'].map((e) => textoDe(nome(r, e)?.trechos ?? []))).toEqual([
      'Dano',
      'Mil vezes',
      'Civil e penal',
    ]);
  });

  it('rubrica que não chega a artigo volta para o artigo anterior (sem sangria)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Um.',
        'Aumento de pena', // rubrica do parágrafo (8.4)
        '§ 1º A pena aumenta.',
        'Rubrica antes do capítulo',
        'CAPÍTULO II',
        'DOS OUTROS',
        'Art. 2º Dois.',
        'Rubrica no fim',
      ),
    );
    expect(porEndereco(r, 'art1')?.linhas).toEqual({ inicio: 0, fim: 3 });
    expect(porEndereco(r, 'art2')?.linhas).toEqual({ inicio: 6, fim: 7 });
    expect(todos(r.nos).some((n) => n.tipo === 'nome' && n.endereco.startsWith('art'))).toBe(false);
    expect(r.descartes).toEqual([]);
  });

  it('redação antiga tachada entre a rubrica e o artigo; artigo tachado de outro número leva a rubrica (CP, art. 185)', () => {
    const r = estruturar(
      blocos(
        'Casa de prostituição',
        b(tachado('Art. 229 - Manter casa de prostituição.')),
        'Art. 229. Manter estabelecimento.',
        'Usurpação de nome ou pseudônimo alheio',
        b(tachado('Art. 185 - Atribuir falsamente.')),
        b(tachado('Pena - detenção.'), { texto: ' (Revogado pela Lei nº 10.695, de 2003)' }),
        'Art. 186. Procede-se mediante queixa.',
      ),
    );
    expect(textoDe(nome(r, 'art229')?.trechos ?? [])).toBe('Casa de prostituição');
    expect(porEndereco(r, 'art229')?.linhas).toEqual({ inicio: 0, fim: 2 });
    // Até a 8.6, a rubrica do revogado fica com ele, fora da árvore; o 186 não a recebe.
    expect(nome(r, 'art186')).toBeUndefined();
    expect(porEndereco(r, 'art229')?.linhas.fim).toBe(2);
    expect(porEndereco(r, 'art186')?.linhas).toEqual({ inicio: 6, fim: 6 });
    expect(r.descartes).toEqual([
      { motivo: 'redacao_anterior', linhas: { inicio: 1, fim: 1 } },
      { motivo: 'redacao_anterior', linhas: { inicio: 3, fim: 3 } },
      { motivo: 'redacao_anterior', linhas: { inicio: 4, fim: 5 } },
    ]);
  });

  it('"(VETADO)" no lugar da rubrica; título sem rótulo e rubrica terminada em ponto têm confiança média', () => {
    const r = estruturar(
      blocos(
        'Art. 359-N. Impedir a eleição.',
        '(VETADO) (Incluído pela Lei nº 14.197, de 2021) (Vigência)',
        'Art. 359-O. (VETADO).',
        'Favorecimento da prostituição ou de outra forma de exploração sexual de vulnerável. (Redação dada pela Lei nº 12.978, de 2014)',
        'Art. 218-B. Submeter.',
        'DISPOSIÇÕES FINAIS',
        'Art. 360 - Ressalvada a legislação especial.',
      ),
    );
    const vetado = nome(r, 'art359O');
    expect([textoDe(vetado?.trechos ?? []), vetado?.confianca, vetado?.notas.length]).toEqual([
      '(VETADO)',
      'alta',
      2,
    ]);
    expect(nome(r, 'art218B')?.confianca).toBe('media');
    expect(textoDe(nome(r, 'art360')?.trechos ?? [])).toBe('DISPOSIÇÕES FINAIS');
    expect(nome(r, 'art360')?.confianca).toBe('media');
  });

  it('pedaço tachado da rubrica fica na redação anterior do nome', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Um.',
        b({ texto: 'Violação de ' }, tachado('privilégio de invenção'), {
          texto: ' direito autoral',
        }),
        'Art. 184. Violar direitos de autor.',
      ),
    );
    const rubrica = nome(r, 'art184');
    expect(textoDe(rubrica?.trechos ?? [])).toBe('Violação de direito autoral');
    expect(rubrica?.redacoesAnteriores).toEqual([
      expect.objectContaining({ origemDeteccao: 'tachado', linhas: { inicio: 1, fim: 1 } }),
    ]);
  });

  it('rubrica do 1º artigo sem nó estrutural antes: é do corpo, não do preâmbulo', () => {
    const r = estruturar(
      blocos(
        'LEI Nº 1, DE 2 DE JANEIRO DE 2000.',
        'Dispõe sobre algo.',
        'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta a seguinte Lei:',
        'Objeto',
        'Art. 1º Esta Lei dispõe sobre algo.',
      ),
    );
    expect(r.metadados.preambulo).toMatch(/^O PRESIDENTE .* Lei:$/);
    expect(textoDe(nome(r, 'art1')?.trechos ?? [])).toBe('Objeto');
    expect(r.descartes.filter((d) => d.motivo === 'sobra')).toEqual([]);
    // Logo depois da epígrafe, sem preâmbulo, a linha é a ementa (mesmo sem ponto final).
    const e = estruturar(
      blocos(
        'LEI Nº 1, DE 2 DE JANEIRO DE 2000.',
        'Institui o Dia Nacional',
        'Art. 1º Fica instituído.',
      ),
    );
    expect(e.metadados.ementa).toBe('Institui o Dia Nacional');
    expect(nome(e, 'art1')).toBeUndefined();
  });

  it('rubrica tomada como nome do nó sem nome, numa norma com rubricas e nós em caixa alta', () => {
    const titulos = Array.from({ length: 9 }, (_, k) => [
      `TÍTULO ${'I'.repeat((k % 3) + 1)}`,
      `DOS CRIMES DO GRUPO ${String(k + 1)}`,
      `Rubrica ${String(k + 1)}`,
      `Art. ${String(k + 1)}. Texto.`,
    ]).flat();
    const r = estruturar(
      blocos(...titulos, 'CAPÍTULO I', 'Reclusão e detenção', 'Art. 33. Texto.'),
    );
    const capitulo = todos(r.nos).find((n) => n.tipo === 'capitulo');
    expect(nomeDe(capitulo)).toBe('');
    const rubrica = nome(r, 'art33');
    expect([textoDe(rubrica?.trechos ?? []), rubrica?.confianca]).toEqual([
      'Reclusão e detenção',
      'media',
    ]);
    expect(porEndereco(r, 'art33')?.linhas.inicio).toBe(37);
    // Nome que começa como nome de nó ("Das penas") fica no nó.
    const d = estruturar(blocos(...titulos, 'CAPÍTULO I', 'Das penas', 'Art. 32. Texto.'));
    expect(nomeDe(todos(d.nos).find((n) => n.tipo === 'capitulo'))).toBe('Das penas');
  });

  it('texto puro: a rubrica também fica "a confirmar"', () => {
    const r = estruturar(blocos('Objeto', 'Art. 1º A.'), { formato: 'texto' });
    expect(nome(r, 'art1')?.confianca).toBe('a_confirmar');
  });
});
