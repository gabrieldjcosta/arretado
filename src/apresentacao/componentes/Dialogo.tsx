import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Diálogo modal nativo (<dialog>): foco preso, Esc fecha, fundo inerte.
 * No máximo um por ação (Parte 2 §9.1).
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
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
      aria-labelledby={idTitulo}
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
