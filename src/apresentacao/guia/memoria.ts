// Quais guias a pessoa já viu, neste Aparelho. Sem armazenamento, o guia só reaparece na próxima
// abertura; nunca vai ao backup nem à nuvem.
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
