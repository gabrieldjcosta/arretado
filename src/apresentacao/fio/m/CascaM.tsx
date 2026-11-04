import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AplicarAparencia } from '../../Aparencia';
import { PuxarEssenciais } from '../../biblioteca/PuxarEssenciais';
import { useAtalhoDeRegistrarErro } from '../../componentes/atalho-de-erro';
import { FaixaOffline } from '../../componentes/estados';
import { AvisoDePosse } from '../../sincronizacao/AvisoDePosse';
import { CantoDaSessao } from '../../sessao/CantoDaSessao';
import { lugarDaRota } from '../lugares';
import { FiltrosM } from './FiltrosM';
import { MaisM } from './MaisM';
import { NavM } from './NavM';
import { ToastM } from './ToastM';
import { useMundo } from './mundo';
import { esquecerTelas } from './transicao';
import '../mockup/reset.css';
import '../mockup/fontes.css';
import '../mockup/mockup.css';
import '../mockup/ajustes.css';

/** As rotas com nav embaixo: o Agora (e, nas fatias seguintes, o Destino e o Varal). */
const COM_NAV = new Set(['/']);

/**
 * O quadro do Fio: o `<main class="app">` do mockup aprovado, com a nav, o "+" e o aviso dentro dele. A raiz
 * (`.m-fio`) faz o papel da página do protótipo e carrega o mundo (noite ou dia). O que muda de tela é o
 * `Outlet`; o quadro fica.
 */
export function CascaM() {
  const { pathname } = useLocation();
  const mundo = useMundo();
  useAtalhoDeRegistrarErro();
  useEffect(() => esquecerTelas, []);

  return (
    <div className="m-fio" data-mundo={mundo}>
      <AplicarAparencia />
      <PuxarEssenciais />
      <a
        className="m-pular-ao-conteudo"
        href="#conteudo"
        onClick={(e) => {
          // Com roteamento por hash, a âncora mudaria de rota: só move o foco.
          e.preventDefault();
          document.getElementById('conteudo')?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <FiltrosM />
      <main id="conteudo" className="m-app" tabIndex={-1}>
        <Outlet />
        {COM_NAV.has(pathname) && <NavM ativo={lugarDaRota(pathname)} />}
        <MaisM />
        <ToastM />
      </main>
      <div className="m-avisos">
        <FaixaOffline />
        <AvisoDePosse />
        <CantoDaSessao />
      </div>
    </div>
  );
}
