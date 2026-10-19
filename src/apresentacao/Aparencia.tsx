import { useCallback, useEffect } from 'react';
import { obterPreferencias } from '../core/preferencias';
import { useDados } from './dados/contexto';

/**
 * Aplica tema, fonte de leitura e perfil das Preferências ao documento. O perfil vai em
 * `data-perfil` (ausente se não há perfil): é dele que `movimentoAgora` sabe o quanto a interface
 * se mexe.
 */
export function AplicarAparencia() {
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));

  useEffect(() => {
    if (!dados) return;
    const raiz = document.documentElement;
    if (dados.tema === 'sistema') delete raiz.dataset.tema;
    else raiz.dataset.tema = dados.tema;
    raiz.dataset.fonte = dados.fonteLeitura;
    if (dados.perfilDeEstudo) raiz.dataset.perfil = dados.perfilDeEstudo;
    else delete raiz.dataset.perfil;
    raiz.style.setProperty('--tamanho-leitura', `${String(dados.tamanhoFonte)}px`);
  }, [dados]);

  return null;
}
