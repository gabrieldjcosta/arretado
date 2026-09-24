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
    // A rubrica e a continuação ("Pena - …") ficam na faixa do artigo, para a 8.3 e a 8.4.
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
    expect(porEndereco(r, 'art1')?.linhas).toEqual({ inicio: 2, fim: 4 });
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
    ]);
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
    const r = estruturar(blocos('TÍTULO I', 'Nome', 'Art. 1º A.'), { formato: 'texto' });
    expect(r.formatoEntrada).toBe('texto');
    expect(todos(r.nos).every((n) => n.confianca === 'a_confirmar')).toBe(true);
    expect(estruturar(blocos('Art. 1º A.')).nos[0]?.confianca).toBe('alta');
  });
});
