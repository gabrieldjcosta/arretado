import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { LinkDoFio } from './LinkDoFio';
import { LUGARES, lugarDaRota } from './lugares';

/**
 * A pílula dos três lugares, presa embaixo. O traço de luz (o indicador) desliza até o lugar atual; sem
 * lugar atual (Conta, Orientações) ele some e nenhuma aba fica acesa. É um `nav` de links: trocar de lugar
 * é trocar de rota, e o voltar do navegador volta ao lugar anterior.
 */
export function NavDosLugares() {
  const { pathname } = useLocation();
  const atual = lugarDaRota(pathname);
  const caixa = useRef<HTMLElement>(null);
  const indicador = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ind = indicador.current;
    const alvo = caixa.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!ind) return;
    if (!alvo) {
      ind.style.opacity = '0';
      return;
    }
    ind.style.opacity = '1';
    ind.style.left = `${String(alvo.offsetLeft)}px`;
    ind.style.width = `${String(alvo.offsetWidth)}px`;
  }, [atual]);

  return (
    <nav className="fio-nav" aria-label="Lugares" ref={caixa}>
      <span className="fio-indicador" ref={indicador} aria-hidden="true" />
      {LUGARES.map((l) => (
        <LinkDoFio
          key={l.id}
          to={l.caminho}
          {...(atual === l.id ? { 'aria-current': 'page' as const } : {})}
        >
          {l.nome}
        </LinkDoFio>
      ))}
    </nav>
  );
}
