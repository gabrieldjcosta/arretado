// O trilho dos passos (`trilho()` e `faisca()` do mockup): uma linha com um nó por passo, o nó da vez aceso, e
// uma faísca que sobe do botão ao próximo nó antes de a tela trocar.
import { animar, modoAgora, TROCAR } from './anima';

/** Onde o primeiro nó fica e a distância entre os nós (px), como no mockup. */
export const Y0 = 8;
export const PASSO = 34;

/** A faísca sobe do botão até o próximo nó. Só no modo normal (nos outros, a tela troca direto). */
export async function faisca(
  trilho: Element | null,
  botao: Element,
  feitos: number,
): Promise<void> {
  if (modoAgora() !== 'normal' || !trilho) return;
  const f = trilho.querySelector('.m-faisca');
  const rt = trilho.getBoundingClientRect();
  const rb = botao.getBoundingClientRect();
  const de = rb.top + rb.height / 2 - rt.top - 6;
  const ate = Y0 + (feitos + 1) * PASSO - 4;
  await animar(
    f,
    [
      { top: `${String(de)}px`, opacity: 0 },
      { top: `${String(de)}px`, opacity: 1, offset: 0.1 },
      { top: `${String(ate)}px`, opacity: 1, offset: 0.85 },
      { top: `${String(ate)}px`, opacity: 0 },
    ],
    { duration: 520, easing: TROCAR },
  );
}
