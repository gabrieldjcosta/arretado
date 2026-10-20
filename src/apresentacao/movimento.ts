// O quanto a interface se mexe (D-D7, "A caneta que desenha"). Lido na hora de usar e nunca guardado:
// o sistema pode mudar a preferência com o app aberto, e o perfil de estudo muda em Conta.

/**
 * `reduzido`: nada anda (o quadro já aparece pronto, o cartão troca sem passar). `calmo`: o Dia se
 * desenha, mas os toques só esmaecem. `normal`: o traço de seleção e a passagem do cartão andam.
 */
export type Movimento = 'reduzido' | 'calmo' | 'normal';

/** A curva do app, a mesma do CSS: entra rápido e assenta, sem passar do ponto. */
export const CURVA = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

/**
 * Movimento reduzido do sistema vence tudo. Depois, só o perfil Calmo acalma os toques: sem perfil
 * escolhido, e nos perfis Guiado e Leitura, andam por inteiro. `AplicarAparencia` põe o perfil em
 * `data-perfil` (ausente se não há perfil).
 */
export function movimentoAgora(): Movimento {
  const janela: Partial<Pick<Window, 'matchMedia'>> = window;
  // Sem `matchMedia` (o jsdom não tem), é mais seguro não mexer em nada.
  if (janela.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true) return 'reduzido';
  return document.documentElement.dataset.perfil === 'calmo' ? 'calmo' : 'normal';
}

/** Seno suave de 0 a 1: o traço do Dia sai devagar, anda e assenta. */
export const suave = (progresso: number): number => 0.5 - 0.5 * Math.cos(Math.PI * progresso);

const [X1, Y1, X2, Y2] = [0.2, 0.7, 0.2, 1] as const;
const CX = 3 * X1;
const BX = 3 * (X2 - X1) - CX;
const AX = 1 - CX - BX;
const CY = 3 * Y1;
const BY = 3 * (Y2 - Y1) - CY;
const AY = 1 - CY - BY;
const emX = (t: number) => ((AX * t + BX) * t + CX) * t;
const emY = (t: number) => ((AY * t + BY) * t + CY) * t;
const derivadaX = (t: number) => (3 * AX * t + 2 * BX) * t + CX;

/** `CURVA` como função do progresso (0 a 1), para quem anda a ponta de um traço quadro a quadro. */
export function curva(progresso: number): number {
  const x = Math.min(1, Math.max(0, progresso));
  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const erro = emX(t) - x;
    if (Math.abs(erro) < 1e-5) break;
    const d = derivadaX(t);
    if (Math.abs(d) < 1e-6) break;
    t -= erro / d;
  }
  return emY(Math.min(1, Math.max(0, t)));
}

/** Espera `ms`; resolve também se o `sinal` abortar (quem chama confere `sinal.aborted`). */
export function esperar(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    if (sinal.aborted) {
      resolver();
      return;
    }
    const fim = () => {
      clearTimeout(relogio);
      sinal.removeEventListener('abort', fim);
      resolver();
    };
    const relogio = setTimeout(fim, ms);
    sinal.addEventListener('abort', fim, { once: true });
  });
}
