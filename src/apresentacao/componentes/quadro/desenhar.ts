// O motor do quadro do cacto (D-D7, "A caneta que desenha"): pinta as partes já feitas e anda a
// caneta sobre o traço de hoje. Imperativo de propósito: o React só dá ao <svg> três grupos vazios
// (lavis, traços, caneta) e nunca olha dentro deles.
import { CURVA, documentoInativo, esperar, suave, type Movimento } from '../../movimento';
import { ANDANDO, mover, PARTES, REPOUSO, type Fio, type Parte } from './cena';

const NS = 'http://www.w3.org/2000/svg';

export interface Camadas {
  lavis: SVGGElement;
  tracos: SVGGElement;
  caneta: SVGGElement;
}

const um = (n: number) => String(Math.round(n * 10) / 10);

/**
 * O `transform` que põe a ponta da caneta (de pé, com a ponta em (60, 262) no desenho) em (x, y) do
 * quadro, na pose dada: andando sobre o traço, a menos que se peça outra.
 */
export function posicaoDaCaneta(
  x: number,
  y: number,
  pose: { escala: number; graus: number } = ANDANDO,
): string {
  return `translate(${um(x)} ${um(y)}) scale(${String(pose.escala)}) rotate(${String(pose.graus)}) translate(-60 -262)`;
}

/** Onde a caneta fica largada: quase deitada, sob o chão do desenho, à direita do cacto. */
export const REPOUSO_DA_CANETA = posicaoDaCaneta(REPOUSO.x, REPOUSO.y, REPOUSO);

function criar<K extends 'path' | 'circle'>(
  tag: K,
  atributos: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, String(valor));
  return el;
}

const traco = (d: string, fio: Fio) =>
  criar('path', {
    class: `quadro-fio quadro-cor-${fio.cor}`,
    d,
    'stroke-width': fio.largura,
  });

function lavisDe(fio: Fio): SVGPathElement | undefined {
  return fio.lavis
    ? criar('path', { class: `quadro-lavis-${fio.lavis.tipo}`, d: fio.lavis.area })
    : undefined;
}

const mioloDe = (centro: readonly [number, number]) =>
  criar('circle', { class: 'quadro-miolo', cx: centro[0], cy: centro[1], r: 2.6 });

const olhoDe = (olho: NonNullable<Fio['olho']>) =>
  criar('path', { class: 'quadro-olho', d: olho.d, 'stroke-width': olho.largura });

/** A marca de hoje (o marca-texto): uma mancha de 9 de raio, feita à mão, centrada no ponto. */
const MARCA =
  'M-8.8 -.6C-9 -5.9 -4.4 -9.4 1 -9.1C6.4 -8.8 9.8 -4.6 9.2 .9C8.6 6 4 9.2 -1 8.6C-6 8 -8.6 4.6 -8.8 -.6Z';

/**
 * A ponta do núcleo: um ponto de luz de 4 de raio e, na parte de hoje, um de 5,5 com a marca (lima de
 * dia) atrás. A marca vem primeiro, para ficar sob o ponto.
 */
function pontaDe(centro: readonly [number, number], hoje: boolean): SVGElement[] {
  const [cx, cy] = centro;
  if (!hoje) return [criar('circle', { class: 'quadro-ponto', cx, cy, r: 4 })];
  return [
    criar('path', { class: 'quadro-marca', d: mover(MARCA, cx, cy) }),
    criar('circle', { class: 'quadro-ponto quadro-hoje', cx, cy, r: 5.5 }),
  ];
}

function pintarFio(c: Camadas, fio: Fio, hoje: boolean): void {
  const lavis = lavisDe(fio);
  if (lavis) c.lavis.append(lavis);
  c.tracos.append(traco(fio.d, fio));
  if (fio.miolo) c.tracos.append(mioloDe(fio.miolo));
  if (fio.olho) c.tracos.append(olhoDe(fio.olho));
  if (fio.ponta) c.tracos.append(...pontaDe(fio.ponta, hoje));
}

/** A parte inteira, de uma vez, sem limpar o que já está no papel; `hoje` põe a marca no fim do núcleo. */
export function pintarParte(c: Camadas, parte: Parte, hoje = false): void {
  for (const fio of parte.fios) pintarFio(c, fio, hoje);
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
        try {
          const ponto = ativo.el.getPointAtLength(
            Math.max(0, Math.min(ativo.comprimento, andado - ativo.inicio)),
          );
          c.caneta.setAttribute('transform', posicaoDaCaneta(ponto.x, ponto.y));
        } catch (erro) {
          // A página recarregou no meio do traço: o quadro chegou depois de o documento ficar inativo.
          if (!documentoInativo(erro)) throw erro;
          resolver(false);
          return;
        }
      }
      if (progresso < 1) requestAnimationFrame(passo);
      else resolver(true);
    };
    requestAnimationFrame(passo);
  });
}

/** O miolo da flor e a ponta do núcleo brotam ao fim do fio: de um ponto ao tamanho cheio, na curva do app. */
function brotar(grupo: SVGGElement, el: SVGElement): void {
  el.style.transformBox = 'fill-box';
  el.style.transformOrigin = 'center';
  grupo.append(el);
  if (typeof el.animate === 'function') {
    el.animate(
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
    pintarParte(c, parte, true);
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
    if (fio.ponta) for (const el of pontaDe(fio.ponta, true)) brotar(c.tracos, el);
    await esperar(50, sinal);
  }
  await esperar(440, sinal);
  if (sinal.aborted) return false;
  c.caneta.setAttribute('transform', REPOUSO_DA_CANETA);
  return true;
}
