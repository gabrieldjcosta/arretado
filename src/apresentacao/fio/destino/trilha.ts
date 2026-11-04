// A geometria do caminho do Destino: uma curva suave (Catmull-Rom) pelos lugares na ordem da jornada, os
// pontos dos artigos entre um lugar e outro e as porteiras na divisa dos estados. Funções puras sobre
// coordenadas do desenho; quem desenha (o mapa) só põe o resultado na tela.
import { ORDEM_UF, type Uf } from './nordeste';

export interface Ponto {
  x: number;
  y: number;
}

/** Um lugar do caminho, com o estado a que pertence. */
export interface PontoDeEstado extends Ponto {
  uf: string;
}

/**
 * Uma posição no caminho: o trecho `seg` (entre o lugar `seg` e o `seg + 1`) e quanto dele já passou
 * (`t` de 0 a 1). O lugar `j` é `{ seg: j, t: 0 }`, ou, o que é a mesma coisa, `{ seg: j - 1, t: 1 }`.
 */
export interface Posicao {
  seg: number;
  t: number;
}

/** A posição do lugar `j`. */
export const posicaoDoLugar = (j: number): Posicao =>
  j <= 0 ? { seg: 0, t: 0 } : { seg: j - 1, t: 1 };

/** O ponto da curva entre o lugar `i` e o `i + 1`, com `t` de 0 a 1 (Catmull-Rom, pontas repetidas). */
export function pontoDaCurva(lugares: readonly Ponto[], i: number, t: number): Ponto {
  const ultimo = lugares.length - 1;
  const a = lugares[Math.max(0, i - 1)] as Ponto;
  const b = lugares[Math.min(ultimo, i)] as Ponto;
  const c = lugares[Math.min(ultimo, i + 1)] as Ponto;
  const d = lugares[Math.min(ultimo, i + 2)] as Ponto;
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (p0: number, p1: number, p2: number, p3: number) =>
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  return { x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) };
}

/** Quantos pedaços de reta formam cada trecho da curva. */
const PEDACOS_POR_TRECHO = 20;

/**
 * O caminho SVG da curva entre duas posições, em pontos densos. Sem trecho entre elas (a mesma posição
 * ou ordem trocada), devolve vazio.
 */
export function caminhoDoTrecho(lugares: readonly Ponto[], de: Posicao, ate: Posicao): string {
  if (ate.seg + ate.t <= de.seg + de.t) return '';
  const pontos: Ponto[] = [];
  const ultimoTrecho = lugares.length - 2;
  for (let i = Math.max(0, de.seg); i <= ate.seg && i <= ultimoTrecho; i += 1) {
    const t0 = i === de.seg ? de.t : 0;
    const t1 = i === ate.seg ? ate.t : 1;
    for (let k = 0; k <= PEDACOS_POR_TRECHO; k += 1) {
      pontos.push(pontoDaCurva(lugares, i, t0 + ((t1 - t0) * k) / PEDACOS_POR_TRECHO));
    }
  }
  if (pontos.length < 2) return '';
  return `M${pontos.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}`;
}

/** Os trechos que o estado ocupa: o lugar onde começa e quantos lugares tem. */
export interface FaixaDoEstado {
  inicio: number;
  lugares: number;
}

/** Onde cada estado começa na ordem dos lugares e quantos lugares tem (sem lugar: `lugares` zero). */
export function faixasDosEstados(ordem: readonly { uf: string }[]): Record<Uf, FaixaDoEstado> {
  const faixas = {} as Record<Uf, FaixaDoEstado>;
  for (const uf of ORDEM_UF) {
    const inicio = ordem.findIndex((l) => l.uf === uf);
    faixas[uf] = {
      inicio: Math.max(0, inicio),
      lugares: inicio < 0 ? 0 : ordem.filter((l) => l.uf === uf).length,
    };
  }
  return faixas;
}

/** Uma porteira: fica no meio do trecho que sai de um estado e entra no seguinte. */
export interface PortaDaTrilha extends Ponto, Posicao {
  /** O estado que a porteira fecha (a matéria dele passa por ela). */
  de: Uf;
  para: Uf;
}

/** As porteiras do caminho, uma em cada divisa, na ordem dos estados. */
export function portasDaTrilha(ordem: readonly PontoDeEstado[]): PortaDaTrilha[] {
  const portas: PortaDaTrilha[] = [];
  for (let i = 0; i < ordem.length - 1; i += 1) {
    const a = ordem[i] as PontoDeEstado;
    const b = ordem[i + 1] as PontoDeEstado;
    if (a.uf === b.uf) continue;
    portas.push({
      ...pontoDaCurva(ordem, i, 0.5),
      seg: i,
      t: 0.5,
      de: a.uf as Uf,
      para: b.uf as Uf,
    });
  }
  return portas;
}

/** Um ponto de artigo no caminho. */
export interface PassoDaTrilha extends Ponto, Posicao {}

/**
 * Onde ficam os pontos dos artigos do estado, na ordem em que o caminho os encontra: quatro em cada
 * trecho dentro do estado e dois antes da porteira (o resto do trecho de saída é do estado seguinte).
 */
export function passosDoEstado(ordem: readonly PontoDeEstado[], uf: string): PassoDaTrilha[] {
  const passos: PassoDaTrilha[] = [];
  for (let i = 0; i < ordem.length - 1; i += 1) {
    const a = ordem[i] as PontoDeEstado;
    const b = ordem[i + 1] as PontoDeEstado;
    if (a.uf !== uf) continue;
    const ts = a.uf !== b.uf ? [0.2, 0.36] : [0.2, 0.4, 0.6, 0.8];
    for (const t of ts) passos.push({ ...pontoDaCurva(ordem, i, t), seg: i, t });
  }
  return passos;
}
