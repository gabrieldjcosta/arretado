import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { FaixaOffline } from './componentes/estados';
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
  const [relatando, setRelatando] = useState(false);

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
