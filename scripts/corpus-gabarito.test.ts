// @vitest-environment node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  GABARITOS,
  TAMANHO_AMOSTRA,
  ancorasPorBloco,
  conferirSequencia,
  cruzarComAncoras,
  inventariar,
  linhasDoHtml,
  montarGabarito,
  preservarConferencia,
  rotulo,
  separarNotas,
  serializarGabarito,
} from './corpus/gabarito.mjs';
import { gerarGabarito } from './corpus-gabarito.mjs';

const DIRETORIO = path.join(import.meta.dirname, '..', 'corpus', 'normas');
const HIFEN_SUAVE = String.fromCharCode(0xad);

/** Inventário de um colado sintético: um parágrafo por item. */
const inventario = (...paragrafos: string[]) =>
  inventariar(linhasDoHtml(paragrafos.map((p) => `<p>${p}</p>`).join('')));
const ADCT = {
  prefixo: 'adct',
  inicio: /^ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS$/,
  inicioNaPagina: /ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS/,
  ultimoAntes: 'art2',
};
const enderecos = (inv: ReturnType<typeof inventariar>) =>
  inv.dispositivos.map((d) => `${d.endereco}:${d.status}:${String(d.redacoes.length)}`);

describe('rótulo (casos tirados do corpus)', () => {
  it.each([
    ['Art. 1º - A execução penal', 'artigo', 1, ''],
    ['Art. 9o-A.  Os condenados', 'artigo', 9, 'A'],
    ['Art.  21-A. O censo', 'artigo', 21, 'A'],
    ['Art. 359-M-A. Quando os delitos', 'artigo', 359, 'MA'],
    ['Art. 10 - A assistência', 'artigo', 10, ''],
    ['§ 2º -A Considera-se', 'paragrafo', 2, 'A'],
    ['§ 1 o -A. Divulgar', 'paragrafo', 1, 'A'],
    ['§ 3o Será assegurado', 'paragrafo', 3, ''],
    ['Parágrafo único - Se a ofendida', 'paragrafo', 0, ''],
    ['III -jurídica;', 'inciso', 'III', ''],
    ['I – (Revogado);', 'inciso', 'I', ''],
    ['a) contra a vida', 'alinea', 'a', ''],
    ['TÍTULO II', 'titulo', 'II', ''],
    ['Seção I', 'secao', 'I', ''],
    ['PARTE ESPECIAL', 'parte', 'ESPECIAL', ''],
    ['CAPÍTULO II-B', 'capitulo', 'II-B', ''],
    ['Seção V-A', 'secao', 'V-A', ''],
    ['I-A o Conselho Nacional de Justiça;', 'inciso', 'I', 'A'],
    ['I receber as reclamações e denúncias;', 'inciso', 'I', ''],
    ['1 - Defensor Público do Estado Nível V', 'item', 1, ''],
    ['Artigo 20-A - No primeiro processo', 'artigo', 20, 'A'],
    ['ANEXO - Revogado.', 'anexo', '', ''],
  ])('%s', (linha, tipo, numero, sufixo) => {
    expect(rotulo(linha)).toMatchObject({ tipo, numero, sufixo });
  });

  it('"Pena", rubrica e citação no meio do texto não são dispositivo', () => {
    expect(rotulo('Pena - reclusão, de um a dois anos.').tipo).toBe('pena');
    expect(rotulo('Anterioridade da Lei').tipo).toBe('outro');
    expect(rotulo('nos termos do art. 5º desta Lei').tipo).toBe('outro');
    expect(rotulo('DO CRIME').tipo).toBe('outro');
    // Capitular separada numa rubrica tachada do CP de 1940: não termina como inciso.
    expect(rotulo('I ncidência em interdição de direito').tipo).toBe('outro');
    expect(rotulo('ANEXOS da lei').tipo).toBe('outro');
    // Numeral antigo e novo lado a lado (ALESP): o inventário usa o rótulo de fora do tachado.
    expect(rotulo('X XI - outras previstas em lei.').tipo).toBe('outro');
  });
});

describe('notas de vigência', () => {
  it('tira as notas do fim, com parênteses dentro, e deixa "(Revogado)" sozinho no texto', () => {
    expect(
      separarNotas('I - material; (Redação dada pela Lei nº 9.268, de 1º.4.1996) (Vigência)'),
    ).toEqual({
      texto: 'I - material;',
      notas: ['(Redação dada pela Lei nº 9.268, de 1º.4.1996)', '(Vigência)'],
    });
    expect(separarNotas('§ 2º (Revogado). (Redação dada pela Lei nº 12.234, de 2010)')).toEqual({
      texto: '§ 2º (Revogado).',
      notas: ['(Redação dada pela Lei nº 12.234, de 2010)'],
    });
  });

  it('número solto depois do fim da frase é link da fonte, não texto (LEP, art. 18-A, § 3º)', () => {
    expect(
      separarNotas('§ 3º O atendimento aos presos. 7.627 (Incluído pela Lei nº 13.163, de 2015)'),
    ).toEqual({
      texto: '§ 3º O atendimento aos presos.',
      notas: ['(Incluído pela Lei nº 13.163, de 2015)', '7.627'],
    });
    // Número que faz parte da frase fica.
    expect(separarNotas('Art. 1º Aplica-se a Lei nº 7.627.').texto).toBe(
      'Art. 1º Aplica-se a Lei nº 7.627.',
    );
  });

  it('"(NR)" da ALESP, "Vigência" solto depois de nota e nota sem parênteses no fim', () => {
    expect(separarNotas('IX - um representante de cada classe da carreira; (NR)')).toEqual({
      texto: 'IX - um representante de cada classe da carreira;',
      notas: ['(NR)'],
    });
    expect(
      separarNotas('§ 5º A amostra. (Redação dada pela Lei nº 15.295, de 2025) Vigência'),
    ).toEqual({
      texto: '§ 5º A amostra.',
      notas: ['(Redação dada pela Lei nº 15.295, de 2025)', 'Vigência'],
    });
    expect(
      separarNotas('I - com violência; ou Incluído pela Lei nº 13.445, de 2017 Vigência'),
    ).toEqual({
      texto: 'I - com violência; ou',
      notas: ['Incluído pela Lei nº 13.445, de 2017', 'Vigência'],
    });
    // "Vigência" no meio do texto, sem nota antes, é texto.
    expect(separarNotas('a vigência desta Lei').notas).toEqual([]);
  });
});

describe('linhas do colado', () => {
  it('separa o tachado por tag e por estilo; <s> só com ordinal é decorativo', () => {
    const [a, b, c] = linhasDoHtml(
      '<p><strike>Art. 6º - antigo</strike></p>' +
        '<p>Art. 6<s>o</s> A classificação <span style="text-decoration: line-through">x</span></p>' +
        `<p>Art. 7º - com hí${HIFEN_SUAVE}fen<br>Parágrafo único. Nos demais</p>`,
    );
    expect(a).toMatchObject({ vigente: '', anterior: 'Art. 6º - antigo', fracaoTachada: 1 });
    expect(b).toMatchObject({ vigente: 'Art. 6o A classificação', anterior: 'x' });
    expect(c).toMatchObject({ texto: 'Art. 7º - com hífen', fracaoTachada: 0 });
  });
});

describe('inventário', () => {
  it('redação tachada vai para o dispositivo de mesmo endereço; endereço por sequência', () => {
    const inv = inventario(
      'Art. 1º Caput.',
      'I - um;',
      'a) letra;',
      '§ 1º Parágrafo.',
      'I - inciso do parágrafo.',
      '<strike>Art. 2º - antigo.</strike>',
      'Art. 2º Novo. (Redação dada pela Lei nº 1, de 2000)',
      'Parágrafo único. Único.',
    );
    expect(enderecos(inv)).toEqual([
      'art1:vigente:0',
      'art1.incI:vigente:0',
      'art1.incI.alA:vigente:0',
      'art1.par1:vigente:0',
      'art1.par1.incI:vigente:0',
      'art2:vigente:1',
      'art2.parUnico:vigente:0',
    ]);
    expect(inv.dispositivos[5]).toMatchObject({
      texto: 'Novo.',
      notas: ['(Redação dada pela Lei nº 1, de 2000)'],
    });
  });

  it('revogação com texto tachado, reescrita como "(revogado)" e artigo só tachado', () => {
    const inv = inventario(
      'Art. 1º Caput:',
      'I - <strike>visita à família;</strike> (Revogado pela Lei nº 14.843, de 2024)',
      'I - (revogado); (Redação dada pela Lei nº 14.843, de 2024)',
      '<strike>Art. 2º - Atribuir falsamente:</strike>',
      '<strike>Pena - detenção.</strike> (Revogado pela Lei nº 10.695, de 1º.7.2003)',
      'Art. 3º Vigente.',
    );
    expect(enderecos(inv)).toEqual([
      'art1:vigente:0',
      'art1.incI:revogado:1',
      'art2:revogado:1',
      'art3:vigente:0',
    ]);
    expect(inv.dispositivos[2]?.notas).toEqual(['(Revogado pela Lei nº 10.695, de 1º.7.2003)']);
    expect(inv.casos.map((c) => c.tipo)).toEqual(['revogacao-reescrita', 'artigo-so-tachado']);
  });

  it('estrutura antiga tachada fica no ancestral; nó repetido sem artigo é substituído', () => {
    const inv = inventario(
      'TÍTULO VI',
      'DOS CRIMES CONTRA OS COSTUMES',
      'TÍTULO VI',
      'DOS CRIMES CONTRA A DIGNIDADE SEXUAL',
      'Anterioridade da Lei',
      '<strike>Art. 5º - antigo:</strike>',
      '<strike>I - os crimes:</strike>',
      'Art. 5º Novo.',
      'Pena - reclusão.',
      '§ 1º - (VETADO).',
      '§ 1º Incluído depois da derrubada do veto.',
    );
    expect(inv.estrutura).toEqual([
      {
        tipo: 'titulo',
        rotulo: 'TÍTULO VI',
        nome: 'DOS CRIMES CONTRA A DIGNIDADE SEXUAL',
        primeiroArtigo: 'art5',
      },
    ]);
    const [art5, par1] = inv.dispositivos;
    expect(art5).toMatchObject({ nome: 'Anterioridade da Lei', texto: 'Novo.\nPena - reclusão.' });
    expect(art5?.redacoes.map((r) => r.enderecoLido)).toEqual([undefined, 'art5.incI']);
    expect(par1).toMatchObject({ status: 'vigente', redacoes: [{ origem: 'duplicata' }] });
    expect(inv.casos.map((c) => c.tipo)).toEqual([
      'estrutural-substituido',
      'duplicata',
      'paragrafo-1-sem-2',
    ]);
  });
});

describe('fontes sem compilada (LC 80, ALESP, CF)', () => {
  it('nota em linha própria da ALESP vai para o dispositivo ou o nó; tachada, para a redação', () => {
    const inv = inventario(
      'SUBSEÇÃO VIII',
      'Dos Estagiários',
      '- Subseção VII renumerada para VIII pela Lei Complementar n° 1.434, de 11/09/2025.',
      'Artigo 1° - Caput:',
      '<s>IX - antigo.</s>',
      '<s>- Inciso IX com redação dada pela Lei Complementar n° 1.033, de 28/12/2007.</s>',
      'IX - novo. (NR)',
      '- Inciso IX com redação dada pela Lei Complementar n° 1.098, de 04/11/2009.',
      'X - Revogado.',
      '- Inciso X revogado pela Lei Complementar n° 1.112, de 25/05/2010.',
    );
    expect(inv.estrutura[0]?.notas).toEqual([
      'Subseção VII renumerada para VIII pela Lei Complementar n° 1.434, de 11/09/2025.',
    ]);
    const [, ix, x] = inv.dispositivos;
    expect(ix).toMatchObject({
      endereco: 'art1.incIX',
      texto: 'novo.',
      notas: ['(NR)', 'Inciso IX com redação dada pela Lei Complementar n° 1.098, de 04/11/2009.'],
    });
    expect(ix?.redacoes[0]?.texto).toContain(
      '\n- Inciso IX com redação dada pela Lei Complementar n° 1.033',
    );
    expect(x).toMatchObject({ endereco: 'art1.incX', status: 'revogado' });
    expect(inv.dispositivos.some((d) => d.nome)).toBe(false);
  });

  it('bloco com numeração própria prefixa os endereços; título solto vira nó', () => {
    const inv = inventariar(
      linhasDoHtml(
        [
          'Art. 1º Um.',
          'Art. 2º Dois.',
          'Parágrafo único. Só.',
          'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
          'Art. 1º Transitório.',
          '§ 1º Primeiro.',
          'Art. 1º-A Com letra.',
        ]
          .map((p) => `<p>${p}</p>`)
          .join(''),
      ),
      { blocos: [ADCT] },
    );
    expect(enderecos(inv)).toEqual([
      'art1:vigente:0',
      'art2:vigente:0',
      'art2.parUnico:vigente:0',
      'adct.art1:vigente:0',
      'adct.art1.par1:vigente:0',
      'adct.art1A:vigente:0',
    ]);
    expect(inv.estrutura).toEqual([
      {
        tipo: 'bloco',
        rotulo: 'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS',
        nome: '',
        primeiroArtigo: 'adct.art1',
      },
    ]);
    expect(conferirSequencia(inv, 'adct.art1A', [ADCT])).toEqual([]);
    expect(conferirSequencia(inv, 'adct.art1A', [{ ...ADCT, ultimoAntes: 'art3' }])).toMatchObject([
      { tipo: 'bloco', chave: 'adct.art1' },
    ]);
    expect(conferirSequencia(inv, 'adct.art1A', [])).toMatchObject([{ tipo: 'bloco' }]);
  });

  it('âncoras por bloco: o prefixo do ADCT sai do nome; página sem âncoras não cruza', () => {
    const pagina =
      '<a name="art1"></a>Art. 1º <a name="art2"></a>Art. 2º <a name="art3"></a>' +
      'ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS <a name="sadctart1"></a>' +
      '<a name="adctart1"></a>Art. 1º <a name="adctart1a"></a>Art. 1º-A';
    const ancoras = ancorasPorBloco(pagina, [ADCT]);
    expect(Object.fromEntries(ancoras)).toEqual({
      '': ['art1', 'art2', 'art3'],
      adct: ['art1', 'art1', 'art1a'],
    });
    const inv = inventariar(
      linhasDoHtml(
        '<p>Art. 1º Um.</p><p>Art. 2º Dois.</p><p>ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS</p>' +
          '<p>Art. 1º T.</p><p>Art. 1º-A T.</p><p>Art. 2º T.</p>',
      ),
      { blocos: [ADCT] },
    );
    expect(cruzarComAncoras(ancoras, inv)).toEqual([
      { tipo: 'ancora', chave: 'art3', detalhe: 'âncora sem artigo na página' },
      { tipo: 'artigo-sem-ancora', chave: 'adct.art2' },
    ]);
    expect([...ancorasPorBloco('<p>Artigo 1°</p>', []).values()].flat()).toEqual([]);
  });

  it('pedaço do rótulo fora do tachado, rótulo renumerado e anexo', () => {
    const inv = inventario(
      'Art. 1º Caput:',
      'III <strike>- classistas indicados.</strike> (Revogado pela Emenda Constitucional nº 24, de 1999)',
      'c<strike>) os nascidos no estrangeiro;</strike>',
      '<s>X</s> XI - outras previstas em lei.',
      '<s>Parágrafo único</s> § 1° - O Defensor Público não perderá.',
      'Palácio dos Bandeirantes, 9 de janeiro de 2006',
      '<s>ANEXO</s>',
      '<s>a que se refere o artigo 239</s>',
      'ANEXO - Revogado.',
      '- Anexo revogado pela Lei Complementar n° 1.112, de 25/05/2010.',
    );
    expect(enderecos(inv)).toEqual([
      'art1:vigente:0',
      'art1.incIII:revogado:2',
      'art1.incXI:vigente:1',
      'art1.par1:vigente:1',
      'anexo:revogado:1',
    ]);
    // A alínea "c" só tachada (sem vigente de mesmo endereço) vai para o inciso acima.
    expect(inv.dispositivos[1]?.redacoes.map((r) => r.enderecoLido)).toEqual([
      undefined,
      'art1.incIII.alC',
    ]);
    const anexo = inv.dispositivos[4];
    expect(anexo).toMatchObject({
      notas: ['Anexo revogado pela Lei Complementar n° 1.112, de 25/05/2010.'],
      redacoes: [{ texto: 'ANEXO\na que se refere o artigo 239', origem: 'tachado' }],
    });
    expect(anexo?.nome).toBeUndefined();
    expect(inv.casos.map((c) => c.tipo)).toEqual([
      'rotulo-renumerado',
      'tachado-parcial',
      'rotulo-renumerado',
      'tachado-parcial',
      'paragrafo-1-sem-2',
    ]);
  });
});

describe('acertos da 8.5 (o gabarito regerado uma vez só; examinados na página)', () => {
  it('pena sem hífen (CDC) é pena; "Pena de multa" continua rubrica (CP)', () => {
    expect(rotulo('Pena Detenção de seis meses a dois anos e multa.').tipo).toBe('pena');
    expect(rotulo('Pena de multa').tipo).toBe('outro');
    const inv = inventario(
      'Art. 64. Deixar de comunicar:',
      'Pena Detenção de seis meses a dois anos e multa.',
      'Art. 65. Executar serviço:',
    );
    expect(inv.dispositivos.map((d) => [d.endereco, d.nome ?? null, d.texto])).toEqual([
      ['art64', null, 'Deixar de comunicar:\nPena Detenção de seis meses a dois anos e multa.'],
      ['art65', null, 'Executar serviço:'],
    ]);
  });

  it('notas soltas, sem fecho e "Expressão substituída" saem do texto; "…do Regulamento." fica', () => {
    expect(separarNotas('Art. 17. Observados os seguintes preceitos: Regulamento')).toEqual({
      texto: 'Art. 17. Observados os seguintes preceitos:',
      notas: ['Regulamento'],
    });
    expect(
      separarNotas('DA POLÍTICA AGRÍCOLA E FUNDIÁRIA E DA REFORMA AGRÁRIA Regulamento'),
    ).toEqual({
      texto: 'DA POLÍTICA AGRÍCOLA E FUNDIÁRIA E DA REFORMA AGRÁRIA',
      notas: ['Regulamento'],
    });
    expect(separarNotas('Art. 1º Na forma do Regulamento').notas).toEqual([]);
    expect(
      separarNotas(
        'I - texto; (Incluído pela Emenda Constitucional nº 112, de 2021) Produção de efeitos',
      ),
    ).toEqual({
      texto: 'I - texto;',
      notas: ['(Incluído pela Emenda Constitucional nº 112, de 2021)', 'Produção de efeitos'],
    });
    expect(separarNotas('§ 2º - Aplica-se o disposto. Vide Lei nº 8.072, de 25.7.90')).toEqual({
      texto: '§ 2º - Aplica-se o disposto.',
      notas: ['Vide Lei nº 8.072, de 25.7.90'],
    });
    expect(separarNotas('(Revogado pela Lei nº 9.455, de 7.4.1997 :')).toEqual({
      texto: '',
      notas: ['(Revogado pela Lei nº 9.455, de 7.4.1997'],
    });
    expect(
      separarNotas(
        'Art. 21. O poder familiar. (Expressão substituída pela Lei nº 12.010, de 2009) Vigência',
      ),
    ).toEqual({
      texto: 'Art. 21. O poder familiar.',
      notas: ['(Expressão substituída pela Lei nº 12.010, de 2009)', 'Vigência'],
    });
  });

  it('citação entre aspas, também em várias linhas, continua o dispositivo (CDC, art. 113; ECA, art. 264)', () => {
    const inv = inventario(
      'Art. 113. Acrescente-se os §§ 4°, 5° e 6° ao art. 5º da Lei n.° 7.347:',
      '"§ 4.° O requisito da pré-constituição poderá ser dispensado.',
      '§ 5.° Admitir-se-á o litisconsórcio facultativo.',
      '§ 6° Os órgãos públicos poderão tomar compromisso".',
      'Art. 264. O art. 102 da Lei n.º 6.015 fica acrescido do seguinte item:',
      '"Art. 102 ....................',
      '6º) a perda e a suspensão do pátrio poder. "',
      'Art. 265. A Imprensa Nacional promoverá edição popular.',
    );
    expect(inv.dispositivos.map((d) => [d.endereco, d.nome ?? null])).toEqual([
      ['art113', null],
      ['art264', null],
      ['art265', null],
    ]);
    expect(inv.dispositivos[0]?.texto.split('\n')).toHaveLength(4);
  });

  it('pedaço do rótulo separado do tachado por um espaço (ECA, art. 90, IV; CP, art. 334, capitular)', () => {
    const inv = inventario(
      'Art. 90. As entidades:',
      'III - colocação familiar;',
      'I <strike>V - abrigo;</strike>',
      'IV - acolhimento institucional; (Redação dada pela Lei nº 12.010, de 2009) Vigência',
      'Descaminho',
      'A <strike>rt. 334 Importar mercadoria proibida:</strike>',
      'Art. 334. Iludir o pagamento de imposto.',
    );
    expect(inv.dispositivos.map((d) => [d.endereco, d.nome ?? null, d.redacoes.length])).toEqual([
      ['art90', null, 0],
      ['art90.incIII', null, 0],
      ['art90.incIV', null, 1],
      ['art334', 'Descaminho', 1],
    ]);
  });

  it('rubricas seguidas: a primeira é a última linha do dispositivo anterior (ECA, art. 258-C); o fecho não', () => {
    const inv = inventario(
      'Art. 258-C. Descumprir a proibição:',
      'Pena - multa de R$ 3.000,00.',
      'Medida Administrativa - interdição do estabelecimento. (Redação dada pela Lei nº 13.106, de 2015)',
      'Disposições Finais e Transitórias',
      'Art. 259. A União elaborará projeto de lei.',
      'Art. 260. Os contribuintes poderão deduzir.',
      'Brasília, 13 de julho de 1990; 169º da Independência e 102º da República.',
      'FERNANDO COLLOR',
    );
    const [a258C, a259, a260] = inv.dispositivos;
    expect(a258C?.texto).toBe(
      'Descumprir a proibição:\nPena - multa de R$ 3.000,00.\nMedida Administrativa - interdição do estabelecimento.',
    );
    expect(a258C?.notas).toEqual(['(Redação dada pela Lei nº 13.106, de 2015)']);
    expect(a259?.nome).toBe('Disposições Finais e Transitórias');
    expect(a260?.texto).toBe('Os contribuintes poderão deduzir.');
  });
});

describe('correções da revisão da etapa 7', () => {
  it('linha que continua o parágrafo, nome do nó em duas linhas e rubrica antes de tachado', () => {
    const inv = inventario(
      'TÍTULO XII',
      '(Incluído pela Lei nº 14.197, de 2021)',
      'DOS CRIMES CONTRA O ESTADO',
      'DEMOCRÁTICO DE DIREITO',
      'Artigo 159 - São invioláveis, bem como os concedidos',
      'aos advogados em geral.',
      'Aumento de pena',
      '<strike>§ 1º - antigo.</strike>',
      '§ 1º-A Novo.',
    );
    expect(inv.estrutura[0]?.nome).toBe('DOS CRIMES CONTRA O ESTADO DEMOCRÁTICO DE DIREITO');
    expect(inv.dispositivos[0]?.texto).toBe(
      'São invioláveis, bem como os concedidos aos advogados em geral.',
    );
    // A rubrica espera o próximo vigente: o parágrafo tachado não a captura.
    expect(inv.dispositivos[1]).toMatchObject({
      endereco: 'art159.par1A',
      nome: 'Aumento de pena',
    });
    expect(inv.casos.map((c) => c.tipo)).toEqual(['linha-continuada']);
  });

  it('revogado sob pai só tachado vai para o ancestral; vigente sem pai é acusado', () => {
    const inv = inventario(
      '<strike>Art. 187. Violar privilégio:</strike> (Revogado pela Lei nº 9.279, de 14.5.1996)',
      '<strike>Parágrafo único. A pena é aumentada:</strike>',
      '<strike>II - se o agente entrou em conluio.</strike> (Revogado pela Lei nº 9.279, de 14.5.1996)',
      '<strike>a) alínea do inciso revogado.</strike> (Revogado pela Lei nº 9.279, de 14.5.1996)',
      'Art. 188. Vigente:',
      '<strike>Parágrafo único. Antigo:</strike>',
      'I - vigente sob parágrafo tachado.',
    );
    expect(enderecos(inv)).toEqual([
      'art187:revogado:4',
      'art188:vigente:1',
      'art188.parUnico.incI:vigente:0',
    ]);
    expect(inv.dispositivos[0]?.redacoes.map((r) => r.enderecoLido)).toEqual([
      undefined,
      'art187.parUnico',
      'art187.parUnico.incII',
      'art187.parUnico.incII.alA',
    ]);
    expect(inv.casos.map((c) => `${c.tipo}:${c.endereco ?? ''}`)).toEqual([
      // Do raso ao fundo.
      'revogado-sem-pai:art187.parUnico.incII',
      'sem-pai:art188.parUnico.incI',
      'revogado-sem-pai:art187.parUnico.incII.alA',
    ]);
  });

  it('nó com o nome antigo tachado na mesma linha fica com o rótulo e o nome novo', () => {
    const inv = inventario(
      'TÍTULO VI <strike>DOS CRIMES CONTRA OS COSTUMES</strike> DOS CRIMES CONTRA A DIGNIDADE SEXUAL',
      'Art. 213. Constranger.',
    );
    expect(inv.estrutura[0]).toMatchObject({
      rotulo: 'TÍTULO VI',
      nome: 'DOS CRIMES CONTRA A DIGNIDADE SEXUAL',
    });
  });

  it('sem compilada: sinais, link com a âncora como na página e sem-pai como pendência', () => {
    const pagina = '<a name="art216A"></a><p>Art. 216-A. Constranger.</p>';
    const gabarito = montarGabarito(
      { id: 'teste', compilado: null, ultimoArtigo: 'art216A' },
      { sha256Conteudo: '0'.repeat(64), url: 'https://exemplo.gov.br/lei.htm', arquivo: 'lei.htm' },
      {
        paginaBruta: pagina,
        coladoHtml:
          '<p>Art. 216-A. Constranger.</p><p><strike>Parágrafo único. Antigo:</strike></p><p>I - órfão.</p>',
        coladoTexto: 'Art. 216-A. Constranger.',
        sha256: { 'teste.colado.html': '1'.repeat(64) },
      },
    );
    expect(gabarito.sinais).toEqual(['ancoras', 'texto-puro', 'sequencia']);
    expect(gabarito.entradas.compilada).toBeNull();
    expect(gabarito.origemSha256Colados).toEqual({ 'teste.colado.html': '1'.repeat(64) });
    expect(gabarito.amostra[0]?.link).toBe('https://exemplo.gov.br/lei.htm#art216A');
    expect(gabarito.pendencias).toEqual([
      {
        tipo: 'sem-pai',
        chave: 'art216A.parUnico.incI',
        detalhe: 'dispositivo vigente sob pai que não existe',
      },
    ]);
  });

  it('conferência desfeita guarda as observações e a data da conferência anterior', () => {
    const novo = montarGabarito(
      { id: 'teste', compilado: null, ultimoArtigo: 'art1' },
      { sha256Conteudo: '0'.repeat(64), url: 'https://exemplo.gov.br/lei.htm', arquivo: 'lei.htm' },
      { paginaBruta: '', coladoHtml: '<p>Art. 1º Um.</p>', coladoTexto: 'Art. 1º Um.' },
    );
    const anterior = {
      ...novo,
      contagens: { ...novo.contagens, dispositivos: 99 },
      conferencia: {
        estado: 'conferida' as const,
        por: 'Gabriel',
        em: '2026-09-24',
        observacoes: ['art. 1º bate'],
      },
    };
    const { gabarito, mudou } = preservarConferencia(anterior, novo);
    expect(mudou).toBe(true);
    expect(gabarito.conferencia).toEqual({
      estado: 'pendente',
      por: null,
      em: null,
      observacoes: [
        'Conferida em 2026-09-24 por Gabriel sobre um gabarito anterior; o gabarito mudou: conferir de novo.',
        'art. 1º bate',
      ],
    });
  });
});

describe('gabaritos do corpus (sem rede)', () => {
  it.each(GABARITOS.map((g) => [g.id, g] as const))(
    '%s: reproduzível, sem pendência, com amostra e último artigo',
    async (_id, alvo) => {
      const gerado = await gerarGabarito(DIRETORIO, alvo);
      const disco = await readFile(path.join(DIRETORIO, `${alvo.id}.gabarito.json`), 'utf8');
      const { gabarito, mudou } = preservarConferencia(JSON.parse(disco) as never, gerado);
      expect(mudou, 'gabarito desatualizado — rode npm run corpus:gabarito').toBe(false);
      expect(serializarGabarito(gabarito)).toBe(disco);
      expect(gerado.pendencias).toEqual([]);
      expect(gerado.amostra).toHaveLength(TAMANHO_AMOSTRA);
      const artigos = gerado.dispositivos.filter((d) =>
        /^(?:[a-z]+\.)?art\d+[A-Z]*$/.test(d.endereco),
      );
      expect(artigos.at(-1)?.endereco).toBe(alvo.ultimoArtigo);
      expect(new Set(gerado.dispositivos.map((d) => d.endereco)).size).toBe(
        gerado.dispositivos.length,
      );
    },
    30_000,
  );
});
