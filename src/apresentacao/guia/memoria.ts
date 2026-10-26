// Quais guias a pessoa já viu, neste Aparelho. Sem armazenamento, o guia só reaparece na próxima
// abertura; nunca vai ao backup nem à nuvem.
import { useSyncExternalStore } from 'react';
import { GUIAS, type TelaComGuia } from './conteudo';

const chave = (tela: TelaComGuia) => `arretado.guia.${tela}`;
const EVENTO = 'arretado:guia';

export function guiaJaVisto(tela: TelaComGuia): boolean {
  try {
    return localStorage.getItem(chave(tela)) === String(GUIAS[tela].versao);
  } catch {
    return false;
  }
}

export function marcarGuiaVisto(tela: TelaComGuia): void {
  try {
    localStorage.setItem(chave(tela), String(GUIAS[tela].versao));
  } catch {
    /* sem armazenamento: some só até recarregar */
  }
}

/** "Ver o guia desta tela" na Ajuda: apaga a marca e avisa o guia montado. */
export function reabrirGuia(tela: TelaComGuia): void {
  try {
    localStorage.removeItem(chave(tela));
  } catch {
    /* idem */
  }
  window.dispatchEvent(new CustomEvent<TelaComGuia>(EVENTO, { detail: tela }));
}

export function aoReabrirGuia(tela: TelaComGuia, fn: () => void): () => void {
  const ouvir = (e: Event) => {
    if (e instanceof CustomEvent && e.detail === tela) fn();
  };
  window.addEventListener(EVENTO, ouvir);
  return () => {
    window.removeEventListener(EVENTO, ouvir);
  };
}

/** Guia da tela para o caminho atual; `undefined` onde não há (leitor, formulários, conta). */
export function telaDoGuia(caminho: string): TelaComGuia | undefined {
  if (caminho === '/' || caminho === '') return 'hoje';
  if (caminho === '/plano') return 'plano';
  if (caminho === '/recall' || /^\/recall\/(frases|cartoes|historico)$/.test(caminho))
    return 'recall';
  if (caminho === '/biblioteca') return 'biblioteca';
  return undefined;
}

// Guias montados agora (a tela está no estado em que o guia vale): só então o menu Ajuda o oferece.
const montados = new Map<TelaComGuia, number>();
const assinantes = new Set<() => void>();
const avisar = () => {
  assinantes.forEach((f) => {
    f();
  });
};

export function registrarGuiaMontado(tela: TelaComGuia): () => void {
  montados.set(tela, (montados.get(tela) ?? 0) + 1);
  avisar();
  return () => {
    const n = (montados.get(tela) ?? 1) - 1;
    if (n <= 0) montados.delete(tela);
    else montados.set(tela, n);
    avisar();
  };
}

export function useGuiaMontado(tela: TelaComGuia | undefined): boolean {
  return useSyncExternalStore(
    (f) => {
      assinantes.add(f);
      return () => {
        assinantes.delete(f);
      };
    },
    () => tela !== undefined && montados.has(tela),
  );
}
