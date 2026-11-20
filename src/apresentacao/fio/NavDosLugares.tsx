import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { LinkDoFio } from './LinkDoFio';
import { LUGARES, lugarDaRota, noLeitor } from './lugares';
import { medirIndicador } from './indicador';
import { IconeDoMenu } from './MenuLateral';
import { ICONE_DO_LUGAR } from './menu-lateral';

/**
 * A pílula dos três lugares, presa embaixo. O traço de luz (o indicador) desliza até o lugar atual; sem
 * lugar atual (Conta, Orientações) ele some e nenhuma aba fica acesa. É um `nav` de links: trocar de lugar
 * é trocar de rota, e o voltar do navegador volta ao lugar anterior.
 */
export function NavDosLugares({ noMenuLateral = false }: { noMenuLateral?: boolean }) {
  const { pathname } = useLocation();
  // No menu lateral a leitura tem o item dela (Leitor): ali nenhum dos três lugares fica aceso.
  const atual = noMenuLateral && noLeitor(pathname) ? undefined : lugarDaRota(pathname);
  const caixa = useRef<HTMLElement>(null);
  const indicador = useRef<HTMLSpanElement>(null);

  useLayoutEffect(
    () =>
      medirIndicador(caixa.current, indicador.current, 'a[aria-current="page"]', {
        imediato: true,
        semAlvoSome: true,
      }),
    [atual],
  );

  return (
    <nav className="fio-nav" aria-label="Lugares" ref={caixa}>
      <span className="fio-indicador" ref={indicador} aria-hidden="true" />
      {LUGARES.map((l) => (
        <LinkDoFio
          key={l.id}
          to={l.caminho}
          {...(atual === l.id ? { 'aria-current': 'page' as const } : {})}
        >
          <IconeDoMenu traco={ICONE_DO_LUGAR[l.id]} />
          <span className="ml-rotulo">{l.nome}</span>
        </LinkDoFio>
      ))}
    </nav>
  );
}
