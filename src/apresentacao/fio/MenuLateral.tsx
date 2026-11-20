import { useLayoutEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { LinkDoFio } from './LinkDoFio';
import { noLeitor } from './lugares';
import { ICONE_DO_LUGAR, type MenuLateral as Estado } from './menu-lateral';
import './menu-lateral.css';

export function IconeDoMenu({ traco }: { traco: string }) {
  return (
    <svg className="ml-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={traco} />
    </svg>
  );
}

/**
 * O menu lateral do PC e do tablet (layout B, Gabriel 17/11/2026): a mesma nav dos lugares que no celular é a pílula de
 * baixo, de pé à esquerda, com um botão que o abre (ícone e nome) ou recolhe (só o ícone), e embaixo o Leitor e a Conta.
 * A nav (`children`) mora onde sempre morou e só muda de lugar pelo CSS: os testes, a troca de aba e o indicador são os
 * mesmos. No celular este bloco não aparece e a pílula fica embaixo, como antes. Marca a raiz (`data-menu-lateral`) para
 * o conteúdo e o "+" abrirem espaço para ele.
 */
export function MenuLateral({ menu, children }: { menu: Estado; children?: ReactNode }) {
  const { pathname } = useLocation();
  const { lateral, aberto, sobreposto, alternar, fechar } = menu;
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    if (!lateral) {
      raiz.removeAttribute('data-menu-lateral');
      return;
    }
    raiz.setAttribute('data-menu-lateral', aberto ? 'aberto' : 'recolhido');
    return () => {
      raiz.removeAttribute('data-menu-lateral');
    };
  }, [lateral, aberto]);
  const naLeitura = noLeitor(pathname);
  return (
    <>
      <aside className="menu-lateral" data-aberto={aberto ? 'sim' : 'nao'} aria-label="Menu">
        <button
          type="button"
          className="ml-alternar"
          aria-expanded={aberto}
          aria-label={aberto ? 'Recolher o menu' : 'Abrir o menu'}
          onClick={alternar}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={aberto ? 'M15 5l-7 7 7 7M20 4v16' : 'M9 5l7 7-7 7M4 4v16'} />
          </svg>
        </button>
        {children}
        <div className="ml-pe">
          <LinkDoFio
            to="/biblioteca"
            className="ml-item"
            {...(naLeitura ? { 'aria-current': 'page' as const } : {})}
          >
            <IconeDoMenu traco={ICONE_DO_LUGAR.leitor} />
            <span className="ml-rotulo">Leitor</span>
          </LinkDoFio>
          <LinkDoFio
            to="/conta"
            className="ml-item"
            {...(pathname === '/conta' ? { 'aria-current': 'page' as const } : {})}
          >
            <IconeDoMenu traco={ICONE_DO_LUGAR.conta} />
            <span className="ml-rotulo">Conta</span>
          </LinkDoFio>
        </div>
      </aside>
      {sobreposto && aberto && <div className="ml-veu" aria-hidden="true" onClick={fechar} />}
    </>
  );
}
