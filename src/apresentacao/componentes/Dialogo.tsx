import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Diálogo modal nativo (<dialog>): foco preso, Esc fecha, fundo inerte.
 * No máximo um por ação (Parte 2 §9.1).
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  classe,
  descritoPor,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  /** Classe do `<dialog>` (posição e largura próprias, como a busca na norma). */
  classe?: string;
  /** `id` do trecho que descreve o diálogo; o leitor de tela o lê depois do título. */
  descritoPor?: string;
  children: ReactNode;
}) {
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
      aria-labelledby={idTitulo}
      aria-describedby={descritoPor}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
    >
      <h2 id={idTitulo}>{titulo}</h2>
      {aberto && children}
    </dialog>
  );
}
