import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { AREAS } from './areas';
import { FaixaOffline } from './componentes/estados';
import { Marca } from './componentes/escrita/Marca';
import { MenuAjuda } from './componentes/MenuAjuda';
import { teclaForaDosAtalhos } from './componentes/teclado';
import { useTecladoAberto } from './componentes/teclado-aberto';
import { TracoDeSelecao } from './componentes/traco/TracoDeSelecao';
import { reabrirGuia, telaDoGuia, useGuiaMontado } from './guia/memoria';
import { secaoDeAjuda } from './orientacoes/conteudo';
import { CantoDaSessao } from './sessao/CantoDaSessao';
import { Chegada } from './entrada/Chegada';
import { ProvedorDaAbertura } from './entrada/abertura/ProvedorDaAbertura';
import { AvisoDePosse } from './sincronizacao/AvisoDePosse';
import { RelatarProblema } from './suporte/RelatarProblema';
import { RODAPE_CURTO } from './textos';

/** Ícone de linha da navegação: decorativo; o nome da área continua como texto. */
function IconeDeArea({ d }: { d: string }) {
  return (
    <svg
      className="area-icone"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Moldura de todas as telas (D6; casca da D-D9, Q2): cabeçalho com o lockup da marca, Ajuda e Conta;
 * as quatro áreas em abas sobre o chão, a atual com o traço de caneta embaixo (no CSS), embaixo até
 * 899 px e no cabeçalho a partir de 900 (com "Registrar erro" e a tecla E); rodapé no fim do
 * conteúdo. O "+" mora no título das telas que registram (`TituloComMais`). Com o teclado aberto, as
 * abas saem da frente. Tudo fica dentro da Abertura (`ProvedorDaAbertura`): ela decide se o nome se
 * escreve em tela cheia ou no cabeçalho, e a Chegada espera por ela.
 */
export function Shell() {
  return (
    <ProvedorDaAbertura>
      <CascaDoApp />
    </ProvedorDaAbertura>
  );
}

function CascaDoApp() {
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const [relatando, setRelatando] = useState(false);
  const [boasVindas, setBoasVindas] = useState(false);
  const tecladoAberto = useTecladoAberto();
  const telaComGuia = telaDoGuia(pathname);
  const guiaMontado = useGuiaMontado(telaComGuia);

  // Atalho global "E": registrar erro (fora de campos de texto).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || teclaForaDosAtalhos(e)) return;
      e.preventDefault();
      void navegar('/recall/registrar');
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, [navegar]);

  return (
    <div className="shell" data-teclado={tecladoAberto ? 'aberto' : undefined}>
      <AplicarAparencia />
      <a
        className="pular"
        href="#conteudo"
        onClick={(e) => {
          // Com roteamento por hash, a âncora mudaria de rota: só move o foco.
          e.preventDefault();
          document.getElementById('conteudo')?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <header className="topo">
        <Link to="/" className="marca" aria-label="Arretado, início">
          <Marca />
        </Link>
        <nav aria-label="Áreas" className="areas">
          {AREAS.map((a) => (
            <NavLink key={a.caminho} to={a.caminho} end={a.caminho === '/'}>
              {({ isActive }) => (
                <>
                  <IconeDeArea d={a.icone} />
                  <span>{a.nome}</span>
                  <TracoDeSelecao chave={`area:${a.caminho}`} ativo={isActive} />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="acoes-globais">
          <Link
            to="/recall/registrar"
            className="botao registrar-global"
            aria-keyshortcuts="E"
            title="Registrar erro (atalho: E)"
          >
            Registrar erro
            <kbd className="atalho" aria-hidden="true">
              E
            </kbd>
          </Link>
          <MenuAjuda
            paraAjuda={`/orientacoes/${secaoDeAjuda(pathname)}`}
            {...(telaComGuia &&
              guiaMontado && {
                aoGuia: () => {
                  reabrirGuia(telaComGuia);
                },
              })}
            aoBoasVindas={() => {
              setBoasVindas(true);
            }}
            aoRelatar={() => {
              setRelatando(true);
            }}
          />
          <Link to="/conta" className="botao discreto conta-botao" aria-label="Conta e ajustes">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5.5 19.5c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
            </svg>
          </Link>
        </div>
      </header>
      <FaixaOffline />
      <AvisoDePosse />
      <main id="conteudo" className="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="rodape">
        <p>{RODAPE_CURTO}</p>
        <Link to="/conta/dados" className="botao botao-texto">
          Backup e dados
        </Link>
      </footer>
      <CantoDaSessao />
      {boasVindas && (
        <Chegada
          aoFechar={() => {
            setBoasVindas(false);
          }}
        />
      )}
      <RelatarProblema
        aberto={relatando}
        aoFechar={() => {
          setRelatando(false);
        }}
      />
    </div>
  );
}
