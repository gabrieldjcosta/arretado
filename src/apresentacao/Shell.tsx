import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { FaixaOffline } from './componentes/estados';
import { MenuAjuda } from './componentes/MenuAjuda';
import { teclaForaDosAtalhos } from './componentes/teclado';
import { secaoDeAjuda } from './orientacoes/conteudo';
import { RelatarProblema } from './suporte/RelatarProblema';
import { RODAPE_CURTO } from './textos';

const AREAS = [
  {
    caminho: '/',
    nome: 'Hoje',
    icone: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z',
  },
  { caminho: '/plano', nome: 'Plano', icone: 'M5 5h14v14H5zM5 10h14M9 3v4M15 3v4' },
  { caminho: '/recall', nome: 'Recall', icone: 'M5 8h11a3 3 0 0 1 3 3v7H8a3 3 0 0 1-3-3zM8 5h11' },
  {
    caminho: '/biblioteca',
    nome: 'Biblioteca',
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/** Moldura de todas as telas: 4 áreas, menu Ajuda, Conta fora da navegação, rodapé (D6). */
export function Shell() {
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const [relatando, setRelatando] = useState(false);

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
    <div className="shell">
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
        <Link to="/" className="marca">
          Arretado
          <svg
            className="marca-cacto"
            viewBox="0 0 22 30"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="8" y="2" width="6.5" height="26" rx="3.25" />
            <path d="M8 15H6.2A3.2 3.2 0 0 1 3 11.8V8.5a1.6 1.6 0 0 1 3.2 0V11a.8.8 0 0 0 .8.8H8z" />
            <path d="M14.5 19h1.8a3.2 3.2 0 0 0 3.2-3.2v-4.3a1.6 1.6 0 0 0-3.2 0V15a.8.8 0 0 1-.8.8h-1z" />
          </svg>
        </Link>
        <nav aria-label="Áreas" className="areas">
          {AREAS.map((a) => (
            <NavLink key={a.caminho} to={a.caminho} end={a.caminho === '/'}>
              <IconeDeArea d={a.icone} />
              <span>{a.nome}</span>
            </NavLink>
          ))}
        </nav>
        <div className="acoes-globais">
          <Link
            to="/recall/registrar"
            className="botao registrar-global"
            aria-keyshortcuts="E"
            title="Registrar erro (atalho: E)"
            aria-label="Registrar erro"
          >
            <span className="rotulo-longo">Registrar erro</span>
            <span className="rotulo-curto" aria-hidden="true">
              + Erro
            </span>
          </Link>
          <MenuAjuda
            paraAjuda={`/orientacoes/${secaoDeAjuda(pathname)}`}
            aoRelatar={() => {
              setRelatando(true);
            }}
          />
          <Link to="/conta" className="botao discreto conta-icone" aria-label="Conta e ajustes">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="8.5" r="3.5" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </Link>
        </div>
      </header>
      <FaixaOffline />
      <main id="conteudo" className="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="rodape">
        {RODAPE_CURTO} <Link to="/conta/dados">Backup e dados</Link>
      </footer>
      <Link
        to="/recall/registrar"
        className="botao principal flutuante"
        aria-label="Novo registro de erro"
        title="Registrar erro (atalho: E)"
      >
        <span aria-hidden="true">+</span>
      </Link>
      <RelatarProblema
        aberto={relatando}
        aoFechar={() => {
          setRelatando(false);
        }}
      />
    </div>
  );
}
