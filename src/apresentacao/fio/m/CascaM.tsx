import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AplicarAparencia } from '../../Aparencia';
import { PuxarEssenciais } from '../../biblioteca/PuxarEssenciais';
import { useAtalhoDeRegistrarErro } from '../../componentes/atalho-de-erro';
import { FaixaOffline } from '../../componentes/estados';
import { AvisoDePosse } from '../../sincronizacao/AvisoDePosse';
import { CantoDaSessao } from '../../sessao/CantoDaSessao';
import { lugarDaRota } from '../lugares';
import { FiltrosM } from './FiltrosM';
import { aparelhoLeve } from './leve';
import { MaisM } from './MaisM';
import { NavM } from './NavM';
import { ToastM } from './ToastM';
import { useMovimentoDoFio } from './movimento';
import { useMundo } from './mundo';
import { ligarOndaDeLuz } from './onda';
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
  // Vivo ou Calmo: dele depende a cara do botão de ação (o Sol ou o Só contorno; desvio 17 em `ajustes.css`).
  const movimento = useMovimentoDoFio();
  // Aparelho fraco: sem as camadas de brilho, como o modo leve do mockup (lido uma vez; o aparelho não muda no meio).
  const [leve] = useState(aparelhoLeve);
  useAtalhoDeRegistrarErro();
  useEffect(() => esquecerTelas, []);
  // A onda de luz em todo botão de ação, como no mockup (um ouvinte do documento, ligado enquanto o quadro vive).
  useEffect(() => ligarOndaDeLuz(), []);

  return (
    <div className={leve ? 'm-fio m-leve' : 'm-fio'} data-mundo={mundo} data-movimento={movimento}>
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
        {/* A fronteira fica no quadro, não em cada tela: a tela que chega pela primeira vez (um pedaço à parte do
            pacote) é esperada com a atual ainda à vista, porque a troca de rota é uma transição e o React só
            revela a nova pronta. Uma fronteira nova por tela mostraria o vão e o React o seguraria 300 ms. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
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
