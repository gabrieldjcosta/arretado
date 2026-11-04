import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { AplicarAparencia } from '../Aparencia';
import { PuxarEssenciais } from '../biblioteca/PuxarEssenciais';
import { useAtalhoDeRegistrarErro } from '../componentes/atalho-de-erro';
import { FaixaOffline } from '../componentes/estados';
import { MaisGlobal } from '../componentes/MaisGlobal';
import { MenuAjuda } from '../componentes/MenuAjuda';
import { useTecladoAberto } from '../componentes/teclado-aberto';
import { Chegada } from '../entrada/Chegada';
import { reabrirGuia, telaDoGuia, useGuiaMontado } from '../guia/memoria';
import { secaoDeAjuda } from '../orientacoes/conteudo';
import { AvisoDePosse } from '../sincronizacao/AvisoDePosse';
import { CantoDaSessao } from '../sessao/CantoDaSessao';
import { RelatarProblema } from '../suporte/RelatarProblema';
import { semPilulaDosLugares } from './lugares';
import { MarcaDoFio } from './MarcaDoFio';
import { NavDosLugares } from './NavDosLugares';
import './fio-base.css';

/**
 * A casca do Arretado novo (prévia do Fio, D-D25): o nome com o cacto à esquerda (o nó da pessoa, que
 * abre a Conta), a Ajuda, o "+" de sempre (D-D23) e a pílula com os três lugares embaixo (que some no pouso, onde a
 * saída é o fio ou "descansar"). O que vem por
 * dentro (`Outlet`) é o de sempre: o Agora, o Destino e o Varal são as telas novas; o Leitor, a Biblioteca
 * e o Fixar seguem como estão até as fatias seguintes darem casa nova a cada um. Sem rodapé: o backup e os
 * dados moram na Conta. Os provedores (Abertura, itens do "+") vêm do `Shell`.
 */
export function CascaDoFio() {
  const { pathname } = useLocation();
  const [relatando, setRelatando] = useState(false);
  const [boasVindas, setBoasVindas] = useState(false);
  const tecladoAberto = useTecladoAberto();
  const telaComGuia = telaDoGuia(pathname);
  const semPilula = semPilulaDosLugares(pathname);
  const guiaMontado = useGuiaMontado(telaComGuia);

  useAtalhoDeRegistrarErro();

  return (
    <div
      className="shell shell-fio"
      data-teclado={tecladoAberto ? 'aberto' : undefined}
      data-largo={pathname === '/destino' ? 'sim' : undefined}
      data-sem-pilula={semPilula ? 'sim' : undefined}
    >
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
      <header className="fio-topo">
        <Link to="/conta" className="fio-marca" aria-label="Arretado: sua conta e ajustes">
          <MarcaDoFio />
        </Link>
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
        </div>
      </header>
      <MaisGlobal />
      <FaixaOffline />
      <AvisoDePosse />
      <main id="conteudo" className="conteudo fio-conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      {!semPilula && <NavDosLugares />}
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
