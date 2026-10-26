import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { FaixaOffline } from './componentes/estados';
import { Marca } from './componentes/escrita/Marca';
import { MenuAjuda } from './componentes/MenuAjuda';
import { teclaForaDosAtalhos } from './componentes/teclado';
import { useTecladoAberto } from './componentes/teclado-aberto';
import { TracoDeSelecao } from './componentes/traco/TracoDeSelecao';
import { reabrirGuia, telaDoGuia, useGuiaMontado } from './guia/memoria';
import { secaoDeAjuda } from './orientacoes/conteudo';
import { AvisoDePosse } from './sincronizacao/AvisoDePosse';
import { RelatarProblema } from './suporte/RelatarProblema';
import { RODAPE_CURTO, ROTULO_DA_AREA } from './textos';

const AREAS = [
  {
    caminho: '/',
    nome: ROTULO_DA_AREA.hoje,
    icone: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z',
  },
  { caminho: '/plano', nome: ROTULO_DA_AREA.plano, icone: 'M5 5h14v14H5zM5 10h14M9 3v4M15 3v4' },
  {
    caminho: '/recall',
    nome: ROTULO_DA_AREA.recall,
    icone: 'M5 8h11a3 3 0 0 1 3 3v7H8a3 3 0 0 1-3-3zM8 5h11',
  },
  {
    caminho: '/biblioteca',
    nome: ROTULO_DA_AREA.biblioteca,
    icone:
      'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19',
  },
] as const;

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
 * abas saem da frente.
 */
export function Shell() {
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const [relatando, setRelatando] = useState(false);
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
      <RelatarProblema
        aberto={relatando}
        aoFechar={() => {
          setRelatando(false);
        }}
      />
    </div>
  );
}
