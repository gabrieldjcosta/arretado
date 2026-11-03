// "Hoje do tamanho do seu tempo" (AP-01; figura d-hoje): a pessoa toca 5, 10, 25 ou 45 min e o Hoje
// monta o lote de Cartões pelo valor, diz por que escolheu cada um e deixa o resto na fila. Sem
// escolha, a folha do Agora fica como era (cota diária). A escolha é só estado da tela. Os quatro tempos
// ficam recolhidos dentro da folha, atrás do link "tenho outro tempo" ao lado da estimativa (D-D16): o
// Hoje abre com um cartão e um botão, e quem tem outro tempo abre os minutos ali mesmo.
import { useId, useState, type ReactNode } from 'react';
import {
  MINUTOS_DA_SESSAO,
  minutosDoLote,
  motivoDoItem,
  tamanhoDoLote,
} from '../../dominios/recall/ordem-de-valor';
import { filaPorValor } from '../../dominios/recall/servico';
import { situacaoDeRetorno } from '../../dominios/dia/retorno';
import type { Repositorio } from '../../core/persistencia';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { useDados } from '../dados/contexto';
import type { ProximaAcao } from '../../dominios/hoje/contrato';
import { AgoraNoMapa } from './AgoraNoMapa';
import { rotaDeInicio } from './rota-de-inicio';
import { motivoDaAcao, rotuloDoBotao, tituloDaAcao } from './textos-da-acao';

async function carregarFila(repo: Repositorio) {
  const [fila, retorno] = await Promise.all([filaPorValor(repo), situacaoDeRetorno(repo)]);
  return { fila, diasFora: retorno?.diasFora ?? 0 };
}

/** Quantos itens o "Por que estes?" lista; o lote de 45 min chega a 90. */
const MOTIVOS_VISIVEIS = 10;

const cartoes = (n: number) => (n === 1 ? '1 cartão' : `${String(n)} cartões`);
const resumo = (texto: string) => (texto.length > 70 ? `${texto.slice(0, 69)}…` : texto);

export function RevisaoPorTempo({
  acao,
  parada,
  aoEscolherOutra,
  normaLida,
}: {
  acao: ProximaAcao;
  /** A linha de parada: uma linha quieta logo abaixo da folha. */
  parada: ReactNode;
  aoEscolherOutra: () => void;
  /** A norma da leitura salva: com tempo sobrando depois do lote, o Hoje aponta o trecho do mapa. */
  normaLida?: string;
}) {
  const { dados } = useDados(carregarFila);
  const [minutos, setMinutos] = useState<number | null>(null);
  const [mostrando, setMostrando] = useState(false);
  const idDoPainel = useId();
  const motivo = motivoDaAcao(acao);
  // Os minutos e a folha ficam sempre nas mesmas posições e o painel dos minutos está sempre no DOM
  // (escondido, quando recolhido): nada se move quando os dados chegam, e o botão não é recriado (um
  // toque durante a carga não se perde).
  const painel = (
    <div
      id={idDoPainel}
      className="tempo-do-hoje"
      role="group"
      aria-labelledby="tempo-do-hoje-rotulo"
      hidden={!mostrando}
    >
      <p id="tempo-do-hoje-rotulo" className="tempo-do-hoje-rotulo">
        Quanto tempo você tem?
      </p>
      <div className="tempo-do-hoje-opcoes">
        {MINUTOS_DA_SESSAO.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={minutos === m}
            className={minutos === m ? 'chip principal' : 'chip'}
            onClick={() => {
              setMinutos(minutos === m ? null : m);
            }}
          >
            {m} min
          </button>
        ))}
      </div>
    </div>
  );
  const tempo = {
    aberto: mostrando,
    idDoPainel,
    aoAlternar: () => {
      setMostrando((m) => !m);
    },
  };
  const fila = dados?.fila ?? [];
  if (minutos === null || !dados || fila.length === 0) {
    return (
      <>
        <AcaoAgora
          titulo={tituloDaAcao(acao)}
          {...(motivo === undefined ? {} : { motivo })}
          {...(acao.estimativaMin === undefined ? {} : { estimativa: acao.estimativaMin })}
          rotuloBotao={rotuloDoBotao(acao)}
          para={rotaDeInicio(acao)}
          aoEscolherOutra={aoEscolherOutra}
          emEvidencia
          tempo={tempo}
        >
          {painel}
        </AcaoAgora>
        {parada}
      </>
    );
  }

  const { diasFora } = dados;
  const lote = tamanhoDoLote(minutos, fila.length, diasFora);
  const resto = fila.length - lote;
  const escolhidos = fila.slice(0, lote);
  const comFaixa = escolhidos.some((c) => c.faixa !== undefined);
  return (
    <>
      <AcaoAgora
        titulo="Rever o que mais vale agora"
        motivo={`${cartoes(lote)}, ${comFaixa ? 'pelo que mais cai e está perto de esquecer' : 'os mais perto de esquecer'}.${diasFora >= 2 ? ' Depois de uma pausa o lote vem mais curto.' : ''}`}
        estimativa={minutosDoLote(lote)}
        rotuloBotao="Começar"
        para={`/recall/revisar?itens=${String(lote)}`}
        aoEscolherOutra={aoEscolherOutra}
        emEvidencia
        tempo={tempo}
      >
        {painel}
      </AcaoAgora>
      <details className="tempo-do-hoje-porque">
        <summary className="botao botao-texto na-margem">Por que estes?</summary>
        <ol>
          {escolhidos.slice(0, MOTIVOS_VISIVEIS).map((c) => (
            <li key={c.id}>
              <span>{resumo(c.frente)}</span>
              <span className="dica">{motivoDoItem(c)}</span>
            </li>
          ))}
        </ol>
        {lote > MOTIVOS_VISIVEIS && (
          <p className="dica">e mais {String(lote - MOTIVOS_VISIVEIS)}, na mesma ordem de valor.</p>
        )}
      </details>
      {resto > 0 && (
        <p className="dica">
          {resto === 1
            ? 'O outro 1 cartão continua na fila e entra'
            : `Os outros ${String(resto)} cartões continuam na fila e entram`}{' '}
          nos próximos dias, por ordem de valor.
        </p>
      )}
      {normaLida !== undefined && (
        <AgoraNoMapa normaId={normaLida} sobra={minutos - minutosDoLote(lote)} />
      )}
      {parada}
    </>
  );
}
