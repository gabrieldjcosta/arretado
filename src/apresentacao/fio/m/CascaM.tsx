import { Suspense, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Outlet, useLocation } from 'react-router';
import { AplicarAparencia } from '../../Aparencia';
import { PuxarEssenciais } from '../../biblioteca/PuxarEssenciais';
import { useAtalhoDeRegistrarErro } from '../../componentes/atalho-de-erro';
import { FaixaOffline } from '../../componentes/estados';
import { AvisoDePosse } from '../../sincronizacao/AvisoDePosse';
import { CantoDaSessao } from '../../sessao/CantoDaSessao';
import { useEstadoDaAbertura } from '../../componentes/escrita/vez-da-escrita';
import { ROTA_DA_PROVA, ROTA_DO_DESTINO, comNavDoFio, lugarDaRota } from '../lugares';
import { useLuzDaHora } from '../luz-da-hora';
import { AberturaM } from './AberturaM';
import { FiltrosM } from './FiltrosM';
import { aparelhoLeve } from './leve';
import { MaisM } from './MaisM';
import { NavM } from './NavM';
import { ToastM } from './ToastM';
import { useMovimentoDoFio } from './movimento';
import { useMundo } from './mundo';
import { ligarOndaDeLuz } from './onda';
import { ligarBrilhoAoToque } from './brilho-ao-toque';
import { esquecerTelas } from './transicao';
import '../mockup/reset.css';
import '../mockup/fontes.css';
import '../mockup/mockup.css';
import '../mockup/ajustes.css';

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
  // A luz da hora esquenta só o brilho de baixo do dia (desvio 21 em `ajustes.css`).
  const luz = useLuzDaHora();
  // Aparelho fraco: sem as camadas de brilho, como o modo leve do mockup (lido uma vez; o aparelho não muda no meio).
  const [leve] = useState(aparelhoLeve);
  useAtalhoDeRegistrarErro();
  // A abertura do mockup: só quando o app abriu no Agora (de outra rota, ela sai quieta) e enquanto o provedor a quer.
  const { camadaDoFio } = useEstadoDaAbertura();
  const [abriuNoAgora, setAbriuNoAgora] = useState<boolean | null>(null);
  if (camadaDoFio && abriuNoAgora === null) setAbriuNoAgora(pathname === '/');
  const naAbertura = camadaDoFio !== null && abriuNoAgora === true;
  const saiuQuieta = camadaDoFio !== null && abriuNoAgora === false;
  const aoSairDaCamada = camadaDoFio?.aoSair;
  useEffect(() => {
    if (saiuQuieta) aoSairDaCamada?.('fim');
  }, [saiuQuieta, aoSairDaCamada]);
  useEffect(() => esquecerTelas, []);
  // A onda de luz em todo botão de ação, como no mockup (um ouvinte do documento, ligado enquanto o quadro vive).
  useEffect(() => ligarOndaDeLuz(), []);
  // A alvorada do botão de ação e a onda do botão redondo (desvio 48 em `ajustes.css`).
  useEffect(() => ligarBrilhoAoToque(), []);

  return (
    <div
      className={leve ? 'm-fio m-leve' : 'm-fio'}
      data-mundo={mundo}
      data-movimento={movimento}
      data-luz={luz}
    >
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
      <FiltrosM mundo={mundo} />
      {/* No monitor o Destino alarga o quadro (`m-largo`, do mockup): o texto à esquerda e o mapa à direita. */}
      <main
        id="conteudo"
        className={pathname === ROTA_DO_DESTINO ? 'm-app m-largo' : 'm-app'}
        tabIndex={-1}
        data-entrada={naAbertura ? 'abertura' : undefined}
      >
        {/* A fronteira fica no quadro, não em cada tela: a tela que chega pela primeira vez (um pedaço à parte do
            pacote) é esperada com a atual ainda à vista, porque a troca de rota é uma transição e o React só
            revela a nova pronta. Uma fronteira nova por tela mostraria o vão e o React o seguraria 300 ms. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
        {naAbertura && (
          <AberturaM
            camada={{
              ...camadaDoFio,
              // O ponto pousou: a abertura sai e a tela seguinte aparece no mesmo quadro.
              aoSair: (como) => {
                flushSync(() => {
                  camadaDoFio.aoSair(como);
                });
              },
            }}
          />
        )}
        {comNavDoFio(pathname) && !naAbertura && (
          <NavM ativo={lugarDaRota(pathname)} caminho={pathname} />
        )}
        {!naAbertura && pathname !== ROTA_DA_PROVA && <MaisM />}
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
