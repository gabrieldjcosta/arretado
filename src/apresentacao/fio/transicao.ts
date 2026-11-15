import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate, type NavigateOptions, type To } from 'react-router';
import { movimentoAgora } from '../movimento';
import { LUGARES, lugarDaRota } from './lugares';

/**
 * Troca de tela contínua do Fio (View Transitions API, nativa; 0 kB). Porte do `ir()` do mockup v17:
 * só a tela (`view-transition-name: tela` no `<main>`) sai e entra; a casca e a pílula ficam quietas.
 * Entre dois lugares da pílula a tela desliza de lado (22 px); nos demais casos sobe (14 px); no Calmo
 * só sobe um pouco (6 px) e demora mais; com movimento reduzido o CSS vira um cross-fade curto.
 * O `HashRouter` não conhece `viewTransition`, então o clique chama `startViewTransition` aqui.
 */
type ComDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

function ordem(caminho: string): number {
  const id = lugarDaRota(caminho);
  return LUGARES.findIndex((l) => l.id === id);
}

/** Vetor da entrada: lado a lado entre irmãos da pílula; senão, para cima. */
export function vetorDaTroca(de: string, para: string, calmo: boolean): { dx: number; dy: number } {
  const a = ordem(de);
  const b = ordem(para);
  const lado = a >= 0 && b >= 0 ? Math.sign(b - a) : 0;
  return { dx: calmo ? 0 : lado * 22, dy: lado === 0 ? (calmo ? 6 : 14) : 0 };
}

/** Roda `trocar` dentro de uma View Transition; sem suporte (ou sem troca de tela), só roda. */
export function comTransicao(de: string, para: string, trocar: () => void): void {
  const doc = document as ComDoc;
  if (typeof doc.startViewTransition !== 'function' || de === para) {
    trocar();
    return;
  }
  const mov = movimentoAgora();
  const { dx, dy } = vetorDaTroca(de, para, mov === 'calmo');
  const raiz = document.documentElement;
  raiz.style.setProperty('--vt-dx', `${String(dx)}px`);
  raiz.style.setProperty('--vt-dy', `${String(dy)}px`);
  raiz.dataset.vt = mov === 'calmo' ? 'calmo' : 'normal';
  doc.startViewTransition(() => {
    flushSync(trocar);
    window.scrollTo(0, 0);
  });
}

/** `useNavigate` que troca a tela com View Transition. */
export function useNavegarComTransicao() {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (para: To, opcoes?: NavigateOptions) => {
      const destino = typeof para === 'string' ? para : (para.pathname ?? pathname);
      comTransicao(pathname, destino.split('?')[0] ?? destino, () => {
        void navegar(para, opcoes);
      });
    },
    [navegar, pathname],
  );
}
