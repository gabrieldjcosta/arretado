import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { entrarNaTela, sairDaTela } from './transicao';

/**
 * Uma tela do quadro do Fio (a `<section class="tela">` do mockup). Ao montar, entra do jeito do mockup; ao
 * desmontar, deixa um fantasma que esmaece. Quem troca de tela troca a `key`, para ela montar de novo.
 */
export function TelaM({
  nome,
  className,
  rotulo,
  children,
}: {
  nome: string;
  className?: string;
  /** O nome da tela para o leitor de tela, quando ela não tem um título. */
  rotulo?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    entrarNaTela(el, nome);
    return () => {
      sairDaTela(el, nome);
    };
  }, [nome]);
  return (
    <section
      ref={ref}
      className={['m-tela', className].filter(Boolean).join(' ')}
      data-tela={nome}
      aria-label={rotulo}
    >
      {children}
    </section>
  );
}
