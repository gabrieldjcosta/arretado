import {
  caminhoDoOlho,
  CORPO,
  contornoZe,
  EIXOS_DOS_OLHOS,
  espessuraDoOlho,
  FLOR,
  opacidadeDoHalo,
  PARAMETROS_DO_ZE,
  PONTO_DA_FLOR,
} from './geometria';
import { HUMORES, humorNoTamanho } from './humores';

describe('a geometria do Zé (D-D10)', () => {
  it('o contorno é o do mockup da Marca: um traço aberto, do pé esquerdo ao pé direito', () => {
    expect(CORPO.d).toBe(
      'M84 230V189A7 7 0 0 0 77 182A39 39 0 0 1 38 143V100A16 16 0 0 1 70 100V143A7 7 0 0 0 77 150A7 7 0 0 0 84 143V62A36 36 0 0 1 156 62V169A7 7 0 0 0 163 176A7 7 0 0 0 170 169V126A14 14 0 0 1 198 126V169A35 35 0 0 1 163 204A7 7 0 0 0 156 211V230',
    );
    // Aberto: nunca fecha (o contorno fechado e redondo era o que lia como fantasma), e são 19 segmentos depois do M.
    expect(CORPO.d).not.toMatch(/z/i);
    expect(CORPO.d.match(/[MVA]/g)).toHaveLength(20);
    // Os dois pés ficam na mesma altura, afastados pelo tronco.
    expect(CORPO.d.startsWith('M84 230')).toBe(true);
    expect(CORPO.d.endsWith('V230')).toBe(true);
  });

  it('é paramétrico: o tronco mais largo desloca os pés e o resto acompanha', () => {
    const largo = contornoZe({ ...PARAMETROS_DO_ZE, a: 40 });
    expect(largo.d).not.toBe(CORPO.d);
    expect(largo.d.startsWith('M80 230')).toBe(true);
    expect(largo.d.endsWith('V230')).toBe(true);
  });

  it('o braço esquerdo é mais alto que o direito, como na marca', () => {
    expect(CORPO.pontaL[1]).toBeLessThan(CORPO.pontaR[1]);
    expect(CORPO.pontaL).toEqual([54, 84]);
    expect(CORPO.pontaR).toEqual([184, 112]);
  });

  it('os olhos ficam a 18 do eixo (12,5 × 24 a 18, o do mockup): 102 e 138', () => {
    expect(PARAMETROS_DO_ZE.ed).toBe(18);
    expect([...EIXOS_DOS_OLHOS]).toEqual([102, 138]);
  });

  it('a flor nasce na ponta do braço direito e o ponto de luz fica acima da haste', () => {
    expect(FLOR.x).toBe(CORPO.pontaR[0]);
    expect(PONTO_DA_FLOR[1]).toBeLessThan(FLOR.y - FLOR.haste);
    expect(PONTO_DA_FLOR[0]).toBe(FLOR.x);
  });

  it('o olho é uma cápsula reta de pé e vira o arco "^" do olho contente', () => {
    expect(caminhoDoOlho(0)).toBe('M0 -5.75Q0 0 0 5.75');
    expect(caminhoDoOlho(1)).toBe('M-10 5Q0 -12 10 5');
    expect(caminhoDoOlho(0.5)).toBe('M-5 -0.38Q0 -6 5 5.38');
    // A cápsula é grossa (12,5); o arco, fino (7).
    expect(espessuraDoOlho(0)).toBe(12.5);
    expect(espessuraDoOlho(1)).toBe(7);
    // O halo de noite só acompanha o olho em arco: a cápsula fica nítida.
    expect(opacidadeDoHalo(0)).toBe(0);
    expect(opacidadeDoHalo(0.5)).toBe(0.25);
    expect(opacidadeDoHalo(1)).toBe(0.5);
  });
});

describe('os humores do Zé (D-D10)', () => {
  it('nenhum é triste e só o contente e a piscadela têm olho em arco', () => {
    expect(HUMORES.neutro.a).toEqual([0, 0]);
    expect(HUMORES.atento.a).toEqual([0, 0]);
    expect(HUMORES.contente.a).toEqual([1, 1]);
    expect(HUMORES.piscadela.a).toEqual([0, 1]);
    // Atento abre os olhos (mais altos e largos), nunca os fecha.
    expect(HUMORES.atento.sy).toBeGreaterThan(HUMORES.neutro.sy);
  });

  it('abaixo de 72 px o rosto é neutro: a expressão não se lê', () => {
    expect(humorNoTamanho('contente', 'grande')).toBe('contente');
    expect(humorNoTamanho('atento', 'medio')).toBe('atento');
    expect(humorNoTamanho('contente', 'pequeno')).toBe('neutro');
    expect(humorNoTamanho('piscadela', 'minimo')).toBe('neutro');
  });
});
