import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { FaixaOffline } from './componentes/estados';
import { MenuAjuda } from './componentes/MenuAjuda';
import { teclaForaDosAtalhos } from './componentes/teclado';
import { secaoDeAjuda } from './orientacoes/conteudo';
import { RelatarProblema } from './suporte/RelatarProblema';

export const RODAPE =
  'Você é responsável por exportar e importar os próprios dados. Arquivos alterados fora do aplicativo não passam na validação e não podem ser restaurados.';

const AREAS = [
  { caminho: '/', nome: 'Hoje' },
  { caminho: '/plano', nome: 'Plano' },
  { caminho: '/recall', nome: 'Recall' },
  { caminho: '/biblioteca', nome: 'Biblioteca' },
] as const;

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
              {a.nome}
            </NavLink>
          ))}
        </nav>
        <div className="acoes-globais">
          <Link
            to="/recall/registrar"
            className="botao principal"
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
          <Link to="/conta" className="botao discreto" aria-label="Conta e ajustes">
            Conta
          </Link>
        </div>
      </header>
      <FaixaOffline />
      <main id="conteudo" className="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="rodape">{RODAPE}</footer>
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
