// A onda de luz do mockup (o `pointerdown` em `.acao`): em todo botão de ação, ao toque, nasce uma onda ciano
// onde o dedo tocou e se abre em 600 ms. Só no modo normal; o mockup a cria por fora dos componentes, num
// ouvinte do documento, e aqui é igual.
import { animar, modoAgora, SAIR } from './anima';

/** Liga a onda de luz; devolve quem a desliga. */
export function ligarOndaDeLuz(): () => void {
  const ouvir = (e: PointerEvent) => {
    if (modoAgora() !== 'normal') return;
    const botao = e.target instanceof Element ? e.target.closest<HTMLElement>('.m-acao') : null;
    if (!botao) return;
    const r = botao.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2;
    const onda = document.createElement('span');
    onda.className = 'm-onda';
    Object.assign(onda.style, {
      width: `${String(d)}px`,
      height: `${String(d)}px`,
      left: `${String(e.clientX - r.left - d / 2)}px`,
      top: `${String(e.clientY - r.top - d / 2)}px`,
    });
    botao.appendChild(onda);
    void animar(
      onda,
      [
        { transform: 'scale(0)', opacity: 0.9 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      { duration: 600, easing: SAIR, fill: 'none' },
    ).then(() => {
      onda.remove();
    });
  };
  document.addEventListener('pointerdown', ouvir);
  return () => {
    document.removeEventListener('pointerdown', ouvir);
  };
}
