import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import { lerRotuloEstrutural } from './estrutura';
import { estruturar, VERSAO_ESTRUTURADOR } from './estruturador';
import { prepararLinhas, textoDe } from './linhas';
import { emOrdemDeLeitura } from './ordem';
import type { NoRascunho, Rascunho } from './rascunho';
import { TIPOS_DE_ANOMALIA } from './validacao';

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
/**
 * As anomalias da leitura (regras 1–12). Os trechos do corpus começam no meio da lei, e a
 * validação (regra 13, `validacao.test.ts`) acusaria os artigos de antes deles e as alíneas sem
 * inciso; a lei inteira de exemplo continua conferida com `r.anomalias`.
 */
const DA_VALIDACAO = new Set(TIPOS_DE_ANOMALIA.slice(TIPOS_DE_ANOMALIA.indexOf('sem_artigos')));
const daLeitura = (r: Rascunho) => r.anomalias.filter((a) => !DA_VALIDACAO.has(a.tipo));
const tipos = (r: Rascunho) => daLeitura(r).map((a) => a.tipo);

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
        lei: 'Lei nº 1.521',
        ano: 1951,
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
        lei: 'Lei Complementar nº 1.434',
        ano: 2025,
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

  it('nó repetido com artigo no meio continua, e a validação avisa (8.7: estrutural_repetido)', () => {
    const r = estruturar(
      blocos('CAPÍTULO I', 'Um', 'Art. 1º A.', 'CAPÍTULO I', 'Dois', 'Art. 2º B.'),
    );
    expect(todos(r.nos).filter((n) => n.tipo === 'capitulo')).toHaveLength(2);
    expect(r.anomalias.map((a) => [a.tipo, a.gravidade, a.endereco, a.linha])).toEqual([
      ['estrutural_repetido', 'aviso', 'cap1', 0],
      ['estrutural_repetido', 'aviso', 'cap1.nome', 1],
    ]);
    expect(todos(r.nos).every((n) => n.confianca === 'alta')).toBe(true);
  });
});

describe('estruturador: redação anterior por tachado (regra 8, 8.6)', () => {
  const redacoes = (no: NoRascunho | undefined) =>
    (no?.redacoesAnteriores ?? []).map((x) => ({
      texto: textoDe(x.trechos),
      linhas: x.linhas,
      ...(x.enderecoLido ? { lido: x.enderecoLido } : {}),
      ...(x.nota ? { nota: x.nota } : {}),
    }));
  const notasDo = (no: NoRascunho | undefined) => no?.notas.map((n) => n.texto) ?? [];

  it('a Parte Geral de 1940, toda tachada, se junta à de 1984 (CP): nó e artigo de mesmo endereço, nada fora', () => {
    const r = estruturar(
      blocos(
        b(tachado('Parte Geral')),
        b(tachado('TÍTULO I')),
        b(tachado('Da aplicação da lei penal')),
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
    expect(r.descartes).toEqual([]);
    expect(r.anomalias).toEqual([]);
    expect(r.linhasTachadas).toBe(6);
    expect(todos(r.nos).map((n) => n.endereco)).toEqual([
      'parteGeral',
      'parteGeral.tit1',
      'parteGeral.tit1.nome',
      'art1',
      'art1.nome',
      'art2',
    ]);
    // O rótulo e o nome tachados são a redação anterior do nó de mesmo endereço.
    expect(redacoes(porEndereco(r, 'parteGeral'))).toEqual([
      { texto: 'Parte Geral', linhas: { inicio: 0, fim: 0 } },
    ]);
    expect(redacoes(porEndereco(r, 'parteGeral.tit1'))).toEqual([
      { texto: 'TÍTULO I Da aplicação da lei penal', linhas: { inicio: 1, fim: 2 } },
    ]);
    // O artigo de 1940 e o antigo tachado entre a rubrica e o vigente: as duas redações dele, com
    // a nota de fora do tachado; a rubrica continua do vigente.
    const art1 = porEndereco(r, 'art1');
    expect(redacoes(art1)).toEqual([
      { texto: 'Art. 1º Texto de 1940.', linhas: { inicio: 3, fim: 3 } },
      {
        texto: 'Art. 1º - Texto antigo.',
        linhas: { inicio: 8, fim: 8 },
        nota: '(Redação dada pela Lei nº 7.209, de 1984)',
      },
    ]);
    expect(
      art1?.redacoesAnteriores.every((x) => x.origemDeteccao === 'tachado' && x.confirmada),
    ).toBe(true);
    expect(nomeDe(art1)).toBe('Anterioridade da Lei');
    expect(art1?.linhas).toEqual({ inicio: 7, fim: 9 });
    // Artigo só tachado, sem nota de revogação: revogado por heurística (confiança média).
    expect(porEndereco(r, 'art2')).toMatchObject({
      status: 'revogado',
      trechos: [],
      confianca: 'media',
    });
  });

  it('o tachado depois do vigente de mesmo endereço também é redação dele (ECA, art. 92, II)', () => {
    const r = estruturar(
      blocos(
        'Art. 92. As entidades adotarão os seguintes princípios:',
        'II - integração em família substituta, quando esgotados os recursos de manutenção na família natural ou extensa; (Redação dada pela Lei nº 12.010, de 2009) Vigência',
        b(
          tachado(
            'II - integração em família substituta, quando esgotados os recursos de manutenção na família de origem;',
          ),
        ),
        'III - atendimento personalizado e em pequenos grupos;',
      ),
    );
    expect(todos(r.nos).map((n) => n.endereco)).toEqual(['art92', 'art92.incII', 'art92.incIII']);
    expect(redacoes(porEndereco(r, 'art92.incII'))).toEqual([
      {
        texto:
          'II - integração em família substituta, quando esgotados os recursos de manutenção na família de origem;',
        linhas: { inicio: 2, fim: 2 },
      },
    ]);
    expect(porEndereco(r, 'art92.incII')?.status).toBe('vigente');
  });

  it('dispositivo tachado sem o de mesmo endereço vai para o ancestral, com o endereço lido (LEP, o parágrafo único que virou § 1º)', () => {
    const r = estruturar(
      blocos(
        'Art. 146-C. O condenado será instruído acerca dos cuidados:',
        b(tachado('Parágrafo único. A violação comprovada dos deveres poderá acarretar:')),
        b(tachado('I - a regressão do regime;')),
        '§ 1º A violação comprovada dos deveres poderá acarretar: (Renumerado do parágrafo único pela Lei nº 15.100, de 2025)',
        'I - a regressão do regime;',
      ),
    );
    expect(todos(r.nos).map((n) => n.endereco)).toEqual([
      'art146C',
      'art146C.par1',
      'art146C.par1.incI',
    ]);
    expect(redacoes(porEndereco(r, 'art146C'))).toEqual([
      {
        texto: 'Parágrafo único. A violação comprovada dos deveres poderá acarretar:',
        linhas: { inicio: 1, fim: 1 },
        lido: 'art146C.parUnico',
      },
      {
        texto: 'I - a regressão do regime;',
        linhas: { inicio: 2, fim: 2 },
        lido: 'art146C.parUnico.incI',
      },
    ]);
    // Regra 10: o § 1º é o antigo parágrafo único.
    expect(porEndereco(r, 'art146C.par1')).toMatchObject({
      status: 'renumerado',
      renumeradoDe: 'art146C.parUnico',
    });
  });

  it('rubrica tachada: abre a redação do artigo tachado seguinte (CP de 1940) ou é a antiga do nome novo (CP, art. 218-B)', () => {
    const r = estruturar(
      blocos(
        'Art. 218-A. Praticar, na presença de alguém menor de 14 anos, conjunção carnal: (Incluído pela Lei nº 12.015, de 2009)',
        b(
          tachado('Pena - reclusão, de 2 (dois) a 4 (quatro) anos. '),
          tachado('(Incluído pela Lei nº 12.015, de 2009)'),
        ),
        'Pena – reclusão, de 5 (cinco) a 12 (doze) anos, e multa. (Redação dada pela Lei nº 15.280, de 2025)',
        b(
          tachado(
            'Favorecimento da prostituição ou outra forma de exploração sexual de vulnerável',
          ),
          tachado(' (Incluído pela Lei nº 12.015, de 2009)'),
        ),
        'Favorecimento da prostituição ou de outra forma de exploração sexual de criança ou adolescente ou de vulnerável. (Redação dada pela Lei nº 12.978, de 2014)',
        'Art. 218-B. Submeter, induzir ou atrair à prostituição alguém menor de 18 anos: (Incluído pela Lei nº 12.015, de 2009)',
        b(tachado('Lei penal no tempo')),
        b(tachado('Art. 300 - Ninguém pode ser punido.')),
      ),
    );
    // A pena tachada depois do caput vigente é uma redação anterior dele (a nova continua o texto).
    expect(redacoes(porEndereco(r, 'art218A')).map((x) => x.texto)).toEqual([
      'Pena - reclusão, de 2 (dois) a 4 (quatro) anos. (Incluído pela Lei nº 12.015, de 2009)',
    ]);
    const nome = porEndereco(r, 'art218B')?.filhos[0];
    expect(nome?.tipo).toBe('nome');
    expect(redacoes(nome).map((x) => x.texto)).toEqual([
      'Favorecimento da prostituição ou outra forma de exploração sexual de vulnerável (Incluído pela Lei nº 12.015, de 2009)',
    ]);
    expect(redacoes(porEndereco(r, 'art300'))).toEqual([
      {
        texto: 'Lei penal no tempo\nArt. 300 - Ninguém pode ser punido.',
        linhas: { inicio: 6, fim: 7 },
      },
    ]);
  });

  it('nome antigo tachado do nó e nó estrutural todo tachado antes do vigente (LC 80, Título I; CF, Título IV)', () => {
    const r = estruturar(
      blocos(
        'TÍTULO I',
        b(tachado('Das Disposições Preliminares')),
        'Disposições Gerais',
        'Art. 1º A Defensoria Pública é instituição permanente.',
        b(tachado('TÍTULO IV')),
        b(tachado('Da Organização dos Poderes')),
        'TÍTULO IV',
        'DA ORGANIZAÇÃO DOS PODERES',
        'Art. 44. O Poder Legislativo é exercido pelo Congresso Nacional.',
      ),
    );
    expect(nomeDe(porEndereco(r, 'tit1'))).toBe('Disposições Gerais');
    expect(redacoes(porEndereco(r, 'tit1'))).toEqual([
      { texto: 'Das Disposições Preliminares', linhas: { inicio: 1, fim: 1 } },
    ]);
    expect(
      todos(r.nos)
        .filter((n) => n.tipo === 'titulo')
        .map((n) => n.endereco),
    ).toEqual(['tit1', 'tit4']);
    expect(redacoes(porEndereco(r, 'tit4'))).toEqual([
      { texto: 'TÍTULO IV Da Organização dos Poderes', linhas: { inicio: 4, fim: 5 } },
    ]);
    expect(daLeitura(r)).toEqual([]);
  });

  it('pedaço do rótulo fora do tachado ou sufixo sem hífen: o rótulo se lê inteiro (ECA, art. 90, IV; CF, art. 93, VIII-A)', () => {
    const r = estruturar(
      blocos(
        'Art. 90. As entidades são responsáveis pelos programas de:',
        'III - colocação familiar;',
        b({ texto: 'I ' }, tachado('V - abrigo;')),
        'IV - acolhimento institucional; (Redação dada pela Lei nº 12.010, de 2009) Vigência',
        'Art. 93. Lei complementar disporá sobre o Estatuto da Magistratura:',
        'VIII - o ato de remoção do magistrado;',
        b(
          tachado(
            'VIIIA a remoção a pedido ou a permuta de magistrados de comarca de igual entrância;',
          ),
        ),
        'VIII-A - a remoção a pedido de magistrados de comarca de igual entrância; (Incluído pela Emenda Constitucional nº 45, de 2004)',
      ),
    );
    expect(redacoes(porEndereco(r, 'art90.incIV')).map((x) => x.texto)).toEqual(['I V - abrigo;']);
    expect(redacoes(porEndereco(r, 'art90.incIII'))).toEqual([]);
    expect(redacoes(porEndereco(r, 'art93.incVIIIA')).map((x) => x.texto)).toEqual([
      'VIIIA a remoção a pedido ou a permuta de magistrados de comarca de igual entrância;',
    ]);
    expect(redacoes(porEndereco(r, 'art93.incVIII'))).toEqual([]);
  });

  it('nota da ALESP tachada descreve a redação de cima; linha tachada antes de qualquer artigo é sobra (CP, "CÓDIGO PENAL")', () => {
    const r = estruturar(
      blocos(
        b(tachado('CÓDIGO PENAL')),
        'Artigo 9º - O valor dos vencimentos fica fixado em R$ 1,00.',
        b(tachado('§ 1º - para os cargos de provimento efetivo: (NR)')),
        b(
          tachado('- § 1º com redação dada pela '),
          tachado('Lei Complementar nº 1.112, de 25/05/2010'),
          tachado(', com efeitos a partir de 01/04/2010.'),
        ),
        '§ 1º - para os cargos de provimento efetivo: (NR)',
        '- § 1º com redação dada pela Lei Complementar nº 1.376, de 30/03/2022.',
      ),
    );
    const par1 = porEndereco(r, 'art9.par1');
    expect(redacoes(par1)).toEqual([
      {
        texto: '§ 1º - para os cargos de provimento efetivo: (NR)',
        linhas: { inicio: 2, fim: 3 },
        nota: '§ 1º com redação dada pela Lei Complementar nº 1.112, de 25/05/2010, com efeitos a partir de 01/04/2010.',
      },
    ]);
    expect(notasDo(par1)).toEqual([
      '(NR)',
      '§ 1º com redação dada pela Lei Complementar nº 1.376, de 30/03/2022.',
    ]);
    expect(r.descartes).toContainEqual({ motivo: 'sobra', linhas: { inicio: 0, fim: 0 } });
    expect(tipos(r)).toEqual(['tachado_sem_dispositivo']);
  });

  it('revogação total (regra 9): nota de revogação fora do tachado dá o revogado, com a rubrica, os filhos e cada pena tachada (CP, art. 350; LEP, art. 182; CF)', () => {
    const r = estruturar(
      blocos(
        'Art. 349. Texto.',
        'Exercício arbitrário ou abuso de poder',
        b(tachado('Art. 350 - Ordenar medida privativa de liberdade:'), {
          texto: ' (Revogado pela Lei nº 13.869, de 2019) (Vigência)',
        }),
        b(tachado('Pena - detenção, de um mês a um ano.'), {
          texto: ' (Revogado pela Lei nº 13.869, de 2019) (Vigência)',
        }),
        b(tachado('Parágrafo único - Na mesma pena incorre o funcionário que:'), {
          texto: ' (Revogado pela Lei nº 13.869, de 2019)',
        }),
        b(tachado('I - ilegalmente recebe e recolhe alguém a prisão;'), {
          texto: ' (Revogado pela Lei nº 13.869, de 2019)',
        }),
        b('Art. 182. ', tachado('A pena de multa será convertida em detenção.'), {
          texto: ' (Revogado pela Lei nº 9.268, de 1996)',
        }),
        b('§ 1º ', tachado('Na conversão, a cada dia-multa corresponderá 1 dia.'), {
          texto: ' (Revogado pela Lei nº 9.268, de 1996)',
        }),
        'Art. 183. Texto.',
        b('III ', tachado('- classistas temporários.'), {
          texto: ' (Revogado pela Emenda Constitucional nº 24, de 1999)',
        }),
      ),
    );
    const art350 = porEndereco(r, 'art350');
    expect(art350).toMatchObject({ status: 'revogado', trechos: [], rotulo: 'Art. 350' });
    expect(nomeDe(art350)).toBe('Exercício arbitrário ou abuso de poder');
    expect(notasDo(art350)).toEqual(['(Revogado pela Lei nº 13.869, de 2019)', '(Vigência)']);
    expect(redacoes(art350)).toEqual([
      { texto: 'Art. 350 - Ordenar medida privativa de liberdade:', linhas: { inicio: 2, fim: 2 } },
      {
        texto: 'Pena - detenção, de um mês a um ano.',
        linhas: { inicio: 3, fim: 3 },
        nota: '(Revogado pela Lei nº 13.869, de 2019) (Vigência)',
      },
    ]);
    expect(porEndereco(r, 'art350.parUnico.incI')).toMatchObject({
      status: 'revogado',
      trechos: [],
    });
    // Rótulo fora do tachado: a redação anterior leva o rótulo e o texto tachado.
    expect(redacoes(porEndereco(r, 'art182'))).toEqual([
      {
        texto: 'Art. 182. A pena de multa será convertida em detenção.',
        linhas: { inicio: 6, fim: 6 },
      },
    ]);
    expect(porEndereco(r, 'art182.par1')?.status).toBe('revogado');
    expect(porEndereco(r, 'art183.incIII')).toMatchObject({ status: 'revogado', trechos: [] });
    expect(r.descartes).toEqual([]);
  });

  it('revogação reescrita: o "(Revogado)" que vem depois fica com a redação do tachado, sem duplicata (CP, art. 171, § 5º)', () => {
    const r = estruturar(
      blocos(
        'Art. 171. Obter vantagem ilícita:',
        b('§ 5º ', tachado('Somente se procede mediante representação.'), {
          texto: ' (Revogado pela Lei nº 15.397, de 2026)',
        }),
        '§ 5º (Revogado). (Redação dada pela Lei nº 15.397, de 2026)',
      ),
    );
    const par5 = porEndereco(r, 'art171.par5');
    expect(todos(r.nos).map((n) => n.endereco)).toEqual(['art171', 'art171.par5']);
    expect(par5).toMatchObject({ status: 'revogado', trechos: [] });
    expect(notasDo(par5)).toEqual(['(Redação dada pela Lei nº 15.397, de 2026)']);
    expect(redacoes(par5)).toEqual([
      {
        texto: '§ 5º Somente se procede mediante representação.',
        linhas: { inicio: 1, fim: 1 },
        nota: '(Revogado pela Lei nº 15.397, de 2026)',
      },
    ]);
    expect(tipos(r)).toEqual([]);
  });

  it('texto puro: sem tachado, nada disso; a duplicata continua heurística, a confirmar (a 8.8 faz o resto)', () => {
    const r = estruturar(
      blocos('Art. 1º Texto antigo.', 'Art. 1º Texto novo. (Redação dada pela Lei nº 1, de 2020)'),
      { formato: 'texto' },
    );
    expect(r.linhasTachadas).toBe(0);
    expect(porEndereco(r, 'art1')?.redacoesAnteriores).toEqual([
      expect.objectContaining({ origemDeteccao: 'heuristica', confirmada: false }),
    ]);
  });

  it('nota logo depois do nó tachado não vai para a redação de cima', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto:',
        b(tachado('§ 1º Antigo.')),
        b(tachado('TÍTULO II')),
        '(Redação dada pela Lei nº 1, de 2000)',
        'TÍTULO II',
        'DO RESTO',
        'Art. 2º Texto.',
      ),
    );
    expect(redacoes(porEndereco(r, 'art1'))).toEqual([
      { texto: '§ 1º Antigo.', linhas: { inicio: 1, fim: 1 }, lido: 'art1.par1' },
    ]);
    expect(redacoes(porEndereco(r, 'tit2'))).toEqual([
      {
        texto: 'TÍTULO II',
        linhas: { inicio: 2, fim: 3 },
        nota: '(Redação dada pela Lei nº 1, de 2000)',
      },
    ]);
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

describe('estruturador: anexos (regra 11, 8.7)', () => {
  const anexos = (r: Rascunho) => r.nos.filter((n) => n.tipo === 'anexo');
  const redacoes = (no: NoRascunho | undefined) =>
    (no?.redacoesAnteriores ?? []).map((x) => ({
      texto: textoDe(x.trechos),
      linhas: x.linhas,
      origem: x.origemDeteccao,
      confirmada: x.confirmada,
      ...(x.nota ? { nota: x.nota } : {}),
    }));

  it('LC-SP 988: os anexos antigos, todo tachados, são as redações anteriores do "ANEXO - Revogado."', () => {
    const r = estruturar(
      blocos(
        'Artigo 244 - Esta lei complementar entra em vigor na data de sua publicação.',
        'Palácio dos Bandeirantes, 9 de janeiro de 2006',
        'GERALDO ALCKMIN',
        b(
          tachado(
            '- Clique aqui para consultar a redação original do Subanexo 1 do Anexo, conforme a Lei Complementar nº 988, de 09/01/2006.',
          ),
        ),
        b(tachado('ANEXO')),
        b(
          tachado(
            'a que se refere o artigo 239, I, da Lei Complementar nº 988, de 9 de janeiro de 2006',
          ),
        ),
        b(
          tachado('- Subanexo 1 do Anexo substituído pela '),
          tachado('Lei Complementar nº 1.033, de 28/12/2007'),
          tachado(', produzindo efeitos a partir de 01/10/2007.'),
        ),
        b(tachado('ANEXO')),
        b(
          tachado(
            'a que se refere o artigo 240 da Lei Complementar nº 988, de 9 de janeiro de 2006',
          ),
        ),
        'ANEXO - Revogado.',
        '- Anexo revogado pela Lei Complementar nº 1.112, de 25/05/2010, com efeitos a partir de 01/04/2010.',
      ),
    );
    // A linha tachada antes do primeiro "ANEXO" fica no fecho; as dos anexos contam.
    expect(r.descartes).toEqual([{ motivo: 'fecho', linhas: { inicio: 1, fim: 3 } }]);
    expect(r.linhasTachadas).toBe(5);
    expect(daLeitura(r)).toEqual([]);
    expect(r.nos.map((n) => n.endereco)).toEqual(['art244', 'anexo']);
    const [anexo] = anexos(r);
    expect(anexo).toMatchObject({
      rotulo: 'ANEXO',
      rotuloLido: 'ANEXO -',
      status: 'revogado',
      trechos: [],
      confianca: 'alta',
      linhas: { inicio: 9, fim: 10 },
    });
    expect(anexo?.notas.map((n) => [n.texto, n.lei, n.ano])).toEqual([
      [
        'Anexo revogado pela Lei Complementar nº 1.112, de 25/05/2010, com efeitos a partir de 01/04/2010.',
        'Lei Complementar nº 1.112',
        2010,
      ],
    ]);
    expect(redacoes(anexo)).toEqual([
      {
        texto:
          'ANEXO\na que se refere o artigo 239, I, da Lei Complementar nº 988, de 9 de janeiro de 2006\n- Subanexo 1 do Anexo substituído pela Lei Complementar nº 1.033, de 28/12/2007, produzindo efeitos a partir de 01/10/2007.',
        linhas: { inicio: 4, fim: 6 },
        origem: 'tachado',
        confirmada: true,
      },
      {
        texto:
          'ANEXO\na que se refere o artigo 240 da Lei Complementar nº 988, de 9 de janeiro de 2006',
        linhas: { inicio: 7, fim: 8 },
        origem: 'tachado',
        confirmada: true,
      },
    ]);
  });

  it('cada cabeçalho abre um anexo: endereço pelo número, rótulo como aparece e texto bruto, sem estruturar', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Ficam criados os cargos dos anexos.',
        'Brasília, 10 de março de 2020; 199º da Independência e 132º da República.',
        'ANEXO I - QUADRO DE CARGOS',
        'TÍTULO I',
        'Art. 2º Não é artigo.',
        b(
          { texto: 'I - ' },
          { texto: 'Defensor', enfase: true },
          { texto: ' ' },
          { texto: '(Vide Lei nº 1, de 2000)', link: 'https://www.planalto.gov.br/l1' },
        ),
        'ANEXO II',
        'Tabela',
        'ANEXO ÚNICO',
        '(VETADO)',
        'ANEXO 3: Mapa',
        'Anexo IV em minúscula não é cabeçalho.',
      ),
    );
    expect(r.descartes).toEqual([{ motivo: 'fecho', linhas: { inicio: 1, fim: 1 } }]);
    expect(r.anomalias).toEqual([]);
    expect(
      anexos(r).map((n) => [
        n.endereco,
        n.rotulo,
        n.rotuloLido,
        textoDe(n.trechos),
        n.status,
        n.linhas,
      ]),
    ).toEqual([
      [
        'anexoI',
        'ANEXO I',
        'ANEXO I -',
        'QUADRO DE CARGOS\nTÍTULO I\nArt. 2º Não é artigo.\nI - Defensor (Vide Lei nº 1, de 2000)',
        'vigente',
        { inicio: 2, fim: 5 },
      ],
      ['anexoII', 'ANEXO II', 'ANEXO II', 'Tabela', 'vigente', { inicio: 6, fim: 7 }],
      ['anexoUnico', 'ANEXO ÚNICO', 'ANEXO ÚNICO', '(VETADO)', 'vetado', { inicio: 8, fim: 9 }],
      [
        'anexo3',
        'ANEXO 3',
        'ANEXO 3:',
        'Mapa\nAnexo IV em minúscula não é cabeçalho.',
        'vigente',
        { inicio: 10, fim: 11 },
      ],
    ]);
    // Os trechos ficam como vieram (ênfase, link), e a nota no meio do texto fica nele.
    expect(anexos(r)[0]?.trechos.slice(-4)).toEqual([
      { texto: 'I - ' },
      { texto: 'Defensor', enfase: true },
      { texto: ' ' },
      { texto: '(Vide Lei nº 1, de 2000)', link: 'https://www.planalto.gov.br/l1' },
    ]);
    expect(anexos(r)[0]?.notas).toEqual([]);
    expect(todos(r.nos).filter((n) => n.tipo === 'artigo' || n.tipo === 'titulo')).toHaveLength(1);
  });

  it('notas do fim do cabeçalho e das linhas logo depois dele são do anexo; a do meio fica no texto', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Brasília, 10 de março de 2020.',
        'ANEXO (Incluído pela Lei nº 2, de 2001)',
        '(Redação dada pela Lei nº 3, de 2002)',
        '- Anexo com redação dada pela Lei Complementar nº 4, de 2003.',
        'Tabela de cargos',
        '(Vide Lei nº 5, de 2004)',
      ),
    );
    const [anexo] = anexos(r);
    expect(anexo?.notas.map((n) => [n.texto, n.linha])).toEqual([
      ['(Incluído pela Lei nº 2, de 2001)', 2],
      ['(Redação dada pela Lei nº 3, de 2002)', 3],
      ['Anexo com redação dada pela Lei Complementar nº 4, de 2003.', 4],
    ]);
    expect(anexo?.rotuloLido).toBe('ANEXO');
    expect(textoDe(anexo?.trechos ?? [])).toBe('Tabela de cargos\n(Vide Lei nº 5, de 2004)');
    expect(anexo?.status).toBe('vigente');
    expect(anexo?.linhas).toEqual({ inicio: 2, fim: 6 });
  });

  it('linha toda tachada dentro de um anexo vigente fica no texto bruto, com a marca, e não conta', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Brasília, 10 de março de 2020.',
        'ANEXO',
        'Cargo | Quantidade',
        b(tachado('Defensor | 10')),
        b({ texto: 'Defensor | ' }, tachado('20'), { texto: ' 30' }),
      ),
    );
    const [anexo] = anexos(r);
    expect(anexo?.trechos).toEqual([
      { texto: 'Cargo | Quantidade' },
      { texto: '\n' },
      { texto: 'Defensor | 10', tachado: true },
      { texto: '\n' },
      { texto: 'Defensor | ' },
      { texto: '20', tachado: true },
      { texto: ' 30' },
    ]);
    expect(anexo?.redacoesAnteriores).toEqual([]);
    expect(r.linhasTachadas).toBe(0);
  });

  it('sem fecho reconhecido: o cabeçalho no corpo abre o anexo depois de algum artigo, fora de citação', () => {
    const r = estruturar(
      blocos(
        'Art. 113. O art. 82 passa a vigorar com a seguinte redação:',
        '"Art. 82. Texto alterado.',
        'ANEXO',
        'Tabela."',
        'Art. 114. Esta Lei entra em vigor.',
        'Rubrica sem artigo',
        'ANEXO II',
        'Art. 1º Texto do anexo.',
        '§ 1º Também.',
      ),
    );
    expect(r.nos.map((n) => [n.tipo, n.endereco, n.linhas])).toEqual([
      ['artigo', 'art113', { inicio: 0, fim: 3 }],
      ['artigo', 'art114', { inicio: 4, fim: 5 }],
      ['anexo', 'anexoII', { inicio: 6, fim: 8 }],
    ]);
    // Dentro da citação, "ANEXO" continua o artigo; a rubrica pendente volta para o anterior.
    expect(textoDe(porEndereco(r, 'art113')?.trechos ?? []).split('\n')).toHaveLength(4);
    expect(textoDe(porEndereco(r, 'art114')?.trechos ?? [])).toBe(
      'Esta Lei entra em vigor.\nRubrica sem artigo',
    );
    expect(textoDe(anexos(r)[0]?.trechos ?? [])).toBe('Art. 1º Texto do anexo.\n§ 1º Também.');
    // Antes de qualquer artigo, não é anexo.
    expect(anexos(estruturar(blocos('ANEXO', 'Tabela')))).toEqual([]);
  });

  it('anexo todo tachado sem o vigente de mesmo endereço: revogado, com a redação; sem nota de revogação, confiança média', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Brasília, 10 de março de 2020.',
        b(tachado('ANEXO I')),
        b(tachado('Tabela antiga')),
        b(tachado('ANEXO II')),
        '(Revogado pela Lei nº 2, de 2021)',
        b(tachado('Outra tabela')),
        'ANEXO III',
        'Tabela vigente',
      ),
    );
    expect(r.anomalias).toEqual([]);
    expect(r.linhasTachadas).toBe(4);
    expect(
      anexos(r).map((n) => [
        n.endereco,
        n.status,
        n.confianca,
        textoDe(n.trechos),
        n.notas.map((x) => x.texto),
      ]),
    ).toEqual([
      ['anexoI', 'revogado', 'media', '', []],
      ['anexoII', 'revogado', 'alta', '', ['(Revogado pela Lei nº 2, de 2021)']],
      ['anexoIII', 'vigente', 'alta', 'Tabela vigente', []],
    ]);
    expect(redacoes(anexos(r)[0])).toEqual([
      {
        texto: 'ANEXO I\nTabela antiga',
        linhas: { inicio: 2, fim: 3 },
        origem: 'tachado',
        confirmada: true,
      },
    ]);
    expect(redacoes(anexos(r)[1])).toEqual([
      {
        texto: 'ANEXO II\nOutra tabela',
        linhas: { inicio: 4, fim: 6 },
        origem: 'tachado',
        confirmada: true,
      },
    ]);
  });

  it('anexo tachado com texto sem tachado: tudo na redação anterior, com aviso e confiança média; o de mesmo endereço sem tachado repetido funde (vale o último)', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'Brasília, 10 de março de 2020.',
        b(tachado('ANEXO I')),
        '(Revogado pela Lei nº 2, de 2021)',
        b(tachado('Tabela antiga')),
        'Linha sem tachado',
        'ANEXO II',
        'Tabela 1',
        'ANEXO II',
        'Tabela 2',
      ),
    );
    expect(r.anomalias.map((a) => [a.tipo, a.endereco, a.mensagem])).toEqual([
      [
        'duplicata',
        'anexoII',
        'ANEXO II (anexoII) aparece mais de uma vez sem tachado; ficou o último, e o anterior virou redação anterior.',
      ],
      [
        'artigo_so_tachado',
        'anexoI',
        'ANEXO I está tachado, mas tem texto sem tachado depois do cabeçalho; ficou tudo na redação anterior.',
      ],
    ]);
    expect(r.linhasTachadas).toBe(2);
    const [primeiro, segundo] = anexos(r);
    // Sem o de mesmo endereço, fica revogado e médio, mesmo com a nota de revogação.
    expect([primeiro?.status, primeiro?.trechos, primeiro?.confianca]).toEqual([
      'revogado',
      [],
      'media',
    ]);
    expect(primeiro?.notas.map((n) => n.texto)).toEqual(['(Revogado pela Lei nº 2, de 2021)']);
    expect(redacoes(primeiro)).toEqual([
      {
        texto: 'ANEXO I\nTabela antiga\nLinha sem tachado',
        linhas: { inicio: 2, fim: 5 },
        origem: 'tachado',
        confirmada: true,
      },
    ]);
    expect([segundo?.endereco, textoDe(segundo?.trechos ?? []), segundo?.confianca]).toEqual([
      'anexoII',
      'Tabela 2',
      'media',
    ]);
    expect(redacoes(segundo)).toEqual([
      {
        texto: 'ANEXO II Tabela 1',
        linhas: { inicio: 6, fim: 7 },
        origem: 'heuristica',
        confirmada: false,
      },
    ]);
  });

  it('texto sem tachado sob o cabeçalho tachado (LC-SP 988): fica na redação, com as marcas, e não vai para o "ANEXO - Revogado."', () => {
    const estruturarCom = (linha: string | Bloco) =>
      estruturar(
        blocos(
          'Artigo 244 - Esta lei complementar entra em vigor na data de sua publicação.',
          'Palácio dos Bandeirantes, 9 de janeiro de 2006',
          b(tachado('ANEXO')),
          b(tachado('a que se refere o artigo 239')),
          linha,
          'ANEXO - Revogado.',
          '- Anexo revogado pela Lei Complementar nº 1.112, de 25/05/2010, com efeitos a partir de 01/04/2010.',
        ),
      );
    const r = estruturarCom('Tabela sem tachado');
    expect(r.nos.map((n) => n.endereco)).toEqual(['art244', 'anexo']);
    expect(daLeitura(r).map((a) => [a.tipo, a.endereco, a.mensagem])).toEqual([
      [
        'artigo_so_tachado',
        'anexo',
        'ANEXO está tachado, mas tem texto sem tachado depois do cabeçalho; ficou tudo na redação anterior.',
      ],
    ]);
    expect(r.linhasTachadas).toBe(2);
    const [anexo] = anexos(r);
    expect(anexo).toMatchObject({
      status: 'revogado',
      trechos: [],
      confianca: 'media',
      linhas: { inicio: 5, fim: 6 },
    });
    expect(anexo?.notas.map((n) => n.lei)).toEqual(['Lei Complementar nº 1.112']);
    expect(redacoes(anexo)).toEqual([
      {
        texto: 'ANEXO\na que se refere o artigo 239\nTabela sem tachado',
        linhas: { inicio: 2, fim: 4 },
        origem: 'tachado',
        confirmada: true,
      },
    ]);
    // A tabela com tachado parcial também fica na redação, com as marcas como vieram.
    const parcial = anexos(estruturarCom(b({ texto: 'Defensor | ' }, tachado('10'))))[0];
    expect([parcial?.status, parcial?.trechos, parcial?.confianca]).toEqual([
      'revogado',
      [],
      'media',
    ]);
    expect(parcial?.redacoesAnteriores[0]?.trechos.slice(-3)).toEqual([
      { texto: '\n' },
      { texto: 'Defensor | ' },
      { texto: '10', tachado: true },
    ]);
  });

  it('nota de revogação em linha própria depois do conteúdo tachado: é do anexo; com o de mesmo endereço, da redação', () => {
    const antigo = [
      'Art. 1º Texto.',
      'Brasília, 10 de março de 2020.',
      b(tachado('ANEXO I')),
      b(tachado('Tabela antiga')),
      '(Redação dada pela Lei nº 1, de 2019)',
      '(Revogado pela Lei nº 2, de 2021)',
    ];
    const r = estruturar(blocos(...antigo));
    expect(r.anomalias).toEqual([]);
    const [anexo] = anexos(r);
    expect([anexo?.status, anexo?.confianca, anexo?.linhas]).toEqual([
      'revogado',
      'alta',
      { inicio: 2, fim: 5 },
    ]);
    expect(anexo?.notas.map((n) => [n.texto, n.tipo])).toEqual([
      ['(Revogado pela Lei nº 2, de 2021)', 'revogado'],
    ]);
    // A outra nota continua na redação.
    expect(redacoes(anexo)).toEqual([
      {
        texto: 'ANEXO I\nTabela antiga',
        linhas: { inicio: 2, fim: 4 },
        origem: 'tachado',
        confirmada: true,
        nota: '(Redação dada pela Lei nº 1, de 2019)',
      },
    ]);
    // Com o vigente de mesmo endereço, a nota vai para a nota da redação (a regra de antes).
    const comGemeo = anexos(estruturar(blocos(...antigo, 'ANEXO I', 'Tabela nova')));
    expect(
      comGemeo.map((n) => [n.endereco, n.status, n.confianca, textoDe(n.trechos), n.notas]),
    ).toEqual([['anexoI', 'vigente', 'alta', 'Tabela nova', []]]);
    expect(redacoes(comGemeo[0]).map((x) => x.nota)).toEqual([
      '(Redação dada pela Lei nº 1, de 2019) (Revogado pela Lei nº 2, de 2021)',
    ]);
  });

  it('anexo vigente revogado guarda as linhas tachadas numa redação anterior, e elas contam', () => {
    const fim = ['Art. 1º Texto.', 'Brasília, 10 de março de 2020.'];
    // (A) nota de revogação no cabeçalho; (B) "Revogado." no texto; (C) o A com duas linhas tachadas.
    const a = estruturar(
      blocos(...fim, 'ANEXO (Revogado pela Lei nº 2, de 2021)', b(tachado('Tabela antiga'))),
    );
    const bb = estruturar(blocos(...fim, 'ANEXO - Revogado.', b(tachado('linha antiga'))));
    const c = estruturar(
      blocos(...fim, 'ANEXO (Revogado pela Lei nº 2, de 2021)', b(tachado('A')), b(tachado('B'))),
    );
    for (const r of [a, bb, c]) expect(r.anomalias).toEqual([]);
    expect(
      [a, bb, c].map((r) => {
        const [anexo] = anexos(r);
        return [
          anexo?.status,
          anexo?.trechos,
          anexo?.confianca,
          anexo?.notas.map((n) => n.tipo),
          r.linhasTachadas,
        ];
      }),
    ).toEqual([
      ['revogado', [], 'alta', ['revogado'], 1],
      ['revogado', [], 'alta', [], 1],
      ['revogado', [], 'alta', ['revogado'], 2],
    ]);
    expect(redacoes(anexos(a)[0])).toEqual([
      {
        texto: 'Tabela antiga',
        linhas: { inicio: 2, fim: 3 },
        origem: 'tachado',
        confirmada: true,
      },
    ]);
    expect(redacoes(anexos(bb)[0])).toEqual([
      { texto: 'linha antiga', linhas: { inicio: 2, fim: 3 }, origem: 'tachado', confirmada: true },
    ]);
    expect(anexos(c)[0]?.redacoesAnteriores).toEqual([
      {
        trechos: [{ texto: 'A', tachado: true }, { texto: '\n' }, { texto: 'B', tachado: true }],
        origemDeteccao: 'tachado',
        confirmada: true,
        linhas: { inicio: 2, fim: 4 },
      },
    ]);
    // O vetado mantém o texto bruto, com a marca, e a linha tachada não conta.
    const vetado = estruturar(blocos(...fim, 'ANEXO ÚNICO', '(VETADO)', b(tachado('antiga'))));
    expect([anexos(vetado)[0]?.status, vetado.linhasTachadas]).toEqual(['vetado', 0]);
    expect(textoDe(anexos(vetado)[0]?.trechos ?? [])).toBe('(VETADO)\nantiga');
  });
});

describe('estruturador: confiança por heurística (regra 12, 8.7)', () => {
  const naoAltas = (r: Rascunho) =>
    todos(r.nos)
      .filter((n) => n.confianca !== 'alta')
      .map((n) => [n.endereco, n.confianca]);

  it('duplicata: o que fica é médio (CP, art. 141, § 2º)', () => {
    const r = estruturar(
      blocos(
        'Art. 141. As penas aumentam-se:',
        '§ 2º (VETADO). (Incluído pela Lei nº 13.964, de 2019)',
        '§ 2º Se o crime é cometido nas redes sociais, aplica-se em triplo a pena.',
      ),
    );
    expect(tipos(r)).toEqual(['duplicata']);
    expect(naoAltas(r)).toEqual([['art141.par2', 'media']]);
  });

  it('nó estrutural substituído: o que fica é médio (CP, Título VI)', () => {
    const r = estruturar(
      blocos(
        'TÍTULO VI',
        'DOS CRIMES CONTRA OS COSTUMES',
        'TÍTULO VI',
        'DOS CRIMES CONTRA A DIGNIDADE SEXUAL',
        '(Redação dada pela Lei nº 12.015, de 2009)',
        'Art. 213. Constranger alguém.',
      ),
    );
    expect(tipos(r)).toEqual(['estrutural_substituido']);
    expect(naoAltas(r)).toEqual([['tit6', 'media']]);
  });

  it('dispositivo vigente sob um tachado sem o de mesmo endereço: muda de pai e fica médio', () => {
    const r = estruturar(
      blocos('Art. 1º Texto:', b(tachado('§ 1º Antigo:')), 'I - inciso vigente;'),
    );
    expect(tipos(r)).toEqual(['sem_pai']);
    expect(porEndereco(r, 'art1')?.filhos.map((f) => f.endereco)).toEqual(['art1.par1.incI']);
    expect(naoAltas(r)).toEqual([['art1.par1.incI', 'media']]);
  });

  it('linha continuada: o dispositivo que a recebe é médio (LC-SP 988, art. 159)', () => {
    const r = estruturar(
      blocos(
        'Art. 159. Aplicam-se aos membros os benefícios concedidos',
        'aos advogados em geral.',
        'Art. 160. Texto.',
      ),
    );
    expect(tipos(r)).toEqual(['linha_continuada']);
    expect(naoAltas(r)).toEqual([['art159', 'media']]);
  });

  it('artigo e anexo só tachados: médios sem nota de revogação, altos com ela (CP, arts. 185 e 186)', () => {
    const r = estruturar(
      blocos(
        'Art. 184. Violar direito autoral.',
        b(tachado('Art. 185 - Suprimir ou alterar marca.')),
        b(tachado('Art. 186 - Antigo.')),
        '(Revogado pela Lei nº 10.695, de 2003)',
        b(tachado('ANEXO')),
        b(tachado('Tabela antiga')),
      ),
    );
    expect(tipos(r)).toEqual([]);
    expect(todos(r.nos).map((n) => [n.endereco, n.status, n.confianca])).toEqual([
      ['art184', 'vigente', 'alta'],
      ['art185', 'revogado', 'media'],
      ['art186', 'revogado', 'alta'],
      ['anexo', 'revogado', 'media'],
    ]);
  });

  it('texto puro: tudo continua "a confirmar", também o que a heurística resolveu', () => {
    const r = estruturar(
      blocos(
        'Art. 159. Aplicam-se aos membros os benefícios concedidos',
        'aos advogados em geral.',
        'Art. 159. De novo.',
        'ANEXO',
        'Tabela',
      ),
      { formato: 'texto' },
    );
    expect(tipos(r)).toEqual(['linha_continuada', 'duplicata']);
    expect(todos(r.nos).map((n) => [n.endereco, n.confianca])).toEqual([
      ['art159', 'a_confirmar'],
      ['anexo', 'a_confirmar'],
    ]);
    // Regra 12: o aviso dos 20% vem por último, com a frase do texto puro.
    expect(r.anomalias.at(-1)).toEqual({
      tipo: 'a_confirmar_acima_do_limite',
      gravidade: 'aviso',
      mensagem: 'O texto chegou sem formatação: 2 de 2 dispositivos (100%) ficaram a confirmar.',
    });
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
    // As linhas que não abrem artigo continuam o art. 1º (8.4), menos a minúscula depois de ponto
    // final, que é sobra.
    expect(artigos(r)).toEqual([
      [
        'art1',
        'Art. 1º',
        'Art. 1º',
        'Um.\nArtes e ofícios.\nArtigos 5º e 6º desta Lei.\n"Art. 102. Citação da lei alterada."',
      ],
      ['art2', 'Art. 2º', 'Art. 2º', 'A execução.'],
    ]);
    expect(porEndereco(r, 'art1')?.linhas).toEqual({ inicio: 0, fim: 4 });
    expect(r.descartes).toEqual([{ motivo: 'sobra', linhas: { inicio: 3, fim: 3 } }]);
  });

  it('"Art" quebrado: a palavra numa linha e o número na seguinte', () => {
    const r = estruturar(blocos('Art. 1º Um.', 'Art.', '2º Dois.', 'Art.', 'Texto sem número.'));
    expect(artigos(r)).toEqual([
      ['art1', 'Art. 1º', 'Art. 1º', 'Um.'],
      ['art2', 'Art. 2º', 'Art. 2º', 'Dois.\nArt.\nTexto sem número.'],
    ]);
    expect(porEndereco(r, 'art2')?.linhas).toEqual({ inicio: 1, fim: 4 });
    // Tachado nas duas linhas: uma redação anterior, numa faixa só; no fim da entrada, a linha
    // fica no texto do artigo (lida depois do tachado, passa com ele para o de mesmo endereço).
    const t = estruturar(
      blocos('Art. 1º Um.', b(tachado('Art.')), b(tachado('1º Antigo.')), 'Art.'),
    );
    expect(t.descartes).toEqual([]);
    const art1 = porEndereco(t, 'art1');
    expect(art1?.redacoesAnteriores.map((x) => [textoDe(x.trechos), x.linhas])).toEqual([
      ['Art. 1º Antigo.', { inicio: 1, fim: 2 }],
    ]);
    expect(textoDe(art1?.trechos ?? [])).toBe('Um.\nArt.');
    expect(art1?.linhas).toEqual({ inicio: 0, fim: 3 });
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
    // Nenhuma rubrica: a pena e a citação continuam o artigo; o inciso e o parágrafo são filhos
    // dele (8.4); a linha em minúscula continua a frase sem ponto final.
    const arts = todos(r.nos).filter((n) => n.tipo === 'artigo');
    expect(
      arts.map((a) => [
        a.endereco,
        a.filhos.map((f) => f.endereco),
        textoDe(a.trechos),
        a.linhas.inicio,
        a.linhas.fim,
      ]),
    ).toEqual([
      ['art63', [], 'Omitir dizeres.\nPena Detenção de um a seis meses ou multa.', 0, 1],
      ['art64', ['art64.incIV'], 'Deixar de comunicar.', 2, 3],
      ['art65', ['art65.parUnico'], 'Três.', 4, 5],
      ['art66', [], 'Quatro.\n6º) a perda e a suspensão do pátrio poder. "', 6, 7],
      ['art67', [], 'Cinco.', 8, 8],
      ['art68', [], 'Seis.\nNa forma do regulamento:', 10, 11],
      ['art69', [], 'Sete.', 12, 12],
    ]);
    // Depois de ponto final, a linha em minúscula é sobra (a fonte a partiu: LC-SP 988, art. 159).
    expect(r.descartes).toEqual([{ motivo: 'sobra', linhas: { inicio: 9, fim: 9 } }]);
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

  it('rubrica que não chega a artigo nem a dispositivo é a última linha do anterior (sem sangria)', () => {
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
    // "Aumento de pena" é o nome do parágrafo (8.4); as outras duas continuam o último dispositivo.
    expect(
      todos(r.nos)
        .filter((n) => n.tipo === 'nome' && n.endereco.startsWith('art'))
        .map((n) => [n.endereco, textoDe(n.trechos)]),
    ).toEqual([['art1.par1.nome', 'Aumento de pena']]);
    expect(textoDe(porEndereco(r, 'art1.par1')?.trechos ?? [])).toBe(
      'A pena aumenta.\nRubrica antes do capítulo',
    );
    expect(textoDe(porEndereco(r, 'art2')?.trechos ?? [])).toBe('Dois.\nRubrica no fim');
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
    // A rubrica é do 185, que fica revogado (regra 9); o 186 não a recebe.
    expect(nome(r, 'art186')).toBeUndefined();
    expect(textoDe(nome(r, 'art185')?.trechos ?? [])).toBe(
      'Usurpação de nome ou pseudônimo alheio',
    );
    expect(porEndereco(r, 'art185')?.linhas).toEqual({ inicio: 3, fim: 5 });
    expect(porEndereco(r, 'art186')?.linhas).toEqual({ inicio: 6, fim: 6 });
    expect(r.descartes).toEqual([]);
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

describe('estruturador: caput, parágrafo, inciso, alínea e item (regra 6)', () => {
  /** [endereço, rótulo, rótulo lido, texto] de todos os dispositivos, em ordem. */
  const dispositivos = (r: Rascunho) =>
    todos(r.nos)
      .filter((n) => ['artigo', 'paragrafo', 'inciso', 'alinea', 'item'].includes(n.tipo))
      .map((n) => [n.endereco, n.rotulo, n.rotuloLido, textoDe(n.trechos)]);

  it('formas do rótulo no corpus e o endereço canônico (glossário §12)', () => {
    const r = estruturar(
      blocos(
        'Art. 5º Todos são iguais:',
        'I - homens e mulheres;', // inciso do caput, sem segmento `caput`
        'III -jurídica;', // LEP, sem espaço depois do hífen
        'IV as ilhas fluviais e lacustres;', // CF, sem hífen antes de minúscula
        'I-A o Conselho Nacional de Justiça;', // CF, sufixo sem separador
        'VI-A - (revogado);', // LEP
        '§ 1º - O produto da remuneração:',
        'a) à indenização dos danos;',
        'c ) os nascidos no estrangeiro;', // CF, espaço antes do parêntese
        'b)houve requisição.', // CP, sem espaço depois
        '§ 2º -A Considera-se que há razões:', // CP e ECA: espaço antes do hífen do sufixo
        '§ 2º-B. A pena é aumentada.',
        '§ 5.º Admitir-se-á o litisconsórcio.', // CDC
        '§ 10. Nos casos dos crimes hediondos.',
        '§ 2 As eleições serão realizadas.', // LC 80, sem ordinal
        'Parágrafo único. Texto.',
      ),
    );
    expect(dispositivos(r)).toEqual([
      ['art5', 'Art. 5º', 'Art. 5º', 'Todos são iguais:'],
      ['art5.incI', 'I', 'I -', 'homens e mulheres;'],
      ['art5.incIII', 'III', 'III -', 'jurídica;'],
      ['art5.incIV', 'IV', 'IV', 'as ilhas fluviais e lacustres;'],
      ['art5.incIA', 'I-A', 'I-A', 'o Conselho Nacional de Justiça;'],
      ['art5.incVIA', 'VI-A', 'VI-A -', ''], // "(revogado);" sozinho: revogado, texto vazio (8.6)
      ['art5.par1', '§ 1º', '§ 1º -', 'O produto da remuneração:'],
      ['art5.par1.alA', 'a)', 'a)', 'à indenização dos danos;'],
      ['art5.par1.alC', 'c)', 'c )', 'os nascidos no estrangeiro;'],
      ['art5.par1.alB', 'b)', 'b)', 'houve requisição.'],
      ['art5.par2A', '§ 2º-A', '§ 2º -A', 'Considera-se que há razões:'],
      ['art5.par2B', '§ 2º-B', '§ 2º-B.', 'A pena é aumentada.'],
      ['art5.par5', '§ 5º', '§ 5.º', 'Admitir-se-á o litisconsórcio.'],
      ['art5.par10', '§ 10', '§ 10.', 'Nos casos dos crimes hediondos.'],
      ['art5.par2', '§ 2º', '§ 2', 'As eleições serão realizadas.'],
      ['art5.parUnico', 'Parágrafo único', 'Parágrafo único.', 'Texto.'],
    ]);
    expect(daLeitura(r)).toEqual([]);
  });

  it('item: "1." e "1)" (Planalto), "1 -" (ALESP); milhar, ordinal e porcentagem não são item', () => {
    const r = estruturar(
      blocos(
        'Art. 83. Texto:',
        'b) com autorização:',
        '1) de ascendente;',
        '2. de colateral;',
        '3 - de tutor;',
        '1.000 (mil) reais por dia.',
        '6º) a perda do pátrio poder.',
        '10% (dez por cento) do total.',
      ),
    );
    expect(dispositivos(r).map(([e]) => e)).toEqual([
      'art83',
      'art83.alB',
      'art83.alB.it1',
      'art83.alB.it2',
      'art83.alB.it3',
    ]);
    expect(textoDe(porEndereco(r, 'art83.alB.it3')?.trechos ?? [])).toBe(
      'de tutor;\n1.000 (mil) reais por dia.\n6º) a perda do pátrio poder.\n10% (dez por cento) do total.',
    );
  });

  it('hierarquia por sequência: inciso sob o caput ou o último parágrafo, alínea sob o último inciso, item sob a última alínea; nível ausente é permitido', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Caput:',
        'I - um:',
        'a) alínea do inciso;',
        '1. item da alínea;',
        'II - dois;',
        '§ 1º Parágrafo:',
        'a) alínea direto no parágrafo (lei anterior à LC 95/1998: LEP, art. 29, § 1º);',
        '§ 2º Outro:',
        'I - inciso do parágrafo:',
        'a) alínea;',
        'II - volta ao inciso;',
        'Parágrafo único. Com item:',
        '1 - item direto no parágrafo (ALESP, art. 14).',
      ),
    );
    const pais = emOrdemDeLeitura(r.nos).flatMap(({ no, pai }) =>
      pai ? [[no.endereco, pai.endereco]] : [],
    );
    expect(pais).toEqual([
      ['art1.incI', 'art1'],
      ['art1.incI.alA', 'art1.incI'],
      ['art1.incI.alA.it1', 'art1.incI.alA'],
      ['art1.incII', 'art1'],
      ['art1.par1', 'art1'],
      ['art1.par1.alA', 'art1.par1'],
      ['art1.par2', 'art1'],
      ['art1.par2.incI', 'art1.par2'],
      ['art1.par2.incI.alA', 'art1.par2.incI'],
      ['art1.par2.incII', 'art1.par2'],
      ['art1.parUnico', 'art1'],
      ['art1.parUnico.it1', 'art1.parUnico'],
    ]);
    // A faixa do artigo e de cada dispositivo cobre as linhas dos filhos.
    expect(porEndereco(r, 'art1')?.linhas).toEqual({ inicio: 0, fim: 12 });
    expect(porEndereco(r, 'art1.incI')?.linhas).toEqual({ inicio: 1, fim: 3 });
    expect(porEndereco(r, 'art1.par2')?.linhas).toEqual({ inicio: 7, fim: 10 });
  });

  it('"Pena -" e "Pena Detenção…" (CDC) continuam o último dispositivo depois de uma quebra de linha; "Pena de multa" é rubrica', () => {
    const r = estruturar(
      blocos(
        'Art. 129. Ofender a integridade corporal:',
        'Pena - detenção, de três meses a um ano.',
        '§ 1º Se resulta:',
        'IV - aceleração de parto:',
        'Pena - reclusão, de um a cinco anos.', // continua o inciso IV (ordem de leitura)
        'Art. 63. Omitir dizeres:',
        'Pena Detenção de seis meses a dois anos e multa.',
        'Pena de multa',
        'Art. 49. A pena de multa consiste no pagamento.',
      ),
    );
    expect(textoDe(porEndereco(r, 'art129')?.trechos ?? [])).toBe(
      'Ofender a integridade corporal:\nPena - detenção, de três meses a um ano.',
    );
    expect(textoDe(porEndereco(r, 'art129.par1.incIV')?.trechos ?? [])).toBe(
      'aceleração de parto:\nPena - reclusão, de um a cinco anos.',
    );
    expect(textoDe(porEndereco(r, 'art63')?.trechos ?? [])).toBe(
      'Omitir dizeres:\nPena Detenção de seis meses a dois anos e multa.',
    );
    expect(nomeDe(porEndereco(r, 'art49'))).toBe('Pena de multa');
  });

  it('rubrica antes de parágrafo, inciso e alínea vira o nome dele (CP: "Aumento de pena", "Crime consumado")', () => {
    const r = estruturar(
      blocos(
        'Art. 14. Diz-se o crime:',
        'Crime consumado',
        'I - consumado, quando nele se reúnem todos os elementos;',
        'Art. 133. Abandonar pessoa:',
        'Aumento de pena (Incluído pela Lei nº 1, de 2000)',
        '§ 3º As penas aumentam-se de um terço.',
      ),
    );
    expect(nomeDe(porEndereco(r, 'art14.incI'))).toBe('Crime consumado');
    expect(porEndereco(r, 'art14.incI.nome')?.linhas).toEqual({ inicio: 1, fim: 1 });
    expect(porEndereco(r, 'art14.incI')?.linhas).toEqual({ inicio: 1, fim: 2 });
    const nome = porEndereco(r, 'art133.par3.nome');
    expect(textoDe(nome?.trechos ?? [])).toBe('Aumento de pena');
    expect(nome?.notas.map((n) => n.tipo)).toEqual(['incluido']);
  });

  it('rubrica seguida de dispositivo tachado de outro endereço é dele (CP, art. 121, § 2º, VI, "Feminicídio", revogado)', () => {
    const r = estruturar(
      blocos(
        'Art. 121. Matar alguém:',
        '§ 2º Se o homicídio é cometido:',
        'V - para assegurar a execução:',
        'Feminicídio',
        b(tachado('VI - contra a mulher: '), { texto: '(Revogado pela Lei nº 14.994, de 2024)' }),
        'VII – contra autoridade;',
        'Aumento de pena',
        b(tachado('§ 7º A pena é aumentada de 1/3.')),
        '§ 7º A pena do feminicídio é aumentada.',
      ),
    );
    expect(nomeDe(porEndereco(r, 'art121.par2.incVII'))).toBe('');
    // A rubrica do § 7º passa pela redação antiga tachada de mesmo endereço.
    expect(nomeDe(porEndereco(r, 'art121.par7'))).toBe('Aumento de pena');
    expect(porEndereco(r, 'art121.par7')?.redacoesAnteriores).toHaveLength(1);
    // A rubrica é o nome do inciso VI, revogado (regra 9).
    expect(nomeDe(porEndereco(r, 'art121.par2.incVI'))).toBe('Feminicídio');
    expect(porEndereco(r, 'art121.par2.incVI')).toMatchObject({ status: 'revogado', trechos: [] });
    expect(r.descartes).toEqual([]);
  });

  it('citação da lei alterada entre aspas continua o dispositivo, também em várias linhas (CDC, art. 113)', () => {
    const r = estruturar(
      blocos(
        'Art. 110. Acrescente-se o seguinte inciso:',
        '"IV - a qualquer outro interesse difuso ou coletivo".',
        'Art. 113. Acrescente-se os seguintes §§ 4º, 5º e 6º:',
        '"§ 4.º O requisito da pré-constituição poderá ser dispensado.',
        '§ 5.º Admitir-se-á o litisconsórcio.',
        '§ 6º Os órgãos públicos legitimados poderão tomar compromisso".',
        '§ 1º Este sim é parágrafo do art. 113.',
      ),
    );
    expect(dispositivos(r).map(([e]) => e)).toEqual(['art110', 'art113', 'art113.par1']);
    expect(textoDe(porEndereco(r, 'art113')?.trechos ?? []).split('\n')).toHaveLength(4);
  });

  it('linha em minúscula: continua a frase sem ponto final (aviso) ou é sobra da fonte', () => {
    const r = estruturar(
      blocos(
        'Art. 159. Aplicam-se aos membros os benefícios concedidos',
        'aos advogados em geral.', // LC-SP 988: a fonte quebrou o parágrafo
        'III - estímulo à participação;',
        'bracionalização na execução das funções;', // LC-SP 988, art. 6º: sobra
        'IV - racionalização na execução das funções;',
      ),
    );
    expect(textoDe(porEndereco(r, 'art159')?.trechos ?? [])).toBe(
      'Aplicam-se aos membros os benefícios concedidos aos advogados em geral.',
    );
    expect(textoDe(porEndereco(r, 'art159.incIII')?.trechos ?? [])).toBe(
      'estímulo à participação;',
    );
    expect(daLeitura(r).map((a) => [a.tipo, a.endereco, a.linha])).toEqual([
      ['linha_continuada', 'art159', 1],
      ['linha_solta', undefined, 3],
    ]);
    expect(r.descartes).toEqual([{ motivo: 'sobra', linhas: { inicio: 3, fim: 3 } }]);
  });

  it('linha só de notas vai para o último dispositivo (ALESP e Planalto)', () => {
    const r = estruturar(
      blocos(
        'Artigo 97 - Texto:',
        'X - compensação em razão de atividades; (NR)',
        '- Inciso X acrescentado pela Lei Complementar nº 1.295, de 02/01/2017.',
        'I - outro;',
        '(Incluído pela Lei nº 12.313, de 2010).',
      ),
    );
    // O "(NR)" do fim do texto (8.5) e depois a nota em linha própria.
    expect(porEndereco(r, 'art97.incX')?.notas.map((n) => n.texto)).toEqual([
      '(NR)',
      'Inciso X acrescentado pela Lei Complementar nº 1.295, de 02/01/2017.',
    ]);
    expect(textoDe(porEndereco(r, 'art97.incX')?.trechos ?? [])).toBe(
      'compensação em razão de atividades;',
    );
    expect(porEndereco(r, 'art97.incI')?.notas.map((n) => n.tipo)).toEqual(['incluido']);
    expect(porEndereco(r, 'art97')?.linhas.fim).toBe(4);
  });

  it('rótulo antigo tachado ao lado do novo: vale o de fora do tachado (ALESP)', () => {
    const r = estruturar(
      blocos(
        'Artigo 104 - Texto:',
        'X - compensação;',
        b(tachado('X'), ' ', 'XI -', ' outras previstas em lei.'),
        b(tachado('Parágrafo único'), ' ', '§ 1º -', ' O Defensor não perderá o direito.'),
      ),
    );
    expect(dispositivos(r)).toEqual([
      ['art104', 'Art. 104', 'Artigo 104 -', 'Texto:'],
      ['art104.incX', 'X', 'X -', 'compensação;'],
      ['art104.incXI', 'XI', 'X XI -', 'outras previstas em lei.'],
      ['art104.par1', '§ 1º', 'Parágrafo único § 1º -', 'O Defensor não perderá o direito.'],
    ]);
    // Regra 10 (8.6): o rótulo antigo tachado é a renumeração (ALESP, art. 134), não decorativo;
    // o tachado fica só no rótulo lido, sem virar redação anterior.
    expect(porEndereco(r, 'art104.incXI')).toMatchObject({
      status: 'renumerado',
      renumeradoDe: 'art104.incX',
      redacoesAnteriores: [],
    });
    expect(porEndereco(r, 'art104.par1')).toMatchObject({
      status: 'renumerado',
      renumeradoDe: 'art104.parUnico',
    });
    expect(porEndereco(r, 'art104.incX')?.status).toBe('vigente');
  });

  it('renumeração pela nota (regra 10): de onde veio, quando ela diz; o revogado continua revogado', () => {
    const r = estruturar(
      blocos(
        'Art. 29. O Município reger-se-á por lei orgânica:',
        'VIII - organização das funções legislativas; (Renumerado do inciso VI, pela Emenda Constitucional nº 1, de 1992)',
        'Art. 177. Constituem monopólio da União:',
        '§ 3º A lei disporá sobre o transporte. (Renumerado de § 2º para 3º pela Emenda Constitucional nº 9, de 1995)',
        'Art. 208. Regem-se pelas disposições desta Lei:',
        '§ 1º As hipóteses previstas neste artigo não excluem outras. (Renumerado do Parágrafo único pela Lei nº 11.259, de 2005)',
        'Art. 34. O trabalho do preso tem finalidade educativa.',
        '§ 1º A gerência poderá ser confiada a empresa pública. (Renumerado pela Lei nº 10.792, de 2003)',
        'Artigo 134 - São atribuições:',
        'XI - outras previstas em lei.',
        '- Inciso X renumerado para inciso XI pela Lei Complementar n° 1.295, de 02/01/2017.',
        'Art. 9º Texto.',
        '§ 2º (Revogado). (Renumerado do parágrafo único pela Lei nº 12.258, de 2010)',
      ),
    );
    const renumerados = todos(r.nos)
      .filter((n) => n.status === 'renumerado' || n.renumeradoDe)
      .map((n) => [n.endereco, n.status, n.renumeradoDe]);
    expect(renumerados).toEqual([
      ['art29.incVIII', 'renumerado', 'art29.incVI'],
      ['art177.par3', 'renumerado', 'art177.par2'],
      ['art208.par1', 'renumerado', 'art208.parUnico'],
      ['art34.par1', 'renumerado', undefined],
      ['art134.incXI', 'renumerado', 'art134.incX'],
      ['art9.par2', 'revogado', 'art9.parUnico'],
    ]);
  });

  it('nota de renumeração que começa pelo dispositivo (regra 7, 8.7): fora do texto, com o status e a origem quando ela diz', () => {
    const r = estruturar(
      blocos(
        'Art. 102. Compete ao Supremo Tribunal Federal:',
        '§ 1º A argüição de descumprimento de preceito fundamental será apreciada pelo Supremo Tribunal Federal, na forma da lei. (Transformado em § 1º pela Emenda Constitucional nº 3, de 17/03/93)',
        'Art. 153 - Divulgar alguém, sem justa causa, conteúdo de documento particular:',
        b(tachado('Parágrafo único - Somente se procede mediante representação.')),
        '§ 1º Somente se procede mediante representação. (Parágrafo único renumerado pela Lei nº 9.983, de 2000)',
        'Art. 198. As ações e serviços públicos de saúde integram uma rede regionalizada:',
        'III - participação da comunidade.',
        '§ 1º. O sistema único de saúde será financiado, além de outras fontes. (Parágrafo único renumerado para § 1º pela Emenda Constitucional nº 29, de 2000)',
      ),
    );
    const renumerados = todos(r.nos)
      .filter((n) => n.status === 'renumerado' || n.renumeradoDe)
      .map((n) => [n.endereco, n.status, n.renumeradoDe, textoDe(n.trechos), n.notas]);
    expect(renumerados).toEqual([
      [
        'art102.par1',
        'renumerado',
        undefined,
        'A argüição de descumprimento de preceito fundamental será apreciada pelo Supremo Tribunal Federal, na forma da lei.',
        [
          expect.objectContaining({
            texto: '(Transformado em § 1º pela Emenda Constitucional nº 3, de 17/03/93)',
            tipo: 'renumerado',
            lei: 'Emenda Constitucional nº 3',
            ano: 1993,
          }),
        ],
      ],
      [
        'art153.par1',
        'renumerado',
        'art153.parUnico',
        'Somente se procede mediante representação.',
        [
          expect.objectContaining({
            texto: '(Parágrafo único renumerado pela Lei nº 9.983, de 2000)',
            tipo: 'renumerado',
          }),
        ],
      ],
      [
        'art198.par1',
        'renumerado',
        'art198.parUnico',
        'O sistema único de saúde será financiado, além de outras fontes.',
        [
          expect.objectContaining({
            texto:
              '(Parágrafo único renumerado para § 1º pela Emenda Constitucional nº 29, de 2000)',
            tipo: 'renumerado',
          }),
        ],
      ],
    ]);
    // O parágrafo único tachado não tem vigente de mesmo endereço: a redação continua no artigo.
    expect(porEndereco(r, 'art153')?.redacoesAnteriores).toHaveLength(1);
    expect(porEndereco(r, 'art153.par1')?.redacoesAnteriores).toEqual([]);
  });

  it('nota que começa pelo dispositivo: inciso, alínea, item e parágrafo; o parêntese do texto da lei fica no texto', () => {
    const r = estruturar(
      blocos(
        'Art. 5º Texto:',
        'VII - sétimo; (Inciso VI renumerado pela Lei nº 1, de 2000)',
        'a) primeira; (Alínea b transformada em alínea a pela Lei nº 2, de 2001)',
        '1. primeiro; (Item 2 renumerado pela Lei nº 3, de 2002)',
        '§ 2º Segundo. (Parágrafo Renumerado pela Emenda Constitucional nº 33, de 2001)',
        '§ 3º Terceiro. (§ 2º renumerado para § 3º pela Lei nº 4, de 2003)',
        'Art. 120. A permissão de saída será concedida:',
        'II - necessidade de tratamento médico (parágrafo único do artigo 14).',
        'III - os cargos, que serão transformados em cargos da carreira (Transformação prevista em lei).',
      ),
    );
    expect(
      todos(r.nos)
        .filter((n) => n.tipo !== 'artigo')
        .map((n) => [n.endereco, n.status, n.renumeradoDe, n.notas.map((x) => x.tipo)]),
    ).toEqual([
      ['art5.incVII', 'renumerado', 'art5.incVI', ['renumerado']],
      ['art5.incVII.alA', 'renumerado', 'art5.incVII.alB', ['renumerado']],
      ['art5.incVII.alA.it1', 'renumerado', 'art5.incVII.alA.it2', ['renumerado']],
      ['art5.par2', 'renumerado', undefined, ['renumerado']],
      ['art5.par3', 'renumerado', 'art5.par2', ['renumerado']],
      ['art120.incII', 'vigente', undefined, []],
      ['art120.incIII', 'vigente', undefined, []],
    ]);
    expect(textoDe(porEndereco(r, 'art5.incVII.alA.it1')?.trechos ?? [])).toBe('primeiro;');
    expect(textoDe(porEndereco(r, 'art120.incII')?.trechos ?? [])).toBe(
      'necessidade de tratamento médico (parágrafo único do artigo 14).',
    );
  });

  it('nó estrutural renumerado pela nota da ALESP ("Subseção VII renumerada para VIII")', () => {
    const r = estruturar(
      blocos(
        'SEÇÃO IV',
        'Dos Órgãos',
        'SUBSEÇÃO VIII',
        '- Subseção VII renumerada para VIII pela Lei Complementar n° 1.434, de 11/09/2025.',
        'Dos Estagiários',
        'Artigo 71 - Texto.',
      ),
    );
    expect(porEndereco(r, 'sec4.subsec8')).toMatchObject({
      status: 'renumerado',
      renumeradoDe: 'sec4.subsec7',
    });
  });

  it('não é dispositivo: numeral romano inválido, capitular separada sem fim de inciso, maiúscula depois do inciso sem hífen', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto.',
        'CIVIL - não é inciso', // numeral inválido
        'I ncidência em interdição de direito', // capitular separada (CP de 1940)
        'IV As ilhas', // sem hífen, só antes de minúscula
      ),
    );
    expect(dispositivos(r).map(([e]) => e)).toEqual(['art1']);
  });

  it('mesmo endereço duas vezes sem tachado: vale o último, e o anterior vira redação anterior (CP, art. 141, § 2º)', () => {
    const r = estruturar(
      blocos(
        'Art. 141. As penas aumentam-se:',
        '§ 1º Se o crime é cometido mediante paga.',
        '§ 2º (VETADO). (Incluído pela Lei nº 13.964, de 2019)',
        'I - inciso do vetado;',
        '§ 2º Se o crime é cometido nas redes sociais, aplica-se em triplo a pena.',
        'II - inciso do novo;',
      ),
    );
    const par2 = porEndereco(r, 'art141.par2');
    expect(textoDe(par2?.trechos ?? [])).toBe(
      'Se o crime é cometido nas redes sociais, aplica-se em triplo a pena.',
    );
    expect(par2?.filhos.map((f) => f.endereco)).toEqual(['art141.par2.incI', 'art141.par2.incII']);
    expect(par2?.redacoesAnteriores).toEqual([
      {
        // Desde a 8.5, a nota sai do texto e vai para a `nota` da redação.
        trechos: [{ texto: '§ 2º' }, { texto: ' ' }, { texto: '(VETADO).' }],
        nota: '(Incluído pela Lei nº 13.964, de 2019)',
        origemDeteccao: 'heuristica',
        confirmada: false,
        linhas: { inicio: 2, fim: 3 },
      },
    ]);
    expect(todos(r.nos).filter((n) => n.endereco === 'art141.par2')).toHaveLength(1);
    expect(daLeitura(r).map((a) => [a.tipo, a.endereco, a.linha])).toEqual([
      ['duplicata', 'art141.par2', 2],
    ]);
  });

  it('texto puro: os dispositivos também ficam "a confirmar"', () => {
    const r = estruturar(blocos('Art. 1º A:', 'I - b;', 'a) c;'), { formato: 'texto' });
    expect(todos(r.nos).map((n) => [n.endereco, n.confianca])).toEqual([
      ['art1', 'a_confirmar'],
      ['art1.incI', 'a_confirmar'],
      ['art1.incI.alA', 'a_confirmar'],
    ]);
  });
});

describe('estruturador: bloco com numeração própria (8.4)', () => {
  const artigos = (r: Rascunho) =>
    todos(r.nos)
      .filter((n) => n.tipo === 'artigo')
      .map((n) => n.endereco);

  it('ADCT: título solto depois do fecho abre o bloco (nó na raiz, acima da estrutura) e prefixa os artigos', () => {
    const r = estruturar(
      blocos(
        'TÍTULO IX',
        'Das Disposições Constitucionais Gerais',
        'Art. 249. Texto.',
        'Art. 250. Texto:',
        'I - inciso.',
        'Brasília, 5 de outubro de 1988.',
        'ULYSSES GUIMARÃES',
        'Este texto não substitui o publicado no D.O.U.',
        'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
        '(Vide Emenda Constitucional nº 132, de 2023) Vigência',
        'Art. 1º. O Presidente prestará o compromisso.',
        'Art. 2º. No dia 7 de setembro de 1993:',
        '§ 1º Será assegurada a gratuidade.',
        'CAPÍTULO I',
        'DE UM CAPÍTULO NO BLOCO',
        'Art. 3º. Texto.',
        'Brasília, 5 de outubro de 1988.',
      ),
    );
    expect(artigos(r)).toEqual(['art249', 'art250', 'adct.art1', 'adct.art2', 'adct.art3']);
    const [titulo, bloco] = r.nos;
    expect(titulo?.endereco).toBe('tit9');
    expect(bloco).toMatchObject({
      tipo: 'bloco',
      endereco: 'adct',
      rotulo: 'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
      linhas: { inicio: 8, fim: 9 },
    });
    expect(bloco?.notas.map((n) => n.tipo)).toEqual(['vide', 'vigencia']);
    expect(bloco?.filhos.map((f) => f.endereco)).toEqual(['adct.art1', 'adct.art2', 'adct.cap1']);
    expect(porEndereco(r, 'adct.art2.par1')).toBeDefined();
    expect(porEndereco(r, 'adct.cap1.nome')).toBeDefined();
    expect(r.descartes).toEqual([
      { motivo: 'fecho', linhas: { inicio: 5, fim: 7 } },
      { motivo: 'fecho', linhas: { inicio: 16, fim: 16 } },
    ]);
  });

  it('disposições transitórias da LC-SP 988: o nome do nó que abre dá o prefixo, sem nó de bloco', () => {
    const r = estruturar(
      blocos(
        'TÍTULO VII',
        'Das Disposições Finais',
        'Artigo 243 - Texto.',
        'Artigo 244 - Esta lei complementar entra em vigor.',
        'TÍTULO VIII',
        'Das Disposições Transitórias',
        'Artigo 1º - Enquanto não for eleito:',
        '§ 1º - Competirá ao interino.',
        'Artigo 2º - Texto.',
      ),
    );
    expect(artigos(r)).toEqual(['art243', 'art244', 'dt.art1', 'dt.art2']);
    expect(porEndereco(r, 'dt.art1.par1')).toBeDefined();
    expect(todos(r.nos).some((n) => n.tipo === 'bloco')).toBe(false);
    expect(porEndereco(r, 'tit8')?.filhos.map((f) => f.endereco)).toEqual([
      'tit8.nome',
      'dt.art1',
      'dt.art2',
    ]);
  });

  it('sem título nem nome que diga o bloco: `bloco2`; prefixo repetido ganha número', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Um.',
        'Art. 2º Dois.',
        'Art. 1º De novo.',
        'Art. 2º Dois.',
        'CAPÍTULO I',
        'DISPOSIÇÕES TRANSITÓRIAS',
        'Art. 1º Três.',
        'Art. 2º Três.',
        'CAPÍTULO II',
        'OUTRAS DISPOSIÇÕES TRANSITÓRIAS',
        'Art. 1º Quatro.',
      ),
    );
    expect(artigos(r)).toEqual([
      'art1',
      'art2',
      'bloco2.art1',
      'bloco2.art2',
      'dt.art1',
      'dt.art2',
      'dt2.art1',
    ]);
  });

  it('art. 1º repetido sem numeração antes (maior que 1) não abre bloco: funde (vale o último)', () => {
    const r = estruturar(blocos('Art. 1º (VETADO).', 'Art. 1º Texto.', 'Art. 2º Dois.'));
    expect(artigos(r)).toEqual(['art1', 'art2']);
    expect(tipos(r)).toEqual(['duplicata']);
  });
});

describe('ordem de leitura (Dispositivo.ordem, 8.4)', () => {
  it('pré-ordem de 1 em diante: 9 < 9-A < 10, nome antes dos filhos, ADCT depois do corpo', () => {
    const r = estruturar(
      blocos(
        'TÍTULO I',
        'DO TÍTULO',
        'Art. 9º Nove:',
        'I - inciso;',
        'Art. 9º-A. Nove-A.',
        'Rubrica do dez',
        'Art. 10. Dez.',
        'Brasília, 5 de outubro de 1988.',
        'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
        'Art. 1º Um.',
      ),
    );
    const ordem = emOrdemDeLeitura(r.nos);
    expect(ordem.map((o) => [o.no.endereco, o.pai?.endereco, o.ordem])).toEqual([
      ['tit1', undefined, 1],
      ['tit1.nome', 'tit1', 2],
      ['art9', 'tit1', 3],
      ['art9.incI', 'art9', 4],
      ['art9A', 'tit1', 5],
      ['art10', 'tit1', 6],
      ['art10.nome', 'art10', 7],
      ['adct', undefined, 8],
      ['adct.art1', 'adct', 9],
    ]);
  });
});

describe('estruturador: notas de vigência (regra 7, 8.5)', () => {
  const notasDe = (no: NoRascunho | undefined) => no?.notas.map((n) => n.texto) ?? [];
  const texto = (r: Rascunho, endereco: string) => textoDe(porEndereco(r, endereco)?.trechos ?? []);

  it('as notas do fim da linha saem do texto, com espécie, lei, ano e link; as da pena vão para o mesmo dispositivo (CP, art. 159, § 3º)', () => {
    const r = estruturar(
      blocos(
        b(
          'Art. 159 - Seqüestrar pessoa com o fim de obter vantagem: ',
          { texto: '(Vide Lei nº 8.072, de 25.7.90)', link: 'https://www.planalto.gov.br/l8072' },
          ' ',
          { texto: 'Vigência', link: 'https://www.planalto.gov.br/v' },
        ),
        '§ 3º - Se resulta a morte: (Vide Lei nº 8.072, de 25.7.90)',
        'Pena - reclusão, de vinte e quatro a trinta anos. (Redação dada pela Lei nº 8.072, de 25.7.1990)',
      ),
    );
    expect(texto(r, 'art159')).toBe('Seqüestrar pessoa com o fim de obter vantagem:');
    expect(porEndereco(r, 'art159')?.notas).toEqual([
      {
        texto: '(Vide Lei nº 8.072, de 25.7.90)',
        tipo: 'vide',
        linha: 0,
        lei: 'Lei nº 8.072',
        ano: 1990,
        link: 'https://www.planalto.gov.br/l8072',
      },
      { texto: 'Vigência', tipo: 'vigencia', linha: 0, link: 'https://www.planalto.gov.br/v' },
    ]);
    // A nota no meio (antes da pena) também sai: cada linha perde as suas antes de emendar.
    expect(texto(r, 'art159.par3')).toBe(
      'Se resulta a morte:\nPena - reclusão, de vinte e quatro a trinta anos.',
    );
    expect(notasDe(porEndereco(r, 'art159.par3'))).toEqual([
      '(Vide Lei nº 8.072, de 25.7.90)',
      '(Redação dada pela Lei nº 8.072, de 25.7.1990)',
    ]);
    // Só as que alteram o texto contam para a mais recente ("Vide" não).
    expect(r.notaVigenciaMaisRecente).toEqual({ lei: 'Lei nº 8.072', ano: 1990 });
  });

  it('dispositivo só com nota: "(Revogado)" sozinho e a nota de revogação sem texto dão o revogado (regra 9); "(VETADO)", o vetado, com o texto', () => {
    const r = estruturar(
      blocos(
        'Art. 1º Texto:',
        'I - (revogado); (Redação dada pela Lei nº 14.843, de 2024)',
        'II - (VETADO) (Incluído pela Lei nº 14.197, de 2021) (Vigência)',
        'Art. 2º (Revogado pela Lei nº 10.713, de 13.8.2003)',
        'Artigo 54 - Revogado.', // ALESP
        'Artigo 6º - vetado.', // ALESP
      ),
    );
    expect(texto(r, 'art1.incI')).toBe('');
    expect(porEndereco(r, 'art1.incI')?.status).toBe('revogado');
    expect(texto(r, 'art1.incII')).toBe('(VETADO)');
    expect(porEndereco(r, 'art1.incII')?.status).toBe('vetado');
    expect(porEndereco(r, 'art2')?.status).toBe('revogado');
    expect(porEndereco(r, 'art54')).toMatchObject({ status: 'revogado', trechos: [] });
    expect(porEndereco(r, 'art6')).toMatchObject({
      status: 'vetado',
      trechos: [{ texto: 'vetado.' }],
    });
    expect(notasDe(porEndereco(r, 'art1.incII'))).toEqual([
      '(Incluído pela Lei nº 14.197, de 2021)',
      '(Vigência)',
    ]);
    expect(texto(r, 'art2')).toBe('');
    expect(porEndereco(r, 'art2')?.notas.map((n) => [n.tipo, n.lei, n.ano])).toEqual([
      ['revogado', 'Lei nº 10.713', 2003],
    ]);
  });

  it('formas sem parênteses: "Vigência" e "Regulamento" soltos, nota sem parênteses (CP, art. 232-A), "Vide" solto, número solto (LEP, art. 18-A)', () => {
    const r = estruturar(
      blocos(
        'Art. 17. É livre a criação de partidos, observados os seguintes preceitos: Regulamento',
        'I - o crime é cometido com violência; ou Incluído pela Lei nº 13.445, de 2017 Vigência',
        '§ 2º - Aplica-se o disposto no § 3º do artigo anterior. Vide Lei nº 8.072, de 25.7.90',
        '§ 3º As ações atenderão aos presos e às presas. 7.627 (Incluído pela Lei nº 13.163, de 2015)',
        '§ 4º O regulamento disporá na forma do Regulamento.',
        'Art. 18. Texto. (Redação dada pela Emenda Constitucional nº 15, de 1996) Vide art. 96 - ADCT (Vide Lei Complementar nº 230, de 2026)',
      ),
    );
    expect(texto(r, 'art17')).toBe(
      'É livre a criação de partidos, observados os seguintes preceitos:',
    );
    expect(porEndereco(r, 'art17')?.notas.map((n) => n.tipo)).toEqual(['regulamento']);
    expect(texto(r, 'art17.incI')).toBe('o crime é cometido com violência; ou');
    expect(notasDe(porEndereco(r, 'art17.incI'))).toEqual([
      'Incluído pela Lei nº 13.445, de 2017',
      'Vigência',
    ]);
    expect(texto(r, 'art17.par2')).toBe('Aplica-se o disposto no § 3º do artigo anterior.');
    expect(notasDe(porEndereco(r, 'art17.par2'))).toEqual(['Vide Lei nº 8.072, de 25.7.90']);
    expect(texto(r, 'art17.par3')).toBe('As ações atenderão aos presos e às presas.');
    expect(porEndereco(r, 'art17.par3')?.notas.map((n) => [n.texto, n.tipo])).toEqual([
      ['7.627', 'outra'],
      ['(Incluído pela Lei nº 13.163, de 2015)', 'incluido'],
    ]);
    // "Regulamento" depois de palavra em minúscula é texto.
    expect(texto(r, 'art17.par4')).toBe('O regulamento disporá na forma do Regulamento.');
    expect(notasDe(porEndereco(r, 'art18'))).toEqual([
      '(Redação dada pela Emenda Constitucional nº 15, de 1996)',
      'Vide art. 96 - ADCT',
      '(Vide Lei Complementar nº 230, de 2026)',
    ]);
  });

  it('nota sem o parêntese de fecho (ECA, art. 233), "(NR)" da ALESP, ")" sobrando (CP, art. 313-A) e a pontuação depois da nota', () => {
    const r = estruturar(
      blocos(
        'Art. 233. (Revogado pela Lei nº 9.455, de 7.4.1997 :',
        'Art. 313-A. Inserir dados falsos com o fim de causar dano: (Incluído pela Lei nº 9.983, de 2000) )',
        'Art. 135-A. Exigir garantia como condição para o atendimento emergencial (Incluído pela Lei nº 12.653, de 2012).',
        'Artigo 97 - Compensação em razão de atividades. (NR)',
      ),
    );
    expect(texto(r, 'art233')).toBe('');
    expect(notasDe(porEndereco(r, 'art233'))).toEqual(['(Revogado pela Lei nº 9.455, de 7.4.1997']);
    expect(porEndereco(r, 'art233')?.notas[0]).toMatchObject({ lei: 'Lei nº 9.455', ano: 1997 });
    expect(texto(r, 'art313A')).toBe('Inserir dados falsos com o fim de causar dano:');
    expect(notasDe(porEndereco(r, 'art313A'))).toEqual(['(Incluído pela Lei nº 9.983, de 2000)']);
    expect(texto(r, 'art135A')).toBe(
      'Exigir garantia como condição para o atendimento emergencial.',
    );
    expect(porEndereco(r, 'art97')?.notas.map((n) => n.tipo)).toEqual(['nr']);
    expect(texto(r, 'art97')).toBe('Compensação em razão de atividades.');
  });

  it('nota sem o parêntese de fecho ao lado do tachado faz a linha tachada e revoga (ECA, art. 233)', () => {
    const r = estruturar(
      blocos(
        'Art. 232. Texto.',
        b(
          tachado('Art. 233. Submeter criança a tortura:'),
          ' (Revogado pela Lei nº 9.455, de 7.4.1997',
        ),
        b(
          tachado('Pena - reclusão de um a cinco anos.'),
          ' (Revogado pela Lei nº 9.455, de 7.4.1997 :',
        ),
        'Art. 234. Texto.',
      ),
    );
    expect(todos(r.nos).map((n) => n.endereco)).toEqual(['art232', 'art233', 'art234']);
    // Regra 9: revogado, de texto vazio; a nota de fora do tachado é dele, e cada linha tachada é
    // uma redação anterior (a pena também).
    const art233 = porEndereco(r, 'art233');
    expect(art233).toMatchObject({ status: 'revogado', trechos: [], confianca: 'alta' });
    expect(notasDe(art233)).toEqual(['(Revogado pela Lei nº 9.455, de 7.4.1997']);
    expect(art233?.redacoesAnteriores.map((x) => [textoDe(x.trechos), x.nota])).toEqual([
      ['Art. 233. Submeter criança a tortura:', undefined],
      ['Pena - reclusão de um a cinco anos.', '(Revogado pela Lei nº 9.455, de 7.4.1997'],
    ]);
    expect(r.descartes).toEqual([]);
  });

  it('linha só de notas logo depois de uma linha tachada é do artigo tachado, não do vigente de cima (CP, art. 214)', () => {
    const r = estruturar(
      blocos(
        'Art. 213. Texto. (Redação dada pela Lei nº 12.015, de 2009)',
        b(tachado('Art. 214 - Constranger alguém a praticar ato libidinoso:')),
        '(Revogado pela Lei nº 12.015, de 2009)',
        b(tachado('Pena - reclusão de dois a sete anos.')),
        'Art. 215. Texto.',
      ),
    );
    expect(notasDe(porEndereco(r, 'art213'))).toEqual([
      '(Redação dada pela Lei nº 12.015, de 2009)',
    ]);
    // Artigo só tachado (regra 8, sem o de mesmo endereço): revogado, com a nota e a pena na
    // mesma redação.
    const art214 = porEndereco(r, 'art214');
    expect(art214).toMatchObject({ status: 'revogado', trechos: [], confianca: 'alta' });
    expect(notasDe(art214)).toEqual(['(Revogado pela Lei nº 12.015, de 2009)']);
    expect(art214?.redacoesAnteriores.map((x) => [textoDe(x.trechos), x.linhas])).toEqual([
      [
        'Art. 214 - Constranger alguém a praticar ato libidinoso:\nPena - reclusão de dois a sete anos.',
        { inicio: 1, fim: 3 },
      ],
    ]);
    expect(r.descartes).toEqual([]);
  });

  it('notas do nó, da rubrica e da norma continuam fora do texto e entram na mais recente', () => {
    const r = estruturar(
      blocos(
        'LEI Nº 1, DE 1º DE JANEIRO DE 2000',
        '(Vide Lei nº 9.999, de 2025)',
        'Dispõe sobre algo.',
        'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
        'CAPÍTULO I',
        'DAS DISPOSIÇÕES GERAIS (Redação dada pela Lei nº 10.000, de 26.6.2014)',
        'Aumento de pena (Incluído pela Lei nº 10.001, de 2014)',
        'Art. 1º Texto. (Redação dada pela Lei nº 9.000, de 2019)',
      ),
    );
    expect(nomeDe(porEndereco(r, 'cap1'))).toBe('DAS DISPOSIÇÕES GERAIS');
    expect(nomeDe(porEndereco(r, 'art1'))).toBe('Aumento de pena');
    // 2019 é o maior ano; a "Vide" (2025) não conta.
    expect(r.notaVigenciaMaisRecente).toEqual({ lei: 'Lei nº 9.000', ano: 2019 });
  });
});
