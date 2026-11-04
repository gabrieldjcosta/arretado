import { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LUGARES, type IdDoLugar } from '../lugares';

/**
 * A nav do mockup (`<nav class="nav">`): três lugares e um indicador que desliza até o aceso. Os lugares
 * são irmãos: trocar de um para outro nunca empilha tela.
 */
export function NavM({ ativo }: { ativo: IdDoLugar | undefined }) {
  const navegar = useNavigate();
  const nav = useRef<HTMLElement>(null);
  const indicador = useRef<HTMLSpanElement>(null);

  // O indicador fica no botão aceso; ao mudar de lugar, desliza (a transição é do CSS do mockup).
  useLayoutEffect(() => {
    const botao = nav.current?.querySelector<HTMLElement>('button[aria-current="page"]');
    const marca = indicador.current;
    if (!botao || !marca) return;
    const id = window.requestAnimationFrame(() => {
      marca.style.left = `${String(botao.offsetLeft)}px`;
      marca.style.width = `${String(botao.offsetWidth)}px`;
    });
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [ativo]);

  return (
    <nav ref={nav} className="m-nav" aria-label="Lugares">
      <span ref={indicador} className="m-indicador" />
      {LUGARES.map((l) => (
        <button
          key={l.id}
          type="button"
          data-nav={l.id}
          aria-current={l.id === ativo ? 'page' : 'false'}
          onClick={() => {
            if (l.id !== ativo) void navegar(l.caminho);
          }}
        >
          {l.nome}
        </button>
      ))}
    </nav>
  );
}
