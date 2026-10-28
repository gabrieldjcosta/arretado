import { useEffect, useRef, useState } from 'react';
import type { ControleDoZe } from '../../componentes/ze/controle';
import { Ze } from '../../componentes/ze/Ze';
import { movimentoAgora } from '../../movimento';
import type { Roteiro } from './estado';
import { IconeDoPasso } from './IconeDoPasso';
import { CONTROLES, PASSOS, progressoDoPasso } from './passos';

/** O conteúdo sai em 160 ms e o seguinte entra em 160 ms (a curva e o deslocamento estão no CSS). */
const TROCA_MS = 160;

/** `parado` até o primeiro pedido; `saindo` enquanto o conteúdo velho sai; `entrou` depois da troca (a animação de entrada). */
type Fase = 'parado' | 'saindo' | 'entrou';

interface Props {
  /** O passo pedido (0 a 3). O que está na tela troca 160 ms depois, no movimento normal. */
  indice: number;
  roteiro: Roteiro;
  /** O título do passo e o texto de progresso nomeiam o diálogo (a Chegada os aponta em `aria-labelledby`). */
  idTitulo: string;
  idProgresso: string;
  aoSeguir: () => void;
  aoVoltar: () => void;
  aoPular: () => void;
}

/**
 * Um passo do Passeio (D-D10): o menu em quatro linhas (o nome, a frase, os itens), o ícone da aba
 * desenhado pela caneta e o Zé olhando para o cartão. Os botões não têm atalho para outra tela: o passo
 * só explica. Passar de um passo a outro não remonta a tela: o conteúdo sai (transição) e o seguinte
 * entra (animação), e o foco vai ao título para o leitor de tela ler o passo novo (a região viva da
 * Chegada o anuncia). No movimento reduzido a troca é na hora.
 */
export function PassoDoPasseio({
  indice,
  roteiro,
  idTitulo,
  idProgresso,
  aoSeguir,
  aoVoltar,
  aoPular,
}: Props) {
  const [exibido, setExibido] = useState(indice);
  const [pedido, setPedido] = useState(indice);
  const [fase, setFase] = useState<Fase>('parado');
  const [sentido, setSentido] = useState<'avanca' | 'volta'>('avanca');
  const titulo = useRef<HTMLHeadingElement>(null);
  const ze = useRef<ControleDoZe>(null);

  // Passo novo pedido: o conteúdo velho sai (ou, no movimento reduzido, o novo já ocupa o lugar).
  // Ajustar o estado durante a renderização evita um quadro com o passo velho e o texto novo.
  if (indice !== pedido) {
    setPedido(indice);
    setSentido(indice > pedido ? 'avanca' : 'volta');
    if (movimentoAgora() === 'reduzido') setExibido(indice);
    else setFase('saindo');
  }

  // Dois pedidos antes dos 160 ms: o relógio recomeça e só o último passo aparece.
  useEffect(() => {
    if (fase !== 'saindo') return;
    const relogio = window.setTimeout(() => {
      setExibido(pedido);
      setFase('entrou');
    }, TROCA_MS);
    return () => {
      window.clearTimeout(relogio);
    };
  }, [fase, pedido]);

  // Cada passo novo: o Zé olha para o cartão (uma vez) e o foco vai ao título.
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    ze.current?.humor('atento');
    ze.current?.olhar(-3, 2);
  }, [exibido]);

  const passo = PASSOS[exibido];
  if (passo === undefined) return null;
  const ultimo = exibido === PASSOS.length - 1;
  const voltar =
    exibido > 0
      ? CONTROLES.voltar
      : roteiro.origem === 'boas'
        ? CONTROLES.voltarAsBoasVindas
        : CONTROLES.voltarAoApp;

  return (
    <div className="chegada-tela" data-tela="passo">
      <div className="chegada-topo">
        <span className="chegada-progresso" id={idProgresso}>
          {progressoDoPasso(exibido)}
        </span>
        <button type="button" className="botao botao-texto" onClick={aoPular}>
          {CONTROLES.pular}
        </button>
      </div>
      <div className="chegada-corpo passo-corpo">
        <div className="passo-ze">
          <Ze ref={ze} humor="atento" tamanho="medio" />
        </div>
        <div className="passo-folha">
          <div className="passo-conteudo" data-fase={fase} data-sentido={sentido}>
            <IconeDoPasso d={passo.icone} />
            <h2 id={idTitulo} ref={titulo} tabIndex={-1} className="chegada-titulo passo-titulo">
              {passo.nome}
            </h2>
            <p className="passo-frase">{passo.frase}</p>
            <ul className="passo-itens">
              {passo.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="passo-pontos" aria-hidden="true">
          {PASSOS.map((p, i) => (
            <i
              key={p.id}
              data-estado={i < exibido ? 'feito' : i === exibido ? 'atual' : undefined}
            />
          ))}
        </div>
      </div>
      <div className="chegada-rodape">
        <button type="button" className="botao principal" onClick={aoSeguir}>
          {ultimo && roteiro.revisao ? CONTROLES.concluir : CONTROLES.seguir}
        </button>
        <button type="button" className="botao botao-texto" onClick={aoVoltar}>
          {voltar}
        </button>
      </div>
      <div className="passo-abas" aria-hidden="true">
        {PASSOS.map((p, i) => (
          <div key={p.id} className="passo-aba" data-atual={i === exibido ? '' : undefined}>
            <svg viewBox="0 0 24 24" focusable="false">
              <path d={p.icone} />
            </svg>
            <span>{p.nome}</span>
          </div>
        ))}
        <span
          className="passo-traco"
          style={{ transform: `translateX(${String(exibido * 100)}%)` }}
        />
      </div>
    </div>
  );
}
