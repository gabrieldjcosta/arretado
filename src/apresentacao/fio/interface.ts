import { useSyncExternalStore } from 'react';

/**
 * Qual interface a pessoa vê neste Aparelho: a de hoje ou a prévia do Fio (D-D25, "o Arretado novo").
 * Fica só neste Aparelho (`localStorage`), sem esquema e sem sincronizar: é um interruptor de teste, e a
 * pessoa volta à interface de hoje quando quiser. Sem `localStorage` (navegação privada, bloqueio), a escolha vale
 * na memória da página, até recarregar.
 */
export type InterfaceDoApp = 'atual' | 'fio';

export const CHAVE_DA_INTERFACE = 'arretado:interface';
const EVENTO = 'arretado:interface';

/** Sem armazenamento a escolha vale na memória da página. */
let semArmazenamento = false;
let emMemoria: InterfaceDoApp = 'atual';

export function interfaceEscolhida(): InterfaceDoApp {
  if (semArmazenamento) return emMemoria;
  try {
    return localStorage.getItem(CHAVE_DA_INTERFACE) === 'fio' ? 'fio' : 'atual';
  } catch {
    return emMemoria;
  }
}

export function escolherInterface(qual: InterfaceDoApp): void {
  emMemoria = qual;
  try {
    if (qual === 'fio') localStorage.setItem(CHAVE_DA_INTERFACE, 'fio');
    else localStorage.removeItem(CHAVE_DA_INTERFACE);
  } catch {
    semArmazenamento = true;
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void): () => void {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener('storage', avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener('storage', avisar);
  };
}

/** A interface escolhida, que muda na hora quando a pessoa liga ou desliga a prévia (e entre abas). */
export function useInterface(): InterfaceDoApp {
  return useSyncExternalStore(assinar, interfaceEscolhida, () => 'atual');
}
