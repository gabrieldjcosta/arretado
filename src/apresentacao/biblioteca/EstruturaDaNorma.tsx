import { useEffect, useMemo, useRef } from 'react';
import type { ItemDaJanela, NoDaLeitura } from '../../dominios/legislacao/leitor';
import { PontoDeLuz, type EstadoDoPonto } from '../componentes/PontoDeLuz';
import {
  arvoreDaEstrutura,
  contagemDeArtigos,
  ESTADO_POR_EXTENSO,
  estadoDoBloco,
  noDoNome,
  nomeDoTexto,
  RAIZ,
  type IndiceDaEstrutura,
} from './estrutura';
import { useBlocoDeAgora } from './useBlocoDeAgora';
import './estrutura.css';

/** O nome do bloco (ver `noDoNome`). Vazio enquanto o texto não chegou. */
function nomeDoBloco(
  nos: readonly NoDaLeitura[],
  textos: ReadonlyMap<number, ItemDaJanela>,
  indice: number,
): string {
  return nomeDoTexto(textos.get(noDoNome(nos, indice))?.texto);
}

/**
 * Um bloco na lista (no painel ao lado do texto e no sumário do celular): o ponto de luz do estado, o
 * rótulo, o nome por baixo e o estado por extenso para o leitor de tela. O de agora leva `aria-current`.
 */
export function ItemDaEstrutura({
  rotulo,
  nome,
  estado,
  aqui,
  nivel,
  aoIr,
}: {
  rotulo: string | undefined;
  nome: string;
  estado: EstadoDoPonto;
  aqui: boolean;
  /** Quantos blocos há acima dele: o recuo na lista do sumário (o painel não o usa). */
  nivel?: number;
  aoIr: () => void;
}) {
  return (
    <button
      type="button"
      className="estrutura-item"
      aria-current={aqui ? 'location' : undefined}
      data-aqui={aqui ? '' : undefined}
      data-nivel={nivel}
      onClick={aoIr}
    >
      <PontoDeLuz estado={estado} />
      <span className="estrutura-nome">
        <span className="estrutura-rotulo">{rotulo}</span>{' '}
        {nome && <span className="estrutura-titulo">{nome}</span>}
      </span>
      <span className="visualmente-oculto">, {ESTADO_POR_EXTENSO[estado]}</span>
    </button>
  );
}

/**
 * A trilha do alto (tablet em pé e celular, onde o painel não está ao lado do texto): o caminho até a leitura
 * ("Livro I › Título I › Capítulo I"), só com os rótulos, e a pessoa toca nela para abrir o sumário. Some antes
 * do primeiro bloco.
 */
export function TrilhaDaNorma({
  nos,
  estrutura,
  noDaLeitura,
  abrirSumario,
}: {
  nos: readonly NoDaLeitura[];
  estrutura: IndiceDaEstrutura;
  noDaLeitura: () => number | undefined;
  abrirSumario: () => void;
}) {
  const aqui = useBlocoDeAgora(noDaLeitura, estrutura);
  const caminho: string[] = [];
  for (let b = aqui; b !== RAIZ; b = estrutura.pai[b] ?? RAIZ) {
    caminho.unshift(nos[b]?.dispositivo.rotulo ?? '');
  }
  if (caminho.length === 0) return null;
  return (
    <button type="button" className="trilha-da-norma" aria-haspopup="dialog" onClick={abrirSumario}>
      <span className="visualmente-oculto">Abrir o sumário, você está em</span>
      {caminho.map((rotulo, i) => (
        <span key={i} data-aqui={i === caminho.length - 1 ? '' : undefined}>
          {rotulo}
        </span>
      ))}
    </button>
  );
}

/**
 * A estrutura da norma ao lado do texto (tablet e desktop), em árvore: Livro, Título, Capítulo. Os blocos de cima
 * ficam sempre à vista; os de dentro, só dos que levam à leitura. O bloco de agora fica marcado, cada um traz o
 * ponto de luz do que já foi lido, e o topo diz quantos artigos já foram lidos. Tocar leva o bloco ao alto da tela.
 * O estado vem do "lido até" (uma ação da pessoa); o bloco de agora segue a rolagem, por salto, assim que o
 * cabeçalho dele passa da linha de leitura (um quarto da tela abaixo do alto).
 */
export function EstruturaDaNorma({
  nos,
  estrutura,
  textos,
  pedir,
  lidoAte,
  noDaLeitura,
  voltando,
  ir,
}: {
  nos: readonly NoDaLeitura[];
  estrutura: IndiceDaEstrutura;
  textos: ReadonlyMap<number, ItemDaJanela>;
  /** Pede o texto dos nós de `de` a `ate` (o nome dos blocos pode estar longe do que se lê). */
  pedir: (de: number, ate: number) => void;
  /** Índice do nó do "lido até", se há. */
  lidoAte: number | undefined;
  /** Índice do nó da leitura (o cabeçalho de bloco que já passou da linha de leitura, ou o do alto da tela), se há. */
  noDaLeitura: () => number | undefined;
  /** O leitor volta à posição guardada: os nomes esperam, para não atrasar o texto que ela pede. */
  voltando: boolean;
  ir: (indice: number) => void;
}) {
  const dentro = useBlocoDeAgora(noDaLeitura, estrutura);
  const linhas = useMemo(() => arvoreDaEstrutura(estrutura, dentro), [estrutura, dentro]);
  useEffect(() => {
    if (voltando) return;
    for (const { bloco } of linhas) pedir(bloco, bloco + 1);
  }, [linhas, pedir, voltando]);

  const { lidos, total } = useMemo(() => contagemDeArtigos(nos, lidoAte), [nos, lidoAte]);
  const porcento = total === 0 ? 0 : Math.round((lidos / total) * 100);

  // O bloco de agora fica à vista dentro do painel (que rola sozinho quando a árvore é grande). Rola só o
  // painel, por salto: nunca a página, que é a leitura. Refaz quando os nomes chegam, que mudam a altura das linhas.
  const painel = useRef<HTMLElement>(null);
  useEffect(() => {
    const quadro = painel.current;
    const atual = quadro?.querySelector<HTMLElement>('[data-aqui]');
    if (!quadro || !atual) return;
    const folga = 8;
    if (atual.offsetTop < quadro.scrollTop) quadro.scrollTop = atual.offsetTop - folga;
    else if (atual.offsetTop + atual.offsetHeight > quadro.scrollTop + quadro.clientHeight) {
      quadro.scrollTop = atual.offsetTop + atual.offsetHeight - quadro.clientHeight + folga;
    }
  }, [linhas, textos]);

  return (
    <nav ref={painel} className="estrutura-da-norma" aria-label="Estrutura da norma">
      {total > 0 && (
        <div className="estrutura-progresso">
          <progress
            max={total}
            value={lidos}
            aria-label="Artigos lidos"
            aria-valuetext={`${String(lidos)} de ${String(total)} artigos, ${String(porcento)}% lido`}
          />
          <p>
            {lidos > 0
              ? `Art. ${lidos.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} · ${String(porcento)}% lido`
              : `${total.toLocaleString('pt-BR')} artigos · nada lido ainda`}
          </p>
        </div>
      )}
      <ol className="estrutura-itens">
        {linhas.map(({ bloco, nivel, aqui, noCaminho }) => (
          <li
            key={bloco}
            data-nivel={Math.min(nivel, 3)}
            data-no-caminho={noCaminho ? '' : undefined}
          >
            <ItemDaEstrutura
              rotulo={nos[bloco]?.dispositivo.rotulo}
              nome={nomeDoBloco(nos, textos, bloco)}
              estado={estadoDoBloco(estrutura, bloco, lidoAte)}
              aqui={aqui}
              aoIr={() => {
                ir(bloco);
              }}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
