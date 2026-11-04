import { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LUGARES, noQuadroDoFio, type IdDoLugar } from '../lugares';
import { trocarDeAba } from './aba';

/** A tela do quadro que cada lugar da nav abre (o `data-tela` do mockup). */
const TELA_DO_LUGAR: Readonly<Record<IdDoLugar, string>> = {
  agora: 'inicio',
  destino: 'mapa',
  varal: 'varal',
};

/**
 * A nav do mockup (`<nav class="nav">`): três lugares e um indicador que desliza até o aceso. Os lugares
 * são irmãos: trocar de um para outro nunca empilha tela, e o fio de uma voa até o lugar do fio da outra (`aba.ts`).
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
            if (l.id === ativo) return;
            const ir = () => {
              void navegar(l.caminho);
            };
            // O fio só voa entre telas do quadro; um lugar que ainda mora na casca de antes só troca.
            if (noQuadroDoFio(l.caminho)) void trocarDeAba(TELA_DO_LUGAR[l.id], ir);
            else ir();
          }}
        >
          {l.nome}
        </button>
      ))}
    </nav>
  );
}
