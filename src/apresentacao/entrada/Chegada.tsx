import { useEffect, useId, useState } from 'react';
import { Dialogo } from '../componentes/Dialogo';
import { BoasVindas } from './passeio/BoasVindas';
import {
  anuncioDaTela,
  aoEsc,
  aoPular,
  aoSeguir,
  aoVamos,
  aoVoltar,
  PRIMEIRO_PASSO,
  TELA_BOAS,
  type Destino,
  type Roteiro,
  type Tela,
} from './passeio/estado';
import { PassoDoPasseio } from './passeio/PassoDoPasseio';
import { TelaComecar } from './passeio/TelaComecar';
import { lembrarDaChegada } from './regras';
import './passeio/estilos-passeio.css';

interface Props {
  /**
   * O Dia da primeira vez neste aparelho: a Chegada o grava ao aparecer, e a Entrada do Dia não abre
   * no mesmo Dia. Sem `dia`, é o passeio refeito (Ajuda › "Rever as boas-vindas" e Conta › "Passeio pelos
   * menus"): não grava nada, o último passo diz "Concluir" e o Começar não aparece.
   */
  dia?: string;
  /** Onde o passeio abre: nas Boas-vindas, ou direto no primeiro passo (Conta). */
  inicio?: 'boas' | 'passo';
  /** Avisa que a folha saiu (depois de o `<dialog>` fechar, para o foco voltar a quem a abriu). */
  aoFechar?: () => void;
}

/**
 * A Chegada (D-D10, no lugar da folha da D-D9): a primeira coisa que o aparelho novo mostra, sobre o Hoje.
 * Três telas num `<dialog>` só: as Boas-vindas ("Vamos" e "Agora não"), o Passeio pelos quatro menus (um
 * passo por menu, sem atalho para outra tela) e o Começar (entrar com o Google ou experimentar sem
 * conta). "Escolher meu concurso" saiu daqui: o Hoje vazio já o oferece. Esc fecha as Boas-vindas e o
 * Começar e, num passo, pula o passeio. O título de cada tela nomeia o diálogo, e uma região viva anuncia
 * a tela nova. As regras de para onde cada controle leva estão em `passeio/estado.ts`, e os textos, em
 * `passeio/passos.ts` (uma fonte só, a do Gabriel).
 */
export function Chegada({ dia, inicio = 'boas', aoFechar }: Props) {
  const [aberto, setAberto] = useState(true);
  const [tela, setTela] = useState<Tela>(inicio === 'passo' ? PRIMEIRO_PASSO : TELA_BOAS);
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idProgresso = `${id}-progresso`;
  const roteiro: Roteiro = { revisao: dia === undefined, origem: inicio };

  useEffect(() => {
    if (dia !== undefined) lembrarDaChegada(dia);
  }, [dia]);
  // Dispensada, a folha só sai depois de o <dialog> fechar: assim o foco volta a quem a abriu.
  useEffect(() => {
    if (!aberto) aoFechar?.();
  }, [aberto, aoFechar]);

  const fechar = () => {
    setAberto(false);
  };
  const ir = (destino: Destino) => {
    if (destino === 'fechar') fechar();
    else setTela(destino);
  };
  // Seguir um caminho tira a folha já: o foco fica com a página nova, não volta a quem a abriu.
  const sair = () => {
    setAberto(false);
    aoFechar?.();
  };

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={() => {
        ir(aoEsc(tela, roteiro));
      }}
      idDoTitulo={tela.tipo === 'passo' ? `${idProgresso} ${idTitulo}` : idTitulo}
      classe="dialogo-chegada"
    >
      {tela.tipo === 'boas' && (
        <BoasVindas
          idTitulo={idTitulo}
          aoVamos={() => {
            ir(aoVamos());
          }}
          aoAgoraNao={fechar}
        />
      )}
      {tela.tipo === 'passo' && (
        <PassoDoPasseio
          indice={tela.indice}
          roteiro={roteiro}
          idTitulo={idTitulo}
          idProgresso={idProgresso}
          aoSeguir={() => {
            ir(aoSeguir(tela, roteiro));
          }}
          aoVoltar={() => {
            ir(aoVoltar(tela, roteiro));
          }}
          aoPular={() => {
            ir(aoPular(roteiro));
          }}
        />
      )}
      {tela.tipo === 'comecar' && (
        <TelaComecar idTitulo={idTitulo} aoEntrar={sair} aoSemConta={fechar} />
      )}
      <div role="status" className="visualmente-oculto">
        {anuncioDaTela(tela)}
      </div>
    </Dialogo>
  );
}
