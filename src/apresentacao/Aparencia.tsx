import { useCallback, useEffect } from 'react';
import { obterPreferencias } from '../core/preferencias';
import { aplicarCorDaBarra } from './cor-da-barra';
import { aplicarMovimentoEscolhido } from './movimento-escolhido';
import { useDados } from './dados/contexto';

/**
 * Aplica tema, fonte de leitura e perfil das Preferências ao documento. O perfil vai em
 * `data-perfil` (ausente se não há perfil): é dele que `movimentoAgora` sabe o quanto a interface
 * se mexe.
 */
export function AplicarAparencia() {
  const { dados } = useDados(useCallback((r) => obterPreferencias(r), []));

  // O "Movimento" escolhido na Conta do Fio é deste aparelho, não das Preferências: vai para a raiz na abertura.
  useEffect(aplicarMovimentoEscolhido, []);

  useEffect(() => {
    if (!dados) return;
    const raiz = document.documentElement;
    if (dados.tema === 'sistema') delete raiz.dataset.tema;
    else raiz.dataset.tema = dados.tema;
    aplicarCorDaBarra(dados.tema);
    raiz.dataset.fonte = dados.fonteLeitura;
    if (dados.perfilDeEstudo) raiz.dataset.perfil = dados.perfilDeEstudo;
    else delete raiz.dataset.perfil;
    // O "Texto" da Conta do Fio faz o Fio todo crescer (cartões, folhas e pouso), não só a leitura.
    if (dados.tamanhoFonte >= 24) raiz.dataset.textoFio = 'bem-maior';
    else if (dados.tamanhoFonte >= 20) raiz.dataset.textoFio = 'maior';
    else delete raiz.dataset.textoFio;
    raiz.style.setProperty('--tamanho-leitura', `${String(dados.tamanhoFonte)}px`);
  }, [dados]);

  return null;
}
