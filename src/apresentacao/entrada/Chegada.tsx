import { useCallback, useEffect, useId, useState } from 'react';
import { Dialogo } from '../componentes/Dialogo';
import { useEstadoDaAbertura } from '../componentes/escrita/vez-da-escrita';
import { BoasVindas } from './passeio/BoasVindas';
import type { EntradaDoZe } from './passeio/entrada-do-ze';
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

/** A classe do `<dialog>` em cada entrada: a espera o esconde, e o desenho o mostra sem esmaecer. */
const CLASSE_DA_ENTRADA: Record<EntradaDoZe, string> = {
  espera: 'dialogo-chegada dialogo-chegada-espera',
  desenhar: 'dialogo-chegada dialogo-chegada-desenha',
  pronta: 'dialogo-chegada',
};

/**
 * A Chegada (D-D10, no lugar da folha da D-D9): a primeira coisa que o aparelho novo mostra, sobre o Hoje.
 * Três telas num `<dialog>` só: as Boas-vindas ("Vamos" e "Agora não"), o Passeio pelos quatro menus (um
 * passo por menu, sem atalho para outra tela) e o Começar (os dois botões de conta: entrar com o Google ou
 * continuar sem conta, que a pessoa vê ao fim do passeio ou ao pulá-lo). "Escolher meu concurso" saiu daqui:
 * o Hoje vazio já o oferece. "Agora não" recusa o passeio e fecha a folha, como Esc nas Boas-vindas e no
 * Começar; Esc num passo pula o passeio. O título de cada tela nomeia o diálogo (nas Boas-vindas, um texto
 * só para o leitor de tela, com o nome do app), e uma região viva anuncia a tela nova. As regras de para
 * onde cada controle leva estão em `passeio/estado.ts`, e os textos, em `passeio/passos.ts` (uma fonte só,
 * a do Gabriel).
 *
 * Na primeira vez, se a luz da Abertura vai ao Zé (`voaParaAChegada`), a Chegada abre já, na `espera`:
 * invisível e sem pegar toque, por cima da Abertura, para a luz ter para onde voar. Quando a luz pousa
 * ela se revela e o Zé se desenha (`desenhar`); se a Abertura sai antes (pulada, ou a luz foi ao
 * cabeçalho), o Zé aparece pronto, como em toda outra Chegada.
 */
export function Chegada({ dia, inicio = 'boas', aoFechar }: Props) {
  const { emCurso, voaParaAChegada, encontro } = useEstadoDaAbertura();
  const [aberto, setAberto] = useState(true);
  const [entrada, setEntrada] = useState<EntradaDoZe>(() =>
    dia !== undefined && inicio === 'boas' && emCurso && voaParaAChegada ? 'espera' : 'pronta',
  );
  // A Abertura saiu sem a luz pousar no Zé (pulada, ou a luz foi ao cabeçalho): o Zé aparece pronto.
  if (entrada === 'espera' && !emCurso) setEntrada('pronta');
  const espera = entrada === 'espera';
  const receber = useCallback(() => {
    setEntrada((atual) => (atual === 'espera' ? 'desenhar' : atual));
  }, []);
  const [tela, setTela] = useState<Tela>(inicio === 'passo' ? PRIMEIRO_PASSO : TELA_BOAS);
  // O Zé se desenha uma vez só: quem segue ("Vamos") e volta às boas-vindas o encontra pronto.
  if (entrada === 'desenhar' && tela.tipo !== 'boas') setEntrada('pronta');
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idProgresso = `${id}-progresso`;
  const roteiro: Roteiro = { revisao: dia === undefined, origem: inicio };

  // Escondida por baixo da Abertura ela ainda não foi vista: só conta como vista quando aparece.
  useEffect(() => {
    if (dia !== undefined && !espera) lembrarDaChegada(dia);
  }, [dia, espera]);
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
        if (!espera) ir(aoEsc(tela, roteiro));
      }}
      idDoTitulo={tela.tipo === 'passo' ? `${idProgresso} ${idTitulo}` : idTitulo}
      classe={CLASSE_DA_ENTRADA[entrada]}
    >
      {tela.tipo === 'boas' && (
        <BoasVindas
          idTitulo={idTitulo}
          aoVamos={() => {
            ir(aoVamos());
          }}
          aoAgoraNao={fechar}
          entrada={entrada}
          encontro={encontro}
          aoReceber={receber}
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
