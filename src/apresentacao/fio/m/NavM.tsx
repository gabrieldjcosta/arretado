import { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LUGARES, noQuadroDoFio, type IdDoLugar } from '../lugares';
import { trocarDeAba } from './aba';
import { medirIndicador } from '../indicador';
import { IconeDoMenu } from '../MenuLateral';
import { ICONE_DO_LUGAR } from '../menu-lateral';

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
export function NavM({ ativo, caminho }: { ativo: IdDoLugar | undefined; caminho: string }) {
  const navegar = useNavigate();
  const nav = useRef<HTMLElement>(null);
  const indicador = useRef<HTMLSpanElement>(null);

  // O indicador fica no botão aceso; ao mudar de lugar, desliza (a transição é do CSS do mockup). No menu lateral ele
  // desliza na vertical e acompanha o menu abrindo e recolhendo (`medirIndicador`).
  useLayoutEffect(
    () => medirIndicador(nav.current, indicador.current, 'button[aria-current="page"]'),
    [ativo],
  );

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
            // Na tela do próprio lugar não há o que trocar. Num folheto (que mora no Varal) o Varal aceso leva de volta
            // ao Varal, como no mockup: lá o toque só é ignorado quando a tela de agora é a do lugar.
            if (l.caminho === caminho) return;
            const ir = () => {
              void navegar(l.caminho);
            };
            // O fio só voa entre telas do quadro; um lugar que ainda mora na casca de antes só troca.
            if (noQuadroDoFio(l.caminho)) void trocarDeAba(TELA_DO_LUGAR[l.id], ir);
            else ir();
          }}
        >
          <IconeDoMenu traco={ICONE_DO_LUGAR[l.id]} />
          <span className="ml-rotulo">{l.nome}</span>
        </button>
      ))}
    </nav>
  );
}
