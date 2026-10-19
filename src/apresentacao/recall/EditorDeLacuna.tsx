import { useEffect, useRef, type ReactNode } from 'react';
import { selecaoNoEditor } from './lacuna';
import type { Intervalo } from '../../core/modelo';
import { normalizarOcultos } from '../../dominios/recall/servico';

/** Os pedaços do texto, em ordem: o que aparece e o que está escondido. */
function pedacos(texto: string, ocultos: readonly Intervalo[]) {
  const saida: { inicio: number; fim: number; oculto: boolean }[] = [];
  let pos = 0;
  for (const o of normalizarOcultos(texto, ocultos)) {
    if (o.inicio > pos) saida.push({ inicio: pos, fim: o.inicio, oculto: false });
    saida.push({ inicio: o.inicio, fim: o.fim, oculto: true });
    pos = o.fim;
  }
  if (pos < texto.length) saida.push({ inicio: pos, fim: texto.length, oculto: false });
  return saida;
}

/** Espera a seleção parar de mexer (alças do celular) antes de esconder. */
const ESPERA_DA_SELECAO_MS = 600;

/**
 * Selecionou, escondeu: o trecho selecionado vira tarja na hora e tocar na tarja desfaz.
 * Sem botão de "esconder": com mouse e teclado vale ao soltar; no toque, depois de uma pausa.
 */
export function EditorDeLacuna({
  texto,
  ocultos,
  aoMudar,
}: {
  texto: string;
  ocultos: readonly Intervalo[];
  aoMudar: (ocultos: Intervalo[]) => void;
}) {
  const raiz = useRef<HTMLParagraphElement>(null);
  const atual = useRef({ texto, ocultos, aoMudar });
  useEffect(() => {
    atual.current = { texto, ocultos, aoMudar };
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const esconder = () => {
      const el = raiz.current;
      if (!el) return;
      const sel = selecaoNoEditor(el, atual.current.texto);
      if (!sel) return;
      window.getSelection()?.removeAllRanges();
      atual.current.aoMudar(
        normalizarOcultos(atual.current.texto, [...atual.current.ocultos, sel]),
      );
    };
    const aoMudarSelecao = () => {
      clearTimeout(timer);
      timer = setTimeout(esconder, ESPERA_DA_SELECAO_MS);
    };
    const agora = () => {
      clearTimeout(timer);
      esconder();
    };
    const el = raiz.current;
    document.addEventListener('selectionchange', aoMudarSelecao);
    el?.addEventListener('pointerup', agora);
    el?.addEventListener('keyup', agora);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('selectionchange', aoMudarSelecao);
      el?.removeEventListener('pointerup', agora);
      el?.removeEventListener('keyup', agora);
    };
  }, []);

  const pecas: ReactNode[] = pedacos(texto, ocultos).map((p) => {
    const trecho = texto.slice(p.inicio, p.fim);
    return p.oculto ? (
      <button
        key={p.inicio}
        type="button"
        className="lacuna-tarja"
        data-inicio={p.inicio}
        aria-label={`Trecho escondido: ${trecho}. Tocar para mostrar.`}
        onClick={() => {
          aoMudar(ocultos.filter((o) => o.inicio !== p.inicio));
        }}
      >
        {trecho}
      </button>
    ) : (
      <span key={p.inicio} data-inicio={p.inicio}>
        {trecho}
      </span>
    );
  });

  return (
    <p ref={raiz} className="texto-leitura lacuna-editor" data-tamanho={texto.length}>
      {pecas}
    </p>
  );
}
