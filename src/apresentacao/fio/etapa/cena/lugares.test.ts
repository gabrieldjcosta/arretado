import {
  CEU_POR_CIMA_DA_CAIXA,
  desenhoDoJuazeiro,
  estrelasDoCeu,
  FLORES_DO_JARDIM,
  lugarDaVereda,
  LUGARES_POR_VOLTA,
  luaEm,
  pousoNaVereda,
  pousosDaVolta,
} from './lugares';

describe('a vereda do pouso', () => {
  it('tem cinco lugares, cada um com título que termina em "Pode descansar."', () => {
    const nomes = Array.from({ length: LUGARES_POR_VOLTA }, (_, i) => lugarDaVereda(i));
    expect(nomes.map((l) => l.nome)).toEqual([
      'Juazeiro',
      'Carcará',
      'Açude',
      'Velho Chico',
      'Asa-branca',
    ]);
    for (const l of nomes) {
      expect(l.titulo.endsWith('Pode descansar.')).toBe(true);
      expect(l.desenho.length).toBeGreaterThan(40);
    }
  });

  it('o lugar dá a volta depois do quinto, também para trás', () => {
    expect(lugarDaVereda(5).nome).toBe('Juazeiro');
    expect(lugarDaVereda(7).nome).toBe('Açude');
    expect(lugarDaVereda(-1).nome).toBe('Asa-branca');
  });

  it('o pouso 1 é o juazeiro com uma flor e cada pouso planta mais uma, até cinco', () => {
    expect(pousoNaVereda(1)).toMatchObject({ numero: 1, flores: 1, lugar: { nome: 'Juazeiro' } });
    expect(pousoNaVereda(3)).toMatchObject({ numero: 3, flores: 3, lugar: { nome: 'Açude' } });
    expect(pousoNaVereda(5)).toMatchObject({ numero: 5, flores: 5, lugar: { nome: 'Asa-branca' } });
    expect(FLORES_DO_JARDIM).toHaveLength(5);
  });

  it('o jardim começa de novo a cada cinco pousos', () => {
    expect(pousoNaVereda(6)).toMatchObject({ numero: 6, flores: 1, lugar: { nome: 'Juazeiro' } });
    expect(pousoNaVereda(12)).toMatchObject({ numero: 12, flores: 2, lugar: { nome: 'Carcará' } });
  });

  it('número fora do possível vira o primeiro pouso', () => {
    expect(pousoNaVereda(0).numero).toBe(1);
    expect(pousoNaVereda(-4).numero).toBe(1);
    expect(pousoNaVereda(2.9).numero).toBe(2);
  });

  it('as pílulas mostram só o que já foi visitado na volta, do primeiro ao de agora', () => {
    expect(pousosDaVolta(1).map((p) => p.numero)).toEqual([1]);
    expect(pousosDaVolta(3).map((p) => p.lugar.nome)).toEqual(['Juazeiro', 'Carcará', 'Açude']);
    expect(pousosDaVolta(3).map((p) => p.flores)).toEqual([1, 2, 3]);
    expect(pousosDaVolta(5)).toHaveLength(5);
    // Na segunda volta o jardim recomeça, e os números seguem contando.
    expect(pousosDaVolta(7).map((p) => p.numero)).toEqual([6, 7]);
  });

  it('o juazeiro é sempre o mesmo desenho, com folhas', () => {
    const a = desenhoDoJuazeiro();
    expect(desenhoDoJuazeiro()).toBe(a);
    expect(lugarDaVereda(0).desenho).toBe(a);
    // O tronco, os galhos e os tufos de folha são traços que começam em `M`.
    expect((a.match(/ M/g) ?? []).length).toBeGreaterThan(150);
    expect(a).not.toMatch(/NaN|undefined/);
  });

  it('as estrelas são as mesmas para o mesmo lugar e cabem no céu', () => {
    const a = estrelasDoCeu(0);
    expect(estrelasDoCeu(0)).toEqual(a);
    expect(estrelasDoCeu(1)).not.toEqual(a);
    expect(a).toHaveLength(28);
    for (const e of a) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x).toBeLessThanOrEqual(320);
      expect(e.y).toBeLessThanOrEqual(130);
      // O céu que passa do topo da caixa fica por trás do rótulo do pouso: sem estrela ali.
      expect(e.y).toBeGreaterThan(CEU_POR_CIMA_DA_CAIXA);
      expect(e.r).toBeGreaterThan(0.2);
      expect(e.opacidade).toBeGreaterThan(0.1);
      expect(e.opacidade).toBeLessThanOrEqual(0.7);
    }
  });

  it('a faixa de céu por trás do rótulo não tem lua em nenhum lugar', () => {
    expect(CEU_POR_CIMA_DA_CAIXA).toBeCloseTo(22.67, 2);
    for (let i = 0; i < LUGARES_POR_VOLTA; i += 1) {
      const [, y] = lugarDaVereda(i).lua;
      // A ponta de cima do crescente fica 16 unidades acima do ponto dado.
      expect(y - 16).toBeGreaterThanOrEqual(CEU_POR_CIMA_DA_CAIXA);
    }
    // O juazeiro, com a lua à esquerda, é o que ficaria sob o texto do rótulo: ela desce da faixa.
    expect(lugarDaVereda(0).lua[1] - 16).toBeGreaterThanOrEqual(CEU_POR_CIMA_DA_CAIXA + 8);
  });

  it('a lua é um arco fechado a partir do ponto dado', () => {
    expect(luaEm(44, 36)).toBe('M44 20 a17 17 0 1 0 15 25 a13 13 0 1 1 -15 -25 z');
  });
});
