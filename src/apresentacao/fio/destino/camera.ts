// A câmera do mapa do Destino: onde ela olha (um retângulo do desenho) e como se move. Tudo em
// coordenadas do desenho (`Camera`) e em pixels da caixa que mostra o mapa (`Caixa`). Funções puras, sem
// DOM: quem escuta o toque e desenha (`useCamera`) só chama estas e põe o resultado na tela.
import type { Ponto } from './trilha';

/** Onde a câmera olha: o canto de cima à esquerda e a largura do que cabe na caixa (a altura vem da caixa). */
export interface Camera {
  x: number;
  y: number;
  w: number;
}

/** O tamanho, em pixels, da caixa que mostra o mapa. */
export interface Caixa {
  largura: number;
  altura: number;
}

/** O mais perto e o mais longe que a câmera vai: a largura do desenho que cabe na caixa. */
export const LARGURA_MINIMA = 220;
export const LARGURA_MAXIMA = 1700;

/** Passando desta largura, o mapa é visto de longe: aparecem as matérias e somem os artigos. */
export const LARGURA_DE_LONGE = 900;

/** Altura sobre largura da caixa (o jsdom e a caixa ainda sem medida usam a de um celular). */
export function proporcao(caixa: Caixa): number {
  const l = caixa.largura > 0 ? caixa.largura : 340;
  const a = caixa.altura > 0 ? caixa.altura : 500;
  return a / l;
}

/** Quantos pixels da caixa vale uma unidade do desenho. */
export function escala(cam: Camera, caixa: Caixa): number {
  return (caixa.largura > 0 ? caixa.largura : 340) / cam.w;
}

export function centroDaCamera(cam: Camera, caixa: Caixa): Ponto {
  return { x: cam.x + cam.w / 2, y: cam.y + (cam.w * proporcao(caixa)) / 2 };
}

export function cameraNoCentro(centro: Ponto, w: number, caixa: Caixa): Camera {
  return { x: centro.x - w / 2, y: centro.y - (w * proporcao(caixa)) / 2, w };
}

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * A câmera que mostra todos os pontos, com `folga` (em unidades do desenho) em volta e pelo menos
 * `larguraMinima` de largura, ajustada à proporção da caixa.
 */
export function enquadrar(
  pontos: readonly Ponto[],
  folga: number,
  caixa: Caixa,
  larguraMinima = 0,
): Camera {
  const a = proporcao(caixa);
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  let w = Math.max(larguraMinima, x1 - x0 + 2 * folga);
  if ((y1 - y0 + 2 * folga) / w > a) w = (y1 - y0 + 2 * folga) / a;
  return cameraNoCentro({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, w, caixa);
}

/** Mantém o centro da câmera dentro do desenho (com uma margem), para a pessoa não perder o mapa. */
export function prender(cam: Camera, caixa: Caixa, limites: Caixa, margem = 300): Camera {
  const c = centroDaCamera(cam, caixa);
  const cx = limitar(c.x, -margem, limites.largura + margem);
  const cy = limitar(c.y, -margem, limites.altura + margem);
  return cameraNoCentro({ x: cx, y: cy }, cam.w, caixa);
}

/** Arrastar o dedo `dx` e `dy` pixels leva o desenho junto: a câmera anda para o outro lado. */
export function arrastar(cam: Camera, caixa: Caixa, dx: number, dy: number): Camera {
  const unidade = 1 / escala(cam, caixa);
  return { ...cam, x: cam.x - dx * unidade, y: cam.y - dy * unidade };
}

/**
 * Aproxima (`fator` menor que 1) ou afasta (maior que 1) mantendo parado o ponto do desenho que está
 * sob o pixel (`px`, `py`) da caixa.
 */
export function zoomEmPonto(
  cam: Camera,
  caixa: Caixa,
  px: number,
  py: number,
  fator: number,
): Camera {
  const unidade = 1 / escala(cam, caixa);
  const mundoX = cam.x + px * unidade;
  const mundoY = cam.y + py * unidade;
  const w = limitar(cam.w * fator, LARGURA_MINIMA, LARGURA_MAXIMA);
  const k = w / cam.w;
  return { x: mundoX - (mundoX - cam.x) * k, y: mundoY - (mundoY - cam.y) * k, w };
}

/** Aproxima ou afasta em torno do centro da caixa (os botões e o teclado). */
export function zoomNoCentro(cam: Camera, caixa: Caixa, fator: number): Camera {
  const l = caixa.largura > 0 ? caixa.largura : 340;
  const a = caixa.altura > 0 ? caixa.altura : 500;
  return zoomEmPonto(cam, caixa, l / 2, a / 2, fator);
}

/** Suaviza o progresso de 0 a 1: sai devagar, passa depressa, assenta. */
export const suavizar = (k: number): number => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

/**
 * A câmera entre duas, no instante `k` (0 a 1, já suavizado): o centro anda em linha reta e a largura
 * cresce ou encolhe por igual em proporção, então aproximar e afastar parecem a mesma velocidade.
 */
export function entreCameras(de: Camera, ate: Camera, caixa: Caixa, k: number): Camera {
  const c0 = centroDaCamera(de, caixa);
  const c1 = centroDaCamera(ate, caixa);
  const w = Math.exp(Math.log(de.w) + (Math.log(ate.w) - Math.log(de.w)) * k);
  return cameraNoCentro({ x: c0.x + (c1.x - c0.x) * k, y: c0.y + (c1.y - c0.y) * k }, w, caixa);
}

/** O retângulo de um rótulo na tela, em pixels da caixa; `prioridade` menor ganha o lugar. */
export interface RotuloEmTela {
  id: string;
  esq: number;
  topo: number;
  dir: number;
  base: number;
  prioridade: number;
}

/**
 * Quais rótulos ficam escondidos para nenhum cobrir outro: os de menor prioridade cedem. Guloso, na ordem
 * de prioridade. Um rótulo que passa da borda da caixa (com `margem` de folga) também cede: texto cortado
 * não se lê, e o ponto dele continua no mapa.
 */
export function esconderSobrepostos(
  rotulos: readonly RotuloEmTela[],
  caixa: Caixa,
  folgaX = 3,
  folgaY = 1,
  margem = 8,
): Set<string> {
  const escondidos = new Set<string>();
  const aceitos: RotuloEmTela[] = [];
  const ordenados = [...rotulos].sort((a, b) => a.prioridade - b.prioridade);
  for (const r of ordenados) {
    const fora =
      r.esq < margem ||
      r.topo < margem ||
      r.dir > caixa.largura - margem ||
      r.base > caixa.altura - margem;
    const bate = aceitos.some(
      (o) =>
        r.esq < o.dir + folgaX &&
        r.dir > o.esq - folgaX &&
        r.topo < o.base + folgaY &&
        r.base > o.topo - folgaY,
    );
    if (fora || bate) escondidos.add(r.id);
    else aceitos.push(r);
  }
  return escondidos;
}

/** A largura que um texto ocupa, por estimativa: bem perto o bastante para o rótulo não bater no vizinho. */
export function estimarLargura(texto: string, tamanho: number, folga = 0.58): number {
  return texto.length * tamanho * folga;
}
