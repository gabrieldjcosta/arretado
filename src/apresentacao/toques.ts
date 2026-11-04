// Som e vibração mínimos (Conta › Aparência): um "tec" de papel e uma vibração curta. Desligados por
// padrão, guardados só neste aparelho (cada aparelho decide), e nunca em movimento reduzido. Sem
// biblioteca: Web Audio e Vibration API, quando o aparelho tem.
import { useSyncExternalStore } from 'react';
import { movimentoAgora } from './movimento';

const CHAVE = 'arretado:toques:v1';
const EVENTO = 'arretado:toques';

export const toquesLigados = (): boolean => {
  try {
    return window.localStorage.getItem(CHAVE) === 'sim';
  } catch {
    return false;
  }
};

export function ligarToques(ligar: boolean): void {
  try {
    if (ligar) window.localStorage.setItem(CHAVE, 'sim');
    else window.localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento: não liga */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function useToquesLigados(): boolean {
  return useSyncExternalStore(
    (aviso) => {
      window.addEventListener(EVENTO, aviso);
      return () => {
        window.removeEventListener(EVENTO, aviso);
      };
    },
    toquesLigados,
    () => false,
  );
}

let contexto: AudioContext | undefined;

/** Um estalo de papel: ruído filtrado de ~40 ms, baixo. */
function tec(): void {
  const Contexto = (window as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Contexto) return;
  contexto ??= new Contexto();
  const c = contexto;
  if (c.state === 'suspended') void c.resume();
  const n = Math.floor(c.sampleRate * 0.04);
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const fonte = c.createBufferSource();
  fonte.buffer = buffer;
  const filtro = c.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 2200;
  const ganho = c.createGain();
  ganho.gain.value = 0.12;
  fonte.connect(filtro).connect(ganho).connect(c.destination);
  fonte.start();
}

export type Toque = 'virar' | 'pousar';

/** Faz o toque se estiver ligado e o movimento não for reduzido. Nunca lança. */
export function tocar(toque: Toque): void {
  if (!toquesLigados() || movimentoAgora() === 'reduzido') return;
  try {
    if (toque === 'virar') tec();
    else navigator.vibrate(14);
  } catch {
    /* sem som nem vibração neste aparelho */
  }
}
