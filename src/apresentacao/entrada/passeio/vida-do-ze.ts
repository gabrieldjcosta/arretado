// A vida do Zé nas Boas-vindas (D-D10, contrato §9): as piscadas dos dois olhos em rajadas curtas e, se a
// pessoa demora, a luz amarela da mão que pisca. Tudo finito e à mão do relógio da tela: só nas Boas-vindas,
// onde a pessoa escolhe (nos passos e no Começar o Zé fica quieto). O movimento é lido na hora de usar:
// as piscadas só no normal; a luz no normal e no Calmo (lá é um esmaecer só), nunca no reduzido.
import type { ControleDoZe } from '../../componentes/ze/controle';
import { movimentoAgora } from '../../movimento';

/**
 * Rajadas de piscadas dos dois olhos: a pausa que vem depois (ms) e quantas piscadas. A ordem é fixa
 * (2, 2, 3, 2, 3 e, na sexta, volta à primeira: 2) e não sorteada: a tela é igual toda vez que se olha.
 */
export const RAJADAS: readonly (readonly [pausa: number, piscadas: number])[] = [
  [4200, 2],
  [5600, 2],
  [3800, 3],
  [6200, 2],
  [4800, 3],
];
/** De uma piscada à seguinte, na mesma rajada: no máximo 3 por segundo (WCAG 2.3.1). */
export const ESPACO_ENTRE_PISCADAS_MS = 340;
/** Uma piscada dura 160 ms; a pausa da rajada só começa depois dela. */
const DURACAO_DA_PISCADA_MS = 160;
export const PRIMEIRA_RAJADA_MS = 2200;
/**
 * Teto de rajadas por visita à tela [Marca, 29/10, revisão do #350]: depois da sexta o Zé fica parado, de
 * olhos abertos. Quem chega pela primeira vez ainda não escolheu o Calmo, e a tela de quem se distrai fácil
 * não pisca sem fim (WCAG 2.2.2). Remontar a tela é outra visita e recomeça a conta.
 */
export const MAXIMO_DE_RAJADAS = 6;

/** Sem toque, tecla nem rolagem: a luz da mão pisca aos 10 s e depois a cada 14 s, no máximo 3 rodadas. */
export const PRIMEIRA_ESPERA_DA_LUZ_MS = 10_000;
export const ESPERA_SEGUINTE_DA_LUZ_MS = 14_000;
export const RODADAS_DA_LUZ = 3;
/** Cada rodada são 3 piscadas da luz (460 ms cada). */
const PISCADAS_DA_LUZ = 3;

type Piscante = Pick<ControleDoZe, 'piscar'>;
type ComLuz = Pick<ControleDoZe, 'piscarFlor' | 'pararFlor'>;

/**
 * As piscadas dos dois olhos: a primeira rajada aos 2,2 s e as outras na ordem de `RAJADAS`, até
 * `MAXIMO_DE_RAJADAS` por visita (menos de 1 s cada, só no movimento normal; o sistema e o Calmo as
 * desligam). Devolve quem as cancela.
 */
export function iniciarPiscadas(ze: () => Piscante | null): () => void {
  if (movimentoAgora() !== 'normal') return () => undefined;
  const relogios = new Set<number>();
  const depois = (ms: number, fazer: () => void) => {
    const relogio = window.setTimeout(() => {
      relogios.delete(relogio);
      fazer();
    }, ms);
    relogios.add(relogio);
  };
  let rajada = 0;
  const proxima = (espera: number) => {
    depois(espera, () => {
      const [pausa, piscadas] = RAJADAS[rajada % RAJADAS.length] ?? RAJADAS[0] ?? [0, 0];
      rajada += 1;
      // A primeira piscada é a da própria hora da rajada (sem outro relógio de 0 ms por cima).
      ze()?.piscar();
      for (let i = 1; i < piscadas; i += 1) {
        depois(i * ESPACO_ENTRE_PISCADAS_MS, () => {
          ze()?.piscar();
        });
      }
      if (rajada < MAXIMO_DE_RAJADAS) {
        proxima(pausa + (piscadas - 1) * ESPACO_ENTRE_PISCADAS_MS + DURACAO_DA_PISCADA_MS);
      }
    });
  };
  proxima(PRIMEIRA_RAJADA_MS);
  return () => {
    for (const relogio of relogios) window.clearTimeout(relogio);
    relogios.clear();
  };
}

/**
 * A luz amarela da mão pisca quando a pessoa demora [Gabriel, 28/10]: 10 s sem toque, tecla nem rolagem
 * em `zona`, e depois a cada 14 s, no máximo 3 rodadas por visita. Um toque, uma tecla ou a rolagem
 * zera a espera (mas não as rodadas já feitas). No Calmo a rodada é um esmaecer só; no reduzido não há.
 * Exceção declarada à regra "nunca pulsa": decorativa, finita e sem `infinite`. Devolve quem a cancela.
 */
export function iniciarLuzDaMao(ze: () => ComLuz | null, zona: Element): () => void {
  if (movimentoAgora() === 'reduzido') return () => undefined;
  let rodadas = 0;
  let relogio: number | null = null;
  const armar = (ms: number) => {
    if (relogio !== null) window.clearTimeout(relogio);
    relogio = null;
    if (rodadas >= RODADAS_DA_LUZ) return;
    relogio = window.setTimeout(() => {
      rodadas += 1;
      void ze()?.piscarFlor(PISCADAS_DA_LUZ);
      armar(ESPERA_SEGUINTE_DA_LUZ_MS);
    }, ms);
  };
  const zerar = () => {
    // Depois da última rodada não há mais o que armar.
    if (relogio !== null) armar(PRIMEIRA_ESPERA_DA_LUZ_MS);
  };
  const eventos = ['pointerdown', 'keydown', 'scroll'] as const;
  for (const evento of eventos) zona.addEventListener(evento, zerar, { capture: true });
  armar(PRIMEIRA_ESPERA_DA_LUZ_MS);
  return () => {
    for (const evento of eventos) zona.removeEventListener(evento, zerar, { capture: true });
    if (relogio !== null) window.clearTimeout(relogio);
    relogio = null;
    ze()?.pararFlor();
  };
}
