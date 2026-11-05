import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
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
import { AvisosDoFio } from './avisos/AvisosDoFio';
import { noQuadroDoFio, semPilulaDosLugares } from './lugares';
import { CascaM } from './m/CascaM';
import { PaletaDoFio } from './paleta/PaletaDoFio';
import { MarcaDoFio } from './MarcaDoFio';
import { NavDosLugares } from './NavDosLugares';
import { LinkDoFio } from './LinkDoFio';
import { useLuzDaHora } from './luz-da-hora';
import './fio-base.css';

/**
 * A casca de antes do quadro do mockup, que ainda serve as telas que não moram nele (Leitor, Biblioteca,
 * Fixar, Conta...): o nome com o cacto à esquerda (o nó da pessoa, que abre a Conta), a Ajuda, o "+"
 * de sempre (D-D23) e a pílula com os três lugares embaixo. Sem rodapé: o backup e os dados moram na Conta. Os
 * provedores (Abertura, itens do "+") vêm do `Shell`. Some quando as fatias seguintes derem casa nova a cada tela.
 */
function CascaLegada() {
  const { pathname } = useLocation();
  const [relatando, setRelatando] = useState(false);
  const [boasVindas, setBoasVindas] = useState(false);
  const tecladoAberto = useTecladoAberto();
  const telaComGuia = telaDoGuia(pathname);
  const semPilula = semPilulaDosLugares(pathname);
  const guiaMontado = useGuiaMontado(telaComGuia);

  const luz = useLuzDaHora();

  useAtalhoDeRegistrarErro();

  return (
    <AvisosDoFio>
      <div
        className="shell shell-fio"
        data-teclado={tecladoAberto ? 'aberto' : undefined}
        data-sem-pilula={semPilula ? 'sim' : undefined}
        data-luz={luz}
      >
        <AplicarAparencia />
        <PaletaDoFio />
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
          <LinkDoFio to="/conta" className="fio-marca" aria-label="Arretado: sua conta e ajustes">
            <MarcaDoFio />
          </LinkDoFio>
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
    </AvisosDoFio>
  );
}

/**
 * A casca do Arretado novo (prévia do Fio, D-D25). As telas que já moram no quadro do mockup aprovado (o
 * Agora, o Destino, o passo e o pouso) ficam na `CascaM`; as outras seguem na casca de antes até a fatia delas.
 */
export function CascaDoFio() {
  const { pathname } = useLocation();
  return noQuadroDoFio(pathname) ? <CascaM /> : <CascaLegada />;
}
