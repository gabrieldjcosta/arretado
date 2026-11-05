import {
  LARGURA_MAXIMA,
  LARGURA_MINIMA,
  arrastar,
  centroDaCamera,
  enquadrar,
  entreCameras,
  escala,
  prender,
  proporcao,
  suavizar,
  zoomEmPonto,
  zoomNoCentro,
  type Camera,
  type Caixa,
} from './camera';

const caixa: Caixa = { largura: 400, altura: 600 };

describe('a câmera do mapa', () => {
  it('a proporção da caixa sem medida é a de um celular', () => {
    expect(proporcao({ largura: 0, altura: 0 })).toBeCloseTo(500 / 340, 5);
    expect(proporcao(caixa)).toBe(1.5);
  });

  it('enquadra os pontos com folga, na proporção da caixa e centrada', () => {
    const cam = enquadrar(
      [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
      50,
      caixa,
    );
    // Largura pela largura dos pontos (200) mais a folga dos dois lados (100) = 300; a altura que sobra é 450.
    expect(cam.w).toBe(300);
    const c = centroDaCamera(cam, caixa);
    expect(c.x).toBeCloseTo(200, 5);
    expect(c.y).toBeCloseTo(150, 5);
  });

  it('pontos muito altos alargam a câmera para caberem', () => {
    const cam = enquadrar(
      [
        { x: 100, y: 0 },
        { x: 120, y: 900 },
      ],
      0,
      caixa,
    );
    // 900 de altura pede 600 de largura (proporção 1,5).
    expect(cam.w).toBe(600);
  });

  it('respeita a largura mínima', () => {
    const cam = enquadrar([{ x: 10, y: 10 }], 10, caixa, 380);
    expect(cam.w).toBe(380);
  });

  it('arrastar para a direita leva o mapa junto: a câmera anda para a esquerda', () => {
    const cam: Camera = { x: 100, y: 100, w: 400 };
    const depois = arrastar(cam, caixa, 40, -20);
    expect(depois.x).toBeCloseTo(60, 5);
    expect(depois.y).toBeCloseTo(120, 5);
    expect(depois.w).toBe(400);
  });

  it('aproximar mantém parado o ponto sob o dedo', () => {
    const cam: Camera = { x: 0, y: 0, w: 800 };
    const px = 100;
    const py = 300;
    const antes = { x: cam.x + px / escala(cam, caixa), y: cam.y + py / escala(cam, caixa) };
    const depois = zoomEmPonto(cam, caixa, px, py, 0.5);
    expect(depois.w).toBe(400);
    const sob = {
      x: depois.x + px / escala(depois, caixa),
      y: depois.y + py / escala(depois, caixa),
    };
    expect(sob.x).toBeCloseTo(antes.x, 5);
    expect(sob.y).toBeCloseTo(antes.y, 5);
  });

  it('não passa do mais perto nem do mais longe', () => {
    const perto = zoomNoCentro({ x: 0, y: 0, w: 230 }, caixa, 0.1);
    expect(perto.w).toBe(LARGURA_MINIMA);
    const longe = zoomNoCentro({ x: 0, y: 0, w: 1600 }, caixa, 5);
    expect(longe.w).toBe(LARGURA_MAXIMA);
  });

  it('o zoom do centro mantém o centro da câmera', () => {
    const cam: Camera = { x: 100, y: 200, w: 600 };
    const antes = centroDaCamera(cam, caixa);
    const depois = centroDaCamera(zoomNoCentro(cam, caixa, 0.6), caixa);
    expect(depois.x).toBeCloseTo(antes.x, 5);
    expect(depois.y).toBeCloseTo(antes.y, 5);
  });

  it('prende o centro dentro do desenho, com uma margem', () => {
    const cam: Camera = { x: 5000, y: -4000, w: 400 };
    const presa = prender(cam, caixa, { largura: 1600, altura: 1700 });
    const c = centroDaCamera(presa, caixa);
    expect(c.x).toBe(1900);
    expect(c.y).toBe(-300);
    // Dentro dos limites, nada muda.
    const dentro: Camera = { x: 500, y: 500, w: 400 };
    expect(prender(dentro, caixa, { largura: 1600, altura: 1700 })).toEqual(dentro);
  });

  it('entre duas câmeras: no começo é a de saída, no fim é a de chegada, no meio a largura é a média em proporção', () => {
    const de: Camera = { x: 0, y: 0, w: 1600 };
    const ate: Camera = { x: 400, y: 600, w: 400 };
    const inicio = entreCameras(de, ate, caixa, 0);
    expect(inicio.w).toBeCloseTo(de.w, 5);
    expect(inicio.x).toBeCloseTo(de.x, 5);
    expect(inicio.y).toBeCloseTo(de.y, 5);
    const fim = entreCameras(de, ate, caixa, 1);
    expect(fim.x).toBeCloseTo(ate.x, 5);
    expect(fim.y).toBeCloseTo(ate.y, 5);
    expect(fim.w).toBeCloseTo(ate.w, 5);
    expect(entreCameras(de, ate, caixa, 0.5).w).toBeCloseTo(800, 5);
  });

  it('a suavização sai de 0, chega a 1 e passa de ponta a ponta sem voltar', () => {
    expect(suavizar(0)).toBe(0);
    expect(suavizar(1)).toBe(1);
    expect(suavizar(0.5)).toBe(0.5);
    let anterior = 0;
    for (let k = 0.05; k <= 1; k += 0.05) {
      const v = suavizar(k);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });
});
