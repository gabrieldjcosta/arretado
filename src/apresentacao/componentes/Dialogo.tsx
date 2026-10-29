import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * O título do diálogo: o texto, que o diálogo desenha num `<h2>`, ou o `id` de um título que o próprio
 * conteúdo desenha (o passeio da Chegada troca de tela, e o título vai junto).
 */
type Titulo = { titulo: string; idDoTitulo?: never } | { titulo?: never; idDoTitulo: string };

/**
 * Diálogo modal nativo (<dialog>): foco preso, Esc fecha, fundo inerte.
 * No máximo um por ação (Parte 2 §9.1).
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  idDoTitulo,
  classe,
  descritoPor,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Classe do `<dialog>` (posição e largura próprias, como a busca na norma). */
  classe?: string;
  /** `id` do trecho que descreve o diálogo; o leitor de tela o lê depois do título. */
  descritoPor?: string;
  children: ReactNode;
} & Titulo) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  // Abre e fecha no mesmo commit que muda `aberto` (antes da pintura): com `useEffect`, havia um
  // quadro com o diálogo aberto e já sem conteúdo, e o teste que conferia logo depois o via aberto.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!aberto && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className={classe}
      aria-labelledby={idDoTitulo ?? idTitulo}
      aria-describedby={descritoPor}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
    >
      {titulo !== undefined && <h2 id={idTitulo}>{titulo}</h2>}
      {aberto && children}
    </dialog>
  );
}
