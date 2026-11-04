// O movimento do Fio, como o mockup aprovado o faz (docs/design/fio/mockup-aprovado.html): animações da
// Web Animations API com `fill: 'both'`, três modos de movimento e esperas que se cancelam com a tela.
// O mockup é a fonte; aqui só mudou o que o React pede (cancelar ao desmontar, sem `innerHTML`).
import { useEffect, useRef } from 'react';

/**
 * `normal`: tudo se mexe. `calmo`: o mesmo, sem mola nem deslocamento (o que o mockup faz quando o sistema
 * pede menos movimento, ou no perfil Calmo). `reduzido`: nada anda, vai direto ao quadro final (o jsdom
 * não anima; é o modo dos testes de unidade).
 */
export type Modo = 'normal' | 'calmo' | 'reduzido';

/** Lido na hora de usar e nunca guardado: o sistema pode mudar a preferência com o app aberto. */
export function modoAgora(): Modo {
  if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') {
    return 'reduzido';
  }
  const janela: Partial<Pick<Window, 'matchMedia'>> = window;
  if (janela.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) return 'calmo';
  return document.documentElement.dataset.perfil === 'calmo' ? 'calmo' : 'normal';
}

/** Os mesmos nomes de curva do mockup (tokens `--mola`, `--sair`, `--trocar`). */
export const MOLA = 'cubic-bezier(.34,1.56,.64,1)';
export const SAIR = 'cubic-bezier(.2,.7,.2,1)';
export const TROCAR = 'cubic-bezier(.45,0,.25,1)';

const METADADOS_DO_QUADRO = new Set(['offset', 'easing', 'composite']);

/** O quadro final, aplicado direto no estilo (modo reduzido). */
function aplicarQuadro(el: Element, quadro: Keyframe | undefined) {
  if (!quadro || !('style' in el)) return;
  const estilo = (el as HTMLElement | SVGElement).style as unknown as Record<string, string>;
  for (const [chave, valor] of Object.entries(quadro)) {
    if (METADADOS_DO_QUADRO.has(chave) || valor === undefined || valor === null) continue;
    estilo[chave] = String(valor);
  }
}

/**
 * Anima `el` e devolve a promessa do fim (que também resolve se a animação for cancelada). Com `fill:
 * 'both'`, como no mockup: o quadro final fica valendo até alguém cancelar. No modo reduzido, aplica o
 * quadro final e resolve na hora.
 */
export function animar(
  el: Element | null | undefined,
  quadros: Keyframe[],
  opc?: KeyframeAnimationOptions,
): Promise<void> {
  if (!el) return Promise.resolve();
  if (modoAgora() === 'reduzido' || typeof el.animate !== 'function') {
    aplicarQuadro(el, quadros[quadros.length - 1]);
    return Promise.resolve();
  }
  return el.animate(quadros, { fill: 'both', ...opc }).finished.then(
    () => undefined,
    () => undefined,
  );
}

/** Tira do elemento (e do que há dentro dele) toda animação, deixando o estilo do CSS valer. */
export function cancelarAnimacoes(el: Element | null | undefined, comFilhos = false) {
  if (!el || typeof el.getAnimations !== 'function') return;
  el.getAnimations(comFilhos ? { subtree: true } : undefined).forEach((a) => {
    a.cancel();
  });
}

/** Anima e, no fim, solta o estado da animação (o mockup faz `getAnimations().forEach(cancel)`). */
export function animarEDeixar(
  el: Element | null | undefined,
  quadros: Keyframe[],
  opc?: KeyframeAnimationOptions,
): Promise<void> {
  return animar(el, quadros, opc).then(() => {
    cancelarAnimacoes(el);
  });
}

/**
 * Como `animarEDeixar`, mas solta só a animação que ele mesmo criou. O `animarEDeixar` cancela todas as do elemento (é o que o
 * mockup faz, onde nada mais anima o mesmo elemento); no app, uma que corre junto some no meio: o brilho da Frase achada pela
 * busca era cortado quando a descida dela acabava.
 */
export function animarEDeixarSo(
  el: Element | null | undefined,
  quadros: Keyframe[],
  opc?: KeyframeAnimationOptions,
): Promise<void> {
  if (!el) return Promise.resolve();
  if (modoAgora() === 'reduzido' || typeof el.animate !== 'function') {
    aplicarQuadro(el, quadros[quadros.length - 1]);
    return Promise.resolve();
  }
  const animacao = el.animate(quadros, { fill: 'both', ...opc });
  return animacao.finished
    .then(
      () => undefined,
      () => undefined,
    )
    .then(() => {
      animacao.cancel();
    });
}

/** Espera `ms`; resolve também se o sinal abortar (quem chama confere `sinal.aborted`). */
export function espera(ms: number, sinal?: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    if (sinal?.aborted) {
      resolver();
      return;
    }
    const fim = () => {
      window.clearTimeout(id);
      sinal?.removeEventListener('abort', fim);
      resolver();
    };
    const id = window.setTimeout(fim, ms);
    sinal?.addEventListener('abort', fim, { once: true });
  });
}

const JA_ABORTADO = (() => {
  const controle = new AbortController();
  controle.abort();
  return controle.signal;
})();

/**
 * Um sinal que aborta quando a tela sai: as esperas e os loops de quadro do Fio conferem `aborted` e
 * param (o mockup faz isso com `atual !== nome`). Antes de montar (e depois de desmontar), o sinal
 * já vem abortado.
 */
export function useSinal(): () => AbortSignal {
  const ref = useRef<AbortController | null>(null);
  useEffect(() => {
    const controle = new AbortController();
    ref.current = controle;
    return () => {
      controle.abort();
      ref.current = null;
    };
  }, []);
  return () => ref.current?.signal ?? JA_ABORTADO;
}

/** Quadro a quadro: chama `passo(tempoEmMs)` até devolver `false` ou o sinal abortar. */
export function aCadaQuadro(passo: (agora: number) => boolean, sinal?: AbortSignal): void {
  const quadro = (agora: number) => {
    if (sinal?.aborted) return;
    if (passo(agora)) window.requestAnimationFrame(quadro);
  };
  window.requestAnimationFrame(quadro);
}
