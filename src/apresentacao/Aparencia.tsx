import { useCallback, useEffect } from 'react';
import { obterPreferencias } from '../core/preferencias';
import { useDados } from './dados/contexto';

/** Aplica tema e fonte de leitura das Preferências ao documento. */
export function AplicarAparencia() {
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));

  useEffect(() => {
    if (!dados) return;
    const raiz = document.documentElement;
    if (dados.tema === 'sistema') delete raiz.dataset.tema;
    else raiz.dataset.tema = dados.tema;
    raiz.dataset.fonte = dados.fonteLeitura;
    raiz.style.setProperty('--tamanho-leitura', `${String(dados.tamanhoFonte)}px`);
  }, [dados]);

  return null;
}
