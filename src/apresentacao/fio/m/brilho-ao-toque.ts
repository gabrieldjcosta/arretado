// A alvorada do botão de ação e a onda do botão redondo (desvio 49 de `mockup/ajustes.css`): ao toque, o
// botão de ação (5b) ganha um degradê que sobe por ele em 900 ms e o botão redondo (7) solta um anel que cresce
// 1,5x e some em 1,1 s. Só no modo normal; no Calmo o botão de ação fica "Só contorno" e o redondo só muda de
// tom. Um ouvinte do documento, como o da onda de luz.
import { animar, modoAgora, SAIR } from './anima';

const ONDA = 'cubic-bezier(.25,.1,.25,1)';

function soltar(
  botao: HTMLElement,
  classe: string,
  quadros: Keyframe[],
  duracao: number,
  easing: string,
) {
  const luz = document.createElement('span');
  luz.className = classe;
  luz.setAttribute('aria-hidden', 'true');
  botao.appendChild(luz);
  void animar(luz, quadros, { duration: duracao, easing, fill: 'none' }).then(() => {
    luz.remove();
  });
}

/** Liga a alvorada e a onda do botão redondo; devolve quem as desliga. */
export function ligarBrilhoAoToque(): () => void {
  const ouvir = (e: PointerEvent) => {
    if (modoAgora() !== 'normal') return;
    const alvo = e.target instanceof Element ? e.target : null;
    const acao = alvo?.closest<HTMLElement>('.m-acao');
    if (acao && !acao.hasAttribute('disabled')) {
      soltar(
        acao,
        'm-alvorada',
        [
          { opacity: 0, transform: 'translateY(60%)', offset: 0 },
          { opacity: 1, offset: 0.35 },
          { opacity: 0, transform: 'translateY(-10%)', offset: 1 },
        ],
        900,
        SAIR,
      );
      return;
    }
    const redondo = alvo?.closest<HTMLElement>('.m-icone');
    if (redondo && !redondo.hasAttribute('disabled')) {
      soltar(
        redondo,
        'm-aro-onda',
        [
          { opacity: 0.8, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(1.5)' },
        ],
        1100,
        ONDA,
      );
    }
  };
  document.addEventListener('pointerdown', ouvir);
  return () => {
    document.removeEventListener('pointerdown', ouvir);
  };
}

/**
 * A mesma alvorada no botão principal do app antigo (`.principal`; ver o desvio do PR em
 * `docs/entradas/desvios`): um ouvinte à parte, porque o do Fio só atende `.m-acao`. Só no modo normal.
 */
export function ligarAlvoradaDoPrincipal(): () => void {
  const ouvir = (e: PointerEvent) => {
    if (modoAgora() !== 'normal') return;
    const alvo = e.target instanceof Element ? e.target : null;
    const redondo = alvo?.closest<HTMLElement>('.mais-global .mais');
    if (redondo && !redondo.hasAttribute('disabled')) {
      soltar(
        redondo,
        'aro-onda-mais',
        [
          { opacity: 0.8, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(1.5)' },
        ],
        1100,
        ONDA,
      );
      return;
    }
    const principal = alvo?.closest<HTMLElement>('.principal');
    if (!principal || principal.hasAttribute('disabled')) return;
    if (principal.getAttribute('aria-pressed') === 'true' || principal.closest('.m-fio')) return;
    soltar(
      principal,
      'alvorada-principal',
      [
        { opacity: 0, transform: 'translateY(60%)', offset: 0 },
        { opacity: 1, offset: 0.35 },
        { opacity: 0, transform: 'translateY(-10%)', offset: 1 },
      ],
      900,
      SAIR,
    );
  };
  document.addEventListener('pointerdown', ouvir);
  return () => {
    document.removeEventListener('pointerdown', ouvir);
  };
}
