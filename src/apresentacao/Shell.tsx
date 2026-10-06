import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { FaixaOffline } from './componentes/estados';
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

/** Moldura de todas as telas: 4 áreas, ? e !, Conta fora da navegação, rodapé (D6). */
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
          <Link
            to={`/orientacoes/${secaoDeAjuda(pathname)}`}
            className="botao discreto icone"
            aria-label="Ajuda sobre esta tela"
            title="Ajuda sobre esta tela"
          >
            ?
          </Link>
          <button
            type="button"
            className="discreto icone"
            aria-label="Relatar problema"
            title="Relatar problema"
            onClick={() => {
              setRelatando(true);
            }}
          >
            !
          </button>
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
      <RelatarProblema
        aberto={relatando}
        aoFechar={() => {
          setRelatando(false);
        }}
      />
    </div>
  );
}
