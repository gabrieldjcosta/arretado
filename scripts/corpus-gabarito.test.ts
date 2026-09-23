// @vitest-environment node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  GABARITOS,
  TAMANHO_AMOSTRA,
  inventariar,
  linhasDoHtml,
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
  ])('%s', (linha, tipo, numero, sufixo) => {
    expect(rotulo(linha)).toMatchObject({ tipo, numero, sufixo });
  });

  it('"Pena", rubrica e citação no meio do texto não são dispositivo', () => {
    expect(rotulo('Pena - reclusão, de um a dois anos.').tipo).toBe('pena');
    expect(rotulo('Anterioridade da Lei').tipo).toBe('outro');
    expect(rotulo('nos termos do art. 5º desta Lei').tipo).toBe('outro');
    expect(rotulo('DO CRIME').tipo).toBe('outro');
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
      const artigos = gerado.dispositivos.filter((d) => !d.endereco.includes('.'));
      expect(artigos.at(-1)?.endereco).toBe(alvo.ultimoArtigo);
      expect(new Set(gerado.dispositivos.map((d) => d.endereco)).size).toBe(
        gerado.dispositivos.length,
      );
    },
    30_000,
  );
});
