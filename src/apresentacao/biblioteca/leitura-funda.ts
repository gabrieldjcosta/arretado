import { useEffect } from 'react';

/**
 * Leitura funda: rolando a lei para baixo, a pílula dos lugares se recolhe; subindo um pouco (ou
 * chegando ao alto), volta. É só um atributo na raiz (`data-leitura-funda`): o CSS faz o resto sem
 * mexer no layout, então não atrapalha a medição do leitor.
 */
const DESCER_PARA_RECOLHER = 48;
const SUBIR_PARA_VOLTAR = 16;
const ALTO = 80;

/** Decide o próximo estado a partir do estado atual e do quanto a página andou desde a última virada. */
export function proximaLeituraFunda(funda: boolean, scrollY: number, andou: number): boolean {
  if (scrollY < ALTO) return false;
  if (!funda && andou >= DESCER_PARA_RECOLHER) return true;
  if (funda && andou <= -SUBIR_PARA_VOLTAR) return false;
  return funda;
}

export function useLeituraFunda(ativa: boolean): void {
  useEffect(() => {
    if (!ativa) return;
    const raiz = document.documentElement;
    let funda = false;
    let ancora = window.scrollY;
    const aoRolar = () => {
      const y = window.scrollY;
      const proximo = proximaLeituraFunda(funda, y, y - ancora);
      if (proximo !== funda) {
        funda = proximo;
        ancora = y;
        if (funda) raiz.dataset.leituraFunda = 'sim';
        else delete raiz.dataset.leituraFunda;
      } else if (funda ? y > ancora : y < ancora) {
        // Seguiu no mesmo sentido: a âncora acompanha, para medir só a virada.
        ancora = y;
      }
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
      delete raiz.dataset.leituraFunda;
    };
  }, [ativa]);
}
