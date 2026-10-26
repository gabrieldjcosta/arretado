import type { Dispositivo } from '../../core/modelo';
import type { NoDaLeitura } from './leitor';
import {
  cobertura,
  concentracao,
  MapaDeIncidencia,
  parteCoberta,
  proximoTrecho,
  quadradosDoMapa,
  rotuloDoTrecho,
} from './mapa-da-norma';

type Esboco = [
  endereco: string,
  tipo: Dispositivo['tipo'],
  nivel: number,
  status?: Dispositivo['status'],
];

function nos(esbocos: Esboco[]): NoDaLeitura[] {
  return esbocos.map(([endereco, tipo, nivel, status = 'vigente'], i) => ({
    nivel,
    dispositivo: {
      id: `id-${endereco}`,
      normaId: 'n',
      endereco,
      categoria:
        tipo === 'artigo' || tipo === 'paragrafo' || tipo === 'inciso' ? 'normativo' : 'estrutural',
      tipo,
      ordem: i,
      rotulo:
        tipo === 'artigo' ? `Art. ${endereco.slice(3).replace(/([A-Z]+)$/, '-$1')}` : undefined,
      status,
      confianca: 'alta',
      criadoEm: '2026-01-01T00:00:00.000Z',
      atualizadoEm: '2026-01-01T00:00:00.000Z',
      excluidoEm: null,
      usuarioId: 'u',
    } as unknown as Dispositivo,
  }));
}

// Dois capítulos; o art. 4 é revogado; o 5-A tem sufixo.
const NOS = nos([
  ['cap1', 'capitulo', 0],
  ['cap1.nome', 'nome', 1],
  ['art1', 'artigo', 1],
  ['art1.nome', 'nome', 2],
  ['art1.par1', 'paragrafo', 2],
  ['art2', 'artigo', 1],
  ['art2.incI', 'inciso', 2],
  ['art3', 'artigo', 1],
  ['cap2', 'capitulo', 0],
  ['art4', 'artigo', 1, 'revogado'],
  ['art5', 'artigo', 1],
  ['art5A', 'artigo', 1],
  ['art6', 'artigo', 1],
]);

const MAPA = MapaDeIncidencia.parse({
  versao: 1,
  recorte: 'r',
  norma: 'n',
  artigos: [
    ['1', 1, 'alta'],
    ['2', 3, 'altissima'],
    ['3', 2, 'altissima'],
    ['4', 2, 'altissima'],
    ['5', 0.5, 'media'],
    ['5-A', 1, 'alta'],
  ],
});

describe('mapa da norma: quadrados', () => {
  it('um por artigo, na ordem, com o que está dentro dele e a classe do arquivo', () => {
    const q = quadradosDoMapa(NOS, MAPA);
    expect(q.map((x) => [x.rotulo, x.classe, x.peso, x.indice, x.fim, x.foraDeVigor])).toEqual([
      ['Art. 1', 'alta', 1, 2, 5, false],
      ['Art. 2', 'altissima', 3, 5, 7, false],
      ['Art. 3', 'altissima', 2, 7, 8, false],
      ['Art. 4', 'altissima', 2, 9, 10, true],
      ['Art. 5', 'media', 0.5, 10, 11, false],
      ['Art. 5-A', 'alta', 1, 11, 12, false],
      ['Art. 6', 'sem', 0, 12, 13, false],
    ]);
  });

  it('sem arquivo, todos ficam sem questão', () => {
    expect(quadradosDoMapa(NOS, undefined).every((x) => x.classe === 'sem' && x.peso === 0)).toBe(
      true,
    );
  });

  it('o arquivo recusa número ou faixa fora do formato', () => {
    expect(
      MapaDeIncidencia.safeParse({
        versao: 1,
        recorte: 'r',
        norma: 'n',
        artigos: [['x', 1, 'alta']],
      }).success,
    ).toBe(false);
    expect(
      MapaDeIncidencia.safeParse({
        versao: 1,
        recorte: 'r',
        norma: 'n',
        artigos: [['1', 1, 'muita']],
      }).success,
    ).toBe(false);
  });
});

describe('mapa da norma: cobertura', () => {
  const q = quadradosDoMapa(NOS, MAPA);

  it('conta o que está até o "lido até" e o artigo com marca dentro dele, só em vigor', () => {
    // Lido até o art. 2 (índice 5); marca no inciso do art. 2 e no art. 5-A.
    const c = cobertura(q, 5, new Set([6, 11]));
    expect(c.cobertos).toEqual([true, true, false, false, false, true, false]);
    expect(c.artigos).toBe(3);
    expect(c.total).toBe(6);
    expect(c.massa).toBe(5);
    expect(c.massaTotal).toBe(7.5);
    expect(parteCoberta(c)).toBeCloseTo(5 / 7.5);
  });

  it('sem leitura nem marca, nada coberto; sem arquivo, a parte sai pelos artigos', () => {
    const c = cobertura(q, undefined);
    expect(c.artigos).toBe(0);
    expect(parteCoberta(c)).toBe(0);
    const semArquivo = cobertura(quadradosDoMapa(NOS, undefined), 7);
    expect(parteCoberta(semArquivo)).toBeCloseTo(3 / 6);
  });

  it('concentração: as duas faixas de cima e a parte da massa que levam', () => {
    const c = concentracao(q);
    expect(c.artigos).toBe(4);
    expect(c.total).toBe(6);
    expect(c.parcela).toBeCloseTo(7 / 7.5);
  });
});

describe('mapa da norma: próximo trecho', () => {
  const q = quadradosDoMapa(NOS, MAPA);

  it('começa pelo primeiro da melhor faixa livre e segue pelos vizinhos de faixa igual ou melhor', () => {
    const t = proximoTrecho(q, cobertura(q, undefined).cobertos);
    expect(t).toEqual({ de: 1, ate: 2, artigos: 2, classe: 'altissima', minutos: 2 });
    expect(rotuloDoTrecho(q, t!)).toBe('arts. 2 a 3');
  });

  it('pula o coberto e o revogado, e desce de faixa quando a de cima acabou', () => {
    const t = proximoTrecho(q, cobertura(q, 7).cobertos);
    // Até o art. 3 lido; o 4 é revogado; sobram 5 (média) e 5-A (alta): a alta vem primeiro.
    expect(t).toEqual({ de: 5, ate: 5, artigos: 1, classe: 'alta', minutos: 1 });
    expect(rotuloDoTrecho(q, t!)).toBe('art. 5-A');
    const depois = proximoTrecho(q, cobertura(q, 7, new Set([11])).cobertos);
    expect(depois?.classe).toBe('media');
  });

  it('respeita o máximo de artigos e, sem arquivo ou tudo coberto, não há trecho', () => {
    const muitos = nos(
      Array.from({ length: 10 }, (_, i): Esboco => [`art${String(i + 1)}`, 'artigo', 0]),
    );
    const mapa = MapaDeIncidencia.parse({
      versao: 1,
      recorte: 'r',
      norma: 'n',
      artigos: muitos.map((_, i) => [String(i + 1), 1, 'altissima']),
    });
    const qq = quadradosDoMapa(muitos, mapa);
    expect(proximoTrecho(qq, cobertura(qq, undefined).cobertos)?.artigos).toBe(6);
    expect(proximoTrecho(qq, cobertura(qq, undefined).cobertos, 3)?.artigos).toBe(3);
    expect(proximoTrecho(qq, cobertura(qq, 9).cobertos)).toBeUndefined();
    expect(proximoTrecho(quadradosDoMapa(NOS, undefined), [])).toBeUndefined();
  });
});
