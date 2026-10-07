import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import type { Gabarito } from '../../testes/gabarito';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  analisarEndereco,
  buscarTexto,
  chaveDeBusca,
  prepararBusca,
  resolverEndereco,
} from './busca';
import { abrirNorma } from './leitor';
import { criarRascunho, publicarVersao } from './servico';

const GABARITOS = import.meta.glob<Gabarito>('../../../corpus/normas/*.gabarito.json', {
  import: 'default',
  eager: false,
});

async function enderecosDe(id: string): Promise<Set<string>> {
  const gabarito = await GABARITOS[`../../../corpus/normas/${id}.gabarito.json`]?.();
  if (!gabarito) throw new Error(`sem gabarito: ${id}`);
  return new Set(gabarito.dispositivos.map((d) => d.endereco));
}

// Como o Gabriel escreve o endereço → o endereço canônico (8.2–8.4), que o gabarito da norma tem.
const CASOS: Record<'lep' | 'cp' | 'cf', [string, string][]> = {
  lep: [
    ['112', 'art112'],
    ['art. 112', 'art112'],
    ['Art 112', 'art112'],
    ['artigo 112', 'art112'],
    ['§ 2º do 112', 'art112.par2'],
    ['§ 2º do art. 112', 'art112.par2'],
    ['112, § 2º', 'art112.par2'],
    ['art. 112, §2º', 'art112.par2'],
    ['112 § 1', 'art112.par1'],
    ['9-A', 'art9A'],
    ['art. 9º-A', 'art9A'],
    ['9A', 'art9A'],
    ['art. 41, XV', 'art41.incXV'],
    ['inciso XV do art. 41', 'art41.incXV'],
    ['art. 41, inciso XV', 'art41.incXV'],
    ['art. 52, § 1º, I', 'art52.par1.incI'],
    ['inciso I do § 1º do art. 52', 'art52.par1.incI'],
    ['art. 146-C, parágrafo único, I', 'art146C.parUnico.incI'],
    ['parágrafo único do art. 146-C', 'art146C.parUnico'],
    ['art. 66, III, a', 'art66.incIII.alA'],
    ['alínea a do inciso III do art. 66', 'art66.incIII.alA'],
    ['art. 66, III, "a"', 'art66.incIII.alA'],
    ['66, iii, a)', 'art66.incIII.alA'],
  ],
  cp: [
    ['121, § 2º, VI', 'art121.par2.incVI'],
    ['art. 121, § 2º-A, I', 'art121.par2A.incI'],
    ['§ 2º-A do art. 121', 'art121.par2A'],
    ['359-M-A', 'art359MA'],
    ['art. 155, § 4º-A', 'art155.par4A'],
    ['art. 217-A', 'art217A'],
    ['art. 61, II, a', 'art61.incII.alA'],
    ['art. 33, § 2º, a', 'art33.par2.alA'],
    ['art. 121, caput', 'art121'],
  ],
  cf: [
    ['art. 5º, LXXIV', 'art5.incLXXIV'],
    ['5º, lxxiv', 'art5.incLXXIV'],
    ['inciso LXXIV do art. 5º', 'art5.incLXXIV'],
    ['art. 5o, LXXIV', 'art5.incLXXIV'],
    ['art. 37, § 4º', 'art37.par4'],
    ['art. 84, XIX', 'art84.incXIX'],
    ['art. 60, § 4º, IV', 'art60.par4.incIV'],
    ['art. 195, I, a', 'art195.incI.alA'],
    ['art. 76 do ADCT', 'adct.art76'],
    ['art. 76-B do ADCT', 'adct.art76B'],
    ['ADCT, art. 76', 'adct.art76'],
    ['art. 7º, XXXIV', 'art7.incXXXIV'],
  ],
};

describe('analisarEndereco: o endereço escrito como na lei (11.6)', () => {
  for (const [norma, casos] of Object.entries(CASOS)) {
    it(`casos da ${norma.toUpperCase()}, que o gabarito da norma tem`, async () => {
      const existentes = await enderecosDe(norma);
      for (const [texto, esperado] of casos) {
        expect(analisarEndereco(texto)[0], texto).toBe(esperado);
        expect(existentes.has(esperado), esperado).toBe(true);
      }
    });
  }

  it('letra que também é romano: inciso primeiro, alínea depois; depois do inciso, só alínea', () => {
    expect(analisarEndereco('art. 5º, i')).toEqual(['art5.incI', 'art5.alI']);
    expect(analisarEndereco('art. 26, II, c')).toEqual(['art26.incII.alC']);
    expect(analisarEndereco('art. 29, § 1º, b')).toEqual(['art29.par1.alB']);
    expect(analisarEndereco('art. 26, II, a, 1')).toEqual(['art26.incII.alA.it1']);
    expect(analisarEndereco('item 1 da alínea a do inciso II do art. 26')).toEqual([
      'art26.incII.alA.it1',
    ]);
  });

  it('milhar, artigo único, VI-A e "parágrafo único"', () => {
    expect(analisarEndereco('art. 1.000')).toEqual(['art1000']);
    expect(analisarEndereco('artigo único')).toEqual(['artUnico']);
    expect(analisarEndereco('art. 5º, VI-A')).toEqual(['art5.incVIA']);
    expect(analisarEndereco('112, parágrafo único')).toEqual(['art112.parUnico']);
    expect(analisarEndereco('§ único do 112')).toEqual(['art112.parUnico']);
  });

  it('texto comum, endereço sem artigo e tipo repetido não são endereço', () => {
    for (const texto of [
      '',
      '   ',
      'pena',
      'pena de reclusão',
      'trabalho do preso',
      'mil',
      'LXXIV',
      '§ 2º',
      'inciso II',
      'art. 5º, § 1º, § 2º',
      'art. 5º do art. 6º',
      'lei 8.072',
      'art. 5º e 6º',
      'art. 5º, inciso abc',
    ]) {
      expect(analisarEndereco(texto), texto).toEqual([]);
    }
  });
});

describe('resolverEndereco', () => {
  const existentes = new Set(['art112', 'art112.par1', 'art5', 'art5.alI']);
  const existe = (e: string) => existentes.has(e);

  it('o primeiro possível que a norma tem', () => {
    expect(resolverEndereco(['art5.incI', 'art5.alI'], existe)).toEqual({ endereco: 'art5.alI' });
    expect(resolverEndereco(['art112.par1'], existe)).toEqual({ endereco: 'art112.par1' });
  });

  it('sem ele, o ancestral mais próximo, dizendo o que faltou; sem nenhum, nada', () => {
    expect(resolverEndereco(['art112.par9.incII'], existe)).toEqual({
      endereco: 'art112',
      faltou: 'art112.par9.incII',
    });
    expect(resolverEndereco(['art999'], existe)).toBeUndefined();
    expect(resolverEndereco([], existe)).toBeUndefined();
  });
});

describe('busca por texto (11.6)', () => {
  it('a chave tem o comprimento do texto: sem acento, sem caixa, ordinal e traço unificados', () => {
    const texto = 'Art. 5º – É GARANTIDA a “Prestação”\nde serviço';
    const chave = chaveDeBusca(texto);
    expect(chave).toHaveLength(texto.length);
    expect(chave).toBe('art. 5o - e garantida a "prestacao" de servico');
  });

  const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
  const LEI: Bloco[] = [
    linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
    linha('Dispõe sobre a execução.'),
    linha('TÍTULO I'),
    linha('DA EXECUÇÃO PENAL'),
    linha('Remição'),
    linha('Art. 1º A execução penal tem por objetivo a integração social do condenado.'),
    linha('Parágrafo único. A remição será declarada pelo juiz da execução.'),
    linha('Art. 2º São deveres:'),
    linha('I - o trabalho;'),
    linha('II - a Execução da pena.'),
  ];

  async function aberta(repo: Repositorio) {
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const publicada = await publicarVersao(repo, versao.id);
    return abrirNorma(repo, publicada.norma.id);
  }

  it('acha sem acento e sem caixa, no texto, no nó estrutural e na rubrica, em ordem de leitura', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await aberta(repo);
    const buscaveis = await prepararBusca(repo, norma);
    const endereco = (i: number) => norma.nos[i]?.dispositivo.endereco;

    const execucao = buscarTexto(buscaveis, 'EXECUCAO', 50);
    expect(execucao.total).toBe(4);
    expect(execucao.achados.map((a) => endereco(a.indice))).toEqual([
      'tit1.nome',
      'art1',
      'art1.parUnico',
      'art2.incII',
    ]);
    for (const a of execucao.achados) {
      expect(chaveDeBusca(a.texto.slice(a.inicio, a.fim))).toBe('execucao');
    }

    expect(buscarTexto(buscaveis, 'remição', 50).achados.map((a) => endereco(a.indice))).toEqual([
      'art1.nome',
      'art1.parUnico',
    ]);
    // Espaços seguidos na consulta contam como um só (o texto gravado já vem normalizado, 8.1).
    const espaco = buscarTexto(buscaveis, 'a  execucao da', 50).achados;
    expect(espaco.map((a) => endereco(a.indice))).toEqual(['art2.incII']);
    const [achado] = espaco;
    expect(achado && achado.texto.slice(achado.inicio, achado.fim)).toBe('a Execução da');
  });

  it('limite na lista, total completo; consulta vazia não busca', async () => {
    const { repo } = await repositorioDeTeste();
    const norma = await aberta(repo);
    const buscaveis = await prepararBusca(repo, norma);
    const r = buscarTexto(buscaveis, 'a', 2);
    expect(r.achados).toHaveLength(2);
    expect(r.total).toBeGreaterThan(2);
    expect(buscarTexto(buscaveis, '   ', 50)).toEqual({ total: 0, achados: [] });
  });
});
