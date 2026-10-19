// A passagem do cartão (D-D7, "A caneta que desenha"): ao responder, o cartão sai para a esquerda e o
// próximo entra pela direita, para a pessoa ver que passou para o seguinte. Anima o próprio cartão
// (opacidade e transformação), sem cópia nem camada por cima: sai, o React troca o conteúdo, entra.
import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { CURVA, esperar, movimentoAgora } from '../movimento';

/** A entrada parte de dentro da calha lateral (16 px no celular): de mais longe, a página rolaria de lado. */
const ENTRADA_PX = 12;
const SEM_SINAL = new AbortController().signal;
const semErro = () => undefined;

/** Pausa depois do toque, em que o traço de seleção se desenha e a revisão é gravada. */
const PAUSA_MS = { calmo: 140, normal: 150 } as const;

/**
 * Devolve o `cartao` (a ref do elemento que passa) e `passar`, que espera a gravação e a pausa, faz
 * o cartão sair, chama `avancar` (que troca o conteúdo) e faz o novo entrar. Normal: sai 190 ms
 * (28 px para a esquerda e some), entra 210 ms (de 12 px à direita); Calmo: só esmaece, 150 e 170 ms;
 * Reduzido: troca na hora, sem pausa. Se a gravação falhar, nada anda e o erro sobe a quem chamou.
 */
export function usePassagemDeCartao() {
  const cartao = useRef<HTMLElement>(null);

  const passar = useCallback(async (trabalho: Promise<unknown>, avancar: () => void) => {
    const movimento = movimentoAgora();
    const el = cartao.current;
    if (movimento === 'reduzido' || !el || typeof el.animate !== 'function') {
      await trabalho;
      avancar();
      return;
    }
    await Promise.all([trabalho, esperar(PAUSA_MS[movimento], SEM_SINAL)]);
    const anda = movimento === 'normal';
    const saida = el.animate(
      anda
        ? [
            { transform: 'none', opacity: 1 },
            { transform: 'translateX(-28px)', opacity: 0 },
          ]
        : [{ opacity: 1 }, { opacity: 0 }],
      { duration: anda ? 190 : 150, easing: anda ? CURVA : 'linear', fill: 'forwards' },
    );
    await saida.finished.catch(semErro);
    if (!el.isConnected) return;
    // O conteúdo novo já está no lugar quando o cartão volta a aparecer, só que ainda invisível.
    flushSync(avancar);
    saida.cancel();
    el.animate(
      anda
        ? [
            { transform: `translateX(${String(ENTRADA_PX)}px)`, opacity: 0 },
            { transform: 'none', opacity: 1 },
          ]
        : [{ opacity: 0 }, { opacity: 1 }],
      { duration: anda ? 210 : 170, easing: anda ? CURVA : 'linear', fill: 'backwards' },
    );
  }, []);

  return { cartao, passar };
}
