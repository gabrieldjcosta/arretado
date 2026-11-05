// O movimento do Fio na cara das coisas: o botão de ação é o "Sol" no Vivo e o "Só contorno" no Calmo
// (Gabriel, 04/11/2026; `docs/design/desvios.md`, desvio 17). O Calmo é o mesmo de `anima.ts`: o perfil Calmo
// em uso ou o sistema pedindo menos movimento. Tudo mais é Vivo, que também é o padrão de quem não configurou nada.
import { useSyncExternalStore } from 'react';
import { modoAgora } from './anima';

export type MovimentoDoFio = 'vivo' | 'calmo';

/** Lido na hora de usar e nunca guardado: o perfil muda em Conta e o sistema muda a preferência com o app aberto. */
export function movimentoDoFio(): MovimentoDoFio {
  return modoAgora() === 'normal' ? 'vivo' : 'calmo';
}

/** Avisa quando o sistema muda a preferência de movimento ou quando `AplicarAparencia` troca o perfil (`data-perfil`). */
function assinar(avisar: () => void): () => void {
  const janela: Partial<Pick<Window, 'matchMedia'>> = window;
  const consulta = janela.matchMedia?.('(prefers-reduced-motion: reduce)');
  consulta?.addEventListener('change', avisar);
  const olho = new MutationObserver(avisar);
  olho.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-perfil', 'data-movimento-escolhido'],
  });
  return () => {
    consulta?.removeEventListener('change', avisar);
    olho.disconnect();
  };
}

/** O movimento de agora, que muda sozinho com o perfil e com o sistema. Sem janela (servidor), é o Vivo. */
export function useMovimentoDoFio(): MovimentoDoFio {
  return useSyncExternalStore(assinar, movimentoDoFio, () => 'vivo');
}
