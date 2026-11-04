import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { AplicarAparencia } from './Aparencia';
import { PuxarEssenciais } from './biblioteca/PuxarEssenciais';
import { AREAS } from './areas';
import { FaixaOffline } from './componentes/estados';
import { Marca } from './componentes/escrita/Marca';
import {
  criarRegistroDeItens,
  ProvedorDeItensDoMais,
  useRegistroDeItens,
} from './componentes/ItensDoMais';
import { MaisGlobal } from './componentes/MaisGlobal';
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
 * 899 px e no cabeçalho a partir de 900; rodapé no fim do conteúdo. O "+" (`MaisGlobal`, D-D23) é um só,
 * fixo no canto de cima à direita de toda tela, e o cabeçalho reserva o lugar dele no recuo; a tecla E
 * registra um erro de qualquer tela. Com o teclado aberto, as abas saem da frente. Tudo fica dentro da Abertura
 * (`ProvedorDaAbertura`): ela decide se o nome se escreve em tela cheia ou no cabeçalho, e a Chegada
 * espera por ela.
 */
export function Shell() {
  // Os itens que a tela acrescenta ao "+" (D-D24): o registro nasce com a casca e a tela se inscreve nele.
  const [registro] = useState(criarRegistroDeItens);
  return (
    <ProvedorDaAbertura>
      <ProvedorDeItensDoMais value={registro}>
        <CascaDoApp />
      </ProvedorDeItensDoMais>
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
  const registro = useRegistroDeItens();

  // Atalho global "E": registrar erro (fora de campos de texto). A tela pode ter o registro dela, ligado ao
  // que está à vista (no Leitor, o dispositivo no alto da tela, sem sair da lei); sem ele, vai ao registro.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || teclaForaDosAtalhos(e)) return;
      e.preventDefault();
      const daTela = registro?.itens().find((item) => item.id === 'registrar-erro');
      if (daTela && daTela.indisponivel !== true) daTela.aoEscolher();
      else void navegar('/recall/registrar');
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, [navegar, registro]);

  return (
    <div className="shell" data-teclado={tecladoAberto ? 'aberto' : undefined}>
      <AplicarAparencia />
      <PuxarEssenciais />
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
      <MaisGlobal />
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
