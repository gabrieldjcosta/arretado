import { useCallback, useState } from 'react';
import { useLarguraMinima } from '../componentes/largura';
import { noLeitor } from './lugares';

/** Onde fica a escolha da pessoa (aberto ou recolhido), só neste aparelho. */
export const CHAVE_DO_MENU = 'arretado:menu-lateral';

/** Do tablet em pé para cima o menu dos lugares vira o menu lateral; abaixo disso é a pílula de baixo. */
export const LARGURA_DO_MENU = 768;
/** Daqui para cima o menu aberto empurra o conteúdo; entre 768 e 1099 ele abre por cima, com véu. */
export const LARGURA_DO_MENU_FIXO = 1100;

type Preferencia = 'aberto' | 'recolhido';

function lerPreferencia(): Preferencia | null {
  try {
    const v = window.localStorage.getItem(CHAVE_DO_MENU);
    return v === 'aberto' || v === 'recolhido' ? v : null;
  } catch {
    return null;
  }
}

function gravarPreferencia(p: Preferencia) {
  try {
    window.localStorage.setItem(CHAVE_DO_MENU, p);
  } catch {
    // Sem armazenamento (aba privada): a escolha vale só nesta visita.
  }
}

export interface MenuLateral {
  /** O menu lateral existe nesta largura (do tablet em pé para cima). */
  lateral: boolean;
  /** Aberto (com os nomes) ou recolhido (só os ícones). */
  aberto: boolean;
  /** Aberto por cima do conteúdo, com véu (tablet), em vez de empurrá-lo (monitor). */
  sobreposto: boolean;
  alternar: () => void;
  fechar: () => void;
}

/**
 * O estado do menu lateral. A escolha da pessoa vale no monitor e fica guardada; sem escolha, o monitor abre com os
 * nomes. No tablet ele começa recolhido e abre por cima só até a próxima troca de tela. Dentro de uma norma ele
 * começa recolhido (a leitura ganha a largura) e abrir ali vale só para aquela norma.
 */
export function useMenuLateral(caminho: string): MenuLateral {
  const lateral = useLarguraMinima(LARGURA_DO_MENU);
  const fixo = useLarguraMinima(LARGURA_DO_MENU_FIXO);
  const [preferencia, setPreferencia] = useState<Preferencia>(() => lerPreferencia() ?? 'aberto');
  // A abertura de passagem (tablet, norma) vale só na tela em que foi pedida.
  const [passagem, setPassagem] = useState<{ caminho: string; aberto: boolean } | null>(null);
  const daVez = passagem?.caminho === caminho ? passagem.aberto : null;
  const naNorma = noLeitor(caminho);
  const sobreposto = lateral && !fixo;
  const aberto = lateral && (daVez ?? (!sobreposto && !naNorma && preferencia === 'aberto'));
  const alternar = useCallback(() => {
    if (sobreposto || naNorma) {
      setPassagem({ caminho, aberto: !aberto });
      return;
    }
    const nova: Preferencia = aberto ? 'recolhido' : 'aberto';
    gravarPreferencia(nova);
    setPreferencia(nova);
    setPassagem(null);
  }, [aberto, caminho, naNorma, sobreposto]);
  const fechar = useCallback(() => {
    setPassagem({ caminho, aberto: false });
  }, [caminho]);
  return { lateral, aberto, sobreposto, alternar, fechar };
}

/** Os traços dos ícones do menu (24 × 24, só contorno), um por lugar. */
export const ICONE_DO_LUGAR = {
  agora: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 3v3M12 18v3M3 12h3M18 12h3',
  destino: 'M12 21s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10zM12 9a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  varal: 'M3 8c6 2 12 2 18 0M3 15c6 2 12 2 18 0',
  leitor: 'M4 5h5a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-5a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h6z',
  conta: 'M12 4.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M5 20c1-4 4-6 7-6s6 2 7 6',
} as const;
