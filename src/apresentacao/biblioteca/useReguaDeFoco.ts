// A régua de foco por frase (pedido do Gabriel, 05/11/2026). Pinta com a API de realce do
// navegador (`CSS.highlights`): nenhum nó novo na lista, então os grifos, as notas e as remissões
// não se mexem, e os offsets seguem sendo os do texto gravado. O realce só muda cor e fundo; não
// há transição nem movimento, então vale igual no Calmo e com "reduzir movimento". Onde o navegador
// não tem a API, a régua não aparece (e a Conta avisa).
import { useEffect, type RefObject } from 'react';
import { frasesDoTexto, indiceDaFrase, type Frase } from './regua-de-foco';
import { CLASSE_DO_TEXTO, deslocamento, textosDe } from './selecao';

export const ACESA = 'regua-acesa';
export const APAGADA = 'regua-apagada';

export const temRealce = () =>
  typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight === 'function';

interface Foco {
  /** O `data-dispositivo` do texto vigente. */
  id: string;
  indice: number;
}

const SELETOR = `.${CLASSE_DO_TEXTO}[data-dispositivo]`;
const CAMPOS = 'select, input, textarea, [contenteditable]';

function pontoSob(x: number, y: number): { no: Node; offset: number } | undefined {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  // Chrome e Safari (webkit) têm só a segunda; Firefox e o Chrome novo, a primeira.
  if (typeof d.caretPositionFromPoint === 'function') {
    const posicao = d.caretPositionFromPoint(x, y);
    return posicao ? { no: posicao.offsetNode, offset: posicao.offset } : undefined;
  }
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const faixa = typeof d.caretRangeFromPoint === 'function' ? d.caretRangeFromPoint(x, y) : null;
  return faixa ? { no: faixa.startContainer, offset: faixa.startOffset } : undefined;
}

function faixaDe(textos: readonly Text[], inicio: number, fim: number): Range | undefined {
  let acumulado = 0;
  const faixa = document.createRange();
  let abriu = false;
  for (const t of textos) {
    const ate = acumulado + t.length;
    if (!abriu && inicio < ate) {
      faixa.setStart(t, inicio - acumulado);
      abriu = true;
    }
    if (abriu && fim <= ate) {
      faixa.setEnd(t, fim - acumulado);
      return faixa;
    }
    acumulado = ate;
  }
  return undefined;
}

/**
 * Liga a régua de foco por frase na caixa do Leitor: um toque no texto, ou Alt+↓ e Alt+↑, escolhe a
 * frase; o que não é ela esmaece (`::highlight(regua-apagada)`), e ela ganha fundo.
 */
export function useReguaDeFoco(raiz: RefObject<HTMLElement | null>, ligada: boolean) {
  useEffect(() => {
    const caixa = raiz.current;
    if (!ligada || !caixa || !temRealce()) return;
    let foco: Foco | null = null;
    let quadro = 0;
    let parada = 0;
    // Sem a API de mídia (jsdom) segue como se não houvesse cores forçadas.
    const forcadas =
      typeof matchMedia === 'function' ? matchMedia('(forced-colors: active)') : null;

    // Só o que aparece: no modo foco por artigo os vizinhos ficam em `display: none` e não podem receber a frase.
    const containers = () =>
      [...caixa.querySelectorAll<HTMLElement>(SELETOR)].filter(
        (el) => typeof el.checkVisibility !== 'function' || el.checkVisibility(),
      );
    const frasesDe = (el: Element) => {
      const textos = textosDe(el);
      return { textos, frases: frasesDoTexto(textos.map((t) => t.data).join('')) };
    };

    const naTela = (faixa: Range | undefined) => {
      // jsdom não mede faixas.
      if (!faixa || typeof faixa.getBoundingClientRect !== 'function') return false;
      const c = faixa.getBoundingClientRect();
      return c.bottom > 0 && c.top < innerHeight;
    };
    // A primeira frase à vista: depois de rolar, a régua acende uma que o leitor está vendo.
    function primeiraNaTela(todos: readonly HTMLElement[]): Foco | null {
      for (const el of todos) {
        const { textos, frases } = frasesDe(el);
        const indice = frases.findIndex((f) => naTela(faixaDe(textos, f.inicio, f.fim)));
        if (indice >= 0 && el.dataset.dispositivo) return { id: el.dataset.dispositivo, indice };
      }
      return null;
    }

    function pintar() {
      const acesa: Range[] = [];
      const apagada: Range[] = [];
      const todos = containers();
      if (!foco || !todos.some((el) => el.dataset.dispositivo === foco?.id)) {
        const primeiro = todos[0];
        foco =
          primeiraNaTela(todos) ??
          (primeiro?.dataset.dispositivo ? { id: primeiro.dataset.dispositivo, indice: 0 } : null);
      }
      // Em cores forçadas todo realce vira "seleção": esmaecer não se distingue, então só a frase acende.
      const esmaecer = !forcadas?.matches;
      for (const el of todos) {
        const { textos, frases } = frasesDe(el);
        const ativo = foco && el.dataset.dispositivo === foco.id ? frases[foco.indice] : undefined;
        if (!ativo) {
          const toda = document.createRange();
          toda.selectNodeContents(el);
          if (esmaecer) apagada.push(toda);
          continue;
        }
        const total = textos.reduce((s, t) => s + t.length, 0);
        for (const [i, f] of [
          [0, ativo.inicio],
          [ativo.fim, total],
        ] as const) {
          const r = i < f ? faixaDe(textos, i, f) : undefined;
          if (r && esmaecer) apagada.push(r);
        }
        const r = faixaDe(textos, ativo.inicio, ativo.fim);
        if (r) acesa.push(r);
      }
      CSS.highlights.set(ACESA, new Highlight(...acesa));
      CSS.highlights.set(APAGADA, new Highlight(...apagada));
    }
    const agendar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(pintar);
    };

    function escolher(el: HTMLElement, offset: number) {
      const { frases } = frasesDe(el);
      const indice = indiceDaFrase(frases, offset);
      if (indice < 0 || !el.dataset.dispositivo) return;
      foco = { id: el.dataset.dispositivo, indice };
      agendar();
    }

    const aoToque = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || e.target.closest('button, a, input, select, textarea'))
        return;
      const el = e.target.closest<HTMLElement>(SELETOR);
      const ponto = pontoSob(e.clientX, e.clientY);
      if (!el || !ponto || !el.contains(ponto.no)) return;
      escolher(el, deslocamento(textosDe(el), ponto.no, ponto.offset));
    };

    // Rolou e a frase acesa saiu da tela: a régua volta para a primeira que aparece.
    const aoRolar = () => {
      window.clearTimeout(parada);
      parada = window.setTimeout(() => {
        const el = containers().find((c) => c.dataset.dispositivo === foco?.id);
        const { textos, frases } = el ? frasesDe(el) : { textos: [], frases: [] };
        const ativo = foco ? frases[foco.indice] : undefined;
        if (foco && !(ativo && naTela(faixaDe(textos, ativo.inicio, ativo.fim)))) {
          foco = null;
          agendar();
        }
      }, 150);
    };

    const aoTeclado = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || !foco) return;
      // Alt+↓ abre a lista de um <select> (a barra do Leitor tem um): ali a tecla é dele.
      if (e.target instanceof Element && e.target.closest(CAMPOS)) return;
      const todos = containers();
      let i = todos.findIndex((el) => el.dataset.dispositivo === foco?.id);
      if (i < 0) return;
      let indice = foco.indice + (e.key === 'ArrowDown' ? 1 : -1);
      let { frases } = frasesDe(todos[i] as HTMLElement);
      if (indice >= frases.length || indice < 0) {
        i += e.key === 'ArrowDown' ? 1 : -1;
        const vizinho = todos[i];
        if (!vizinho) return;
        frases = frasesDe(vizinho).frases;
        indice = e.key === 'ArrowDown' ? 0 : frases.length - 1;
      }
      const alvo = todos[i];
      if (!alvo?.dataset.dispositivo || indice < 0) return;
      e.preventDefault();
      foco = { id: alvo.dataset.dispositivo, indice };
      pintar();
      alvo.scrollIntoView({ block: 'center' });
    };

    const observador = new MutationObserver(agendar);
    observador.observe(caixa, { childList: true, subtree: true });
    caixa.addEventListener('click', aoToque);
    document.addEventListener('keydown', aoTeclado);
    document.addEventListener('scroll', aoRolar, { capture: true, passive: true });
    forcadas?.addEventListener('change', agendar);
    agendar();
    return () => {
      cancelAnimationFrame(quadro);
      window.clearTimeout(parada);
      observador.disconnect();
      caixa.removeEventListener('click', aoToque);
      document.removeEventListener('keydown', aoTeclado);
      document.removeEventListener('scroll', aoRolar, { capture: true });
      forcadas?.removeEventListener('change', agendar);
      CSS.highlights.delete(ACESA);
      CSS.highlights.delete(APAGADA);
    };
  }, [raiz, ligada]);
}

export type { Frase };
