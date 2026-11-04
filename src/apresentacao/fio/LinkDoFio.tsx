import type { ComponentProps, MouseEvent } from 'react';
import { Link } from 'react-router';
import { useNavegarComTransicao } from './transicao';

/** `Link` que troca a tela com View Transition (clique simples; atalhos do navegador seguem normais). */
export function LinkDoFio({ to, onClick, ...resto }: ComponentProps<typeof Link>) {
  const navegar = useNavegarComTransicao();
  const aoClicar = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (resto.target && resto.target !== '_self') ||
      resto.reloadDocument
    )
      return;
    e.preventDefault();
    navegar(to, {
      ...(resto.replace ? { replace: true } : {}),
      ...(resto.state === undefined ? {} : { state: resto.state as unknown }),
    });
  };
  return <Link to={to} onClick={aoClicar} {...resto} />;
}
