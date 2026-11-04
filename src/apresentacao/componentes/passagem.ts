// A passagem do cartão (D-D7, "A caneta que desenha"): ao responder, o cartão sai para a esquerda e o
// próximo entra pela direita, para a pessoa ver que passou para o seguinte. Anima o próprio cartão
// (opacidade e transformação), sem cópia nem camada por cima: sai, o React troca o conteúdo, entra.
import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { CURVA, esperar, movimentoAgora } from '../movimento';

/** A entrada parte de dentro da calha lateral (16 px no celular): de mais longe, a página rolaria de lado. */
const ENTRADA_PX = 12;
const SEM_SINAL = new AbortController().signal;
/** Para onde o cartão sai: -1 à esquerda (Errei, Difícil), 1 à direita (Fácil). */
export type Lado = -1 | 1;
const semErro = () => undefined;
/** A mola do mockup (`--f-mola`): passa um pouco do ponto e assenta. */
const MOLA = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

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

  const passar = useCallback(
    async (trabalho: Promise<unknown>, avancar: () => void, lado?: Lado) => {
      const movimento = movimentoAgora();
      const el = cartao.current;
      if (movimento === 'reduzido' || !el || typeof el.animate !== 'function') {
        await trabalho;
        avancar();
        return;
      }
      await Promise.all([trabalho, esperar(PAUSA_MS[movimento], SEM_SINAL)]);
      const anda = movimento === 'normal';
      // Com `lado` (a Revisão): o cartão sai de lado, girando, e o seguinte sobe da pilha de trás.
      const daPilha = anda && lado !== undefined;
      const saida = el.animate(
        daPilha
          ? [
              { transform: 'none', opacity: 1 },
              {
                transform: `translateX(${String(lado * 130)}%) rotate(${String(lado * 12)}deg)`,
                opacity: 0,
              },
            ]
          : anda
            ? [
                { transform: 'none', opacity: 1 },
                { transform: 'translateX(-28px)', opacity: 0 },
              ]
            : [{ opacity: 1 }, { opacity: 0 }],
        {
          duration: daPilha ? 380 : anda ? 190 : 150,
          easing: daPilha ? 'cubic-bezier(0.5, 0, 0.9, 0.5)' : anda ? CURVA : 'linear',
          fill: 'forwards',
        },
      );
      await saida.finished.catch(semErro);
      if (!el.isConnected) return;
      // O conteúdo novo já está no lugar quando o cartão volta a aparecer, só que ainda invisível.
      flushSync(avancar);
      saida.cancel();
      el.animate(
        daPilha
          ? [
              { transform: 'scale(0.94) translateY(10px)', opacity: 0.4 },
              { transform: 'none', opacity: 1 },
            ]
          : anda
            ? [
                { transform: `translateX(${String(ENTRADA_PX)}px)`, opacity: 0 },
                { transform: 'none', opacity: 1 },
              ]
            : [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: daPilha ? 400 : anda ? 210 : 170,
          easing: anda ? CURVA : 'linear',
          fill: 'backwards',
        },
      );
    },
    [],
  );

  /**
   * Virar o cartão (Motion não é preciso: é a Web Animations nativa, como a passagem): meia volta em Y até
   * o cartão ficar de perfil, o conteúdo troca (`trocar`) e a outra meia volta o traz de volta, com a mola do
   * app. Calmo: só esmaece e volta. Reduzido: troca na hora.
   */
  const virar = useCallback(async (trocar: () => void) => {
    const movimento = movimentoAgora();
    const el = cartao.current;
    if (movimento === 'reduzido' || !el || typeof el.animate !== 'function') {
      trocar();
      return;
    }
    const anda = movimento === 'normal';
    const ida = el.animate(
      anda
        ? [
            { transform: 'perspective(900px) rotateY(0deg)' },
            { transform: 'perspective(900px) rotateY(88deg)' },
          ]
        : [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: anda ? 140 : 120,
        easing: anda ? 'cubic-bezier(0.5, 0, 0.9, 0.5)' : 'linear',
        fill: 'forwards',
      },
    );
    await ida.finished.catch(semErro);
    if (!el.isConnected) return;
    flushSync(trocar);
    ida.cancel();
    el.animate(
      anda
        ? [
            { transform: 'perspective(900px) rotateY(-88deg)' },
            { transform: 'perspective(900px) rotateY(0deg)' },
          ]
        : [{ opacity: 0 }, { opacity: 1 }],
      { duration: anda ? 260 : 160, easing: anda ? MOLA : 'linear', fill: 'backwards' },
    );
  }, []);

  return { cartao, passar, virar };
}
