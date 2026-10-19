// O motor do quadro do cacto (D-D7, "A caneta que desenha"): pinta as partes já feitas e anda a
// caneta sobre o traço de hoje. Imperativo de propósito: o React só dá ao <svg> três grupos vazios
// (lavis, traços, caneta) e nunca olha dentro deles.
import { CURVA, esperar, suave, type Movimento } from '../../movimento';
import { PARTES, REPOUSO, type Fio, type Parte } from './cena';

const NS = 'http://www.w3.org/2000/svg';

export interface Camadas {
  lavis: SVGGElement;
  tracos: SVGGElement;
  caneta: SVGGElement;
}

const um = (n: number) => String(Math.round(n * 10) / 10);

/** O `transform` que põe a ponta da caneta deitada (65°) em (x, y) do quadro. */
export function posicaoDaCaneta(x: number, y: number): string {
  return `translate(${um(x)} ${um(y)}) scale(${String(REPOUSO.escala)}) translate(-32 -200) rotate(65 32 200)`;
}

/** Onde a caneta fica largada: a ponta no fim do chão desenhado, à direita do cacto. */
export const REPOUSO_DA_CANETA = posicaoDaCaneta(REPOUSO.x, REPOUSO.y);

function criar<K extends 'path' | 'circle'>(
  tag: K,
  atributos: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, String(valor));
  return el;
}

function traco(d: string, fio: Fio): SVGPathElement {
  const el = criar('path', {
    class: `quadro-fio quadro-cor-${fio.cor}`,
    d,
    'stroke-width': fio.largura,
  });
  if (fio.opacidade !== undefined) el.setAttribute('opacity', String(fio.opacidade));
  return el;
}

function lavisDe(fio: Fio): SVGPathElement | undefined {
  return fio.lavis
    ? criar('path', { class: `quadro-lavis-${fio.lavis.tipo}`, d: fio.lavis.area })
    : undefined;
}

const mioloDe = (centro: readonly [number, number]) =>
  criar('circle', { class: 'quadro-miolo', cx: centro[0], cy: centro[1], r: 2.6 });

const olhoDe = (olho: NonNullable<Fio['olho']>) =>
  criar('path', { class: 'quadro-olho', d: olho.d, 'stroke-width': olho.largura });

function pintarFio(c: Camadas, fio: Fio): void {
  const lavis = lavisDe(fio);
  if (lavis) c.lavis.append(lavis);
  c.tracos.append(traco(fio.d, fio));
  if (fio.miolo) c.tracos.append(mioloDe(fio.miolo));
  if (fio.olho) c.tracos.append(olhoDe(fio.olho));
}

/** A parte inteira, de uma vez, sem limpar o que já está no papel. */
export function pintarParte(c: Camadas, parte: Parte): void {
  for (const fio of parte.fios) pintarFio(c, fio);
}

/** Papel limpo e caneta largada. */
export function limpar(c: Camadas): void {
  c.lavis.replaceChildren();
  c.tracos.replaceChildren();
  c.caneta.setAttribute('transform', REPOUSO_DA_CANETA);
}

/** As partes de 0 até `ate` (exclusive), já no papel, e a caneta largada. */
export function pintarAte(c: Camadas, ate: number): void {
  limpar(c);
  for (const parte of PARTES.slice(0, ate)) pintarParte(c, parte);
}

interface Trecho {
  el: SVGPathElement;
  comprimento: number;
  /** Quanto do fio vem antes deste trecho. */
  inicio: number;
}

/** O fio vira um trecho por subtraço (`M`), escondido e pronto para se desenhar. */
function preparar(c: Camadas, fio: Fio) {
  const lavis = lavisDe(fio);
  if (lavis) {
    lavis.setAttribute('opacity', '0');
    c.lavis.append(lavis);
  }
  let inicio = 0;
  const trechos = fio.d.split(/(?=M)/).map((d): Trecho => {
    const el = traco(d, fio);
    c.tracos.append(el);
    const comprimento = el.getTotalLength();
    el.style.strokeDasharray = String(comprimento);
    el.style.strokeDashoffset = String(comprimento);
    // Com o traço ainda por fazer, a ponta redonda do pontilhado apareceria como um ponto.
    el.style.visibility = 'hidden';
    const trecho = { el, comprimento, inicio };
    inicio += comprimento;
    return trecho;
  });
  return { trechos, total: inicio, lavis };
}

/** Anda o traço e a caneta até o fim do fio; `false` se o `sinal` abortou no meio. */
function correr(
  c: Camadas,
  trechos: readonly Trecho[],
  total: number,
  lavis: SVGPathElement | undefined,
  duracao: number,
  sinal: AbortSignal,
): Promise<boolean> {
  return new Promise((resolver) => {
    const t0 = performance.now();
    const passo = (agora: number) => {
      if (sinal.aborted) {
        resolver(false);
        return;
      }
      const progresso = Math.min(1, (agora - t0) / duracao);
      const suavizado = suave(progresso);
      const andado = suavizado * total;
      let ativo = trechos[0];
      for (const trecho of trechos) {
        const feito = Math.max(0, Math.min(trecho.comprimento, andado - trecho.inicio));
        trecho.el.style.strokeDashoffset = String(trecho.comprimento - feito);
        trecho.el.style.visibility = feito > 0 ? 'visible' : 'hidden';
        if (andado >= trecho.inicio) ativo = trecho;
      }
      // A aguada aparece na segunda metade do fio.
      lavis?.setAttribute('opacity', String(Math.max(0, Math.min(1, (suavizado - 0.45) / 0.55))));
      if (ativo) {
        const ponto = ativo.el.getPointAtLength(
          Math.max(0, Math.min(ativo.comprimento, andado - ativo.inicio)),
        );
        c.caneta.setAttribute('transform', posicaoDaCaneta(ponto.x, ponto.y));
      }
      if (progresso < 1) requestAnimationFrame(passo);
      else resolver(true);
    };
    requestAnimationFrame(passo);
  });
}

/** O miolo da flor brota ao fim do fio: de um ponto ao tamanho cheio, na curva do app. */
function brotar(grupo: SVGGElement, miolo: SVGCircleElement): void {
  miolo.style.transformBox = 'fill-box';
  miolo.style.transformOrigin = 'center';
  grupo.append(miolo);
  if (typeof miolo.animate === 'function') {
    miolo.animate(
      [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 180, easing: CURVA },
    );
  }
}

/**
 * Desenha a parte de hoje sobre o papel que já tem as anteriores. A caneta sai do repouso, anda
 * sobre cada fio enquanto ele se faz e volta a ser largada. Com movimento reduzido a parte já
 * aparece pronta e nada anda. Devolve `false` se o `sinal` abortou antes do fim.
 */
export async function desenharParte(
  c: Camadas,
  parte: Parte,
  movimento: Movimento,
  sinal: AbortSignal,
): Promise<boolean> {
  c.caneta.setAttribute('transform', REPOUSO_DA_CANETA);
  if (movimento === 'reduzido') {
    pintarParte(c, parte);
    return !sinal.aborted;
  }
  await esperar(200, sinal);
  for (const fio of parte.fios) {
    if (sinal.aborted) return false;
    const { trechos, total, lavis } = preparar(c, fio);
    const duracao = Math.max(520, Math.min(1100, total / 0.22));
    if (!(await correr(c, trechos, total, lavis, duracao, sinal))) return false;
    // Pronto, o fio volta a ser um traço só, igual ao pintado de uma vez (a opacidade não se soma nos cruzamentos).
    for (const trecho of trechos) trecho.el.remove();
    c.tracos.append(traco(fio.d, fio));
    lavis?.removeAttribute('opacity');
    if (fio.miolo) brotar(c.tracos, mioloDe(fio.miolo));
    if (fio.olho) c.tracos.append(olhoDe(fio.olho));
    await esperar(50, sinal);
  }
  await esperar(440, sinal);
  if (sinal.aborted) return false;
  c.caneta.setAttribute('transform', REPOUSO_DA_CANETA);
  return true;
}
