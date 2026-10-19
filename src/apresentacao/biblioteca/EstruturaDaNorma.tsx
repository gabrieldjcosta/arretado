import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemDaJanela, NoDaLeitura } from '../../dominios/legislacao/leitor';
import { PontoDeLuz, type EstadoDoPonto } from '../componentes/PontoDeLuz';
import { estadoDoBloco, RAIZ, vistaDaEstrutura, type IndiceDaEstrutura } from './estrutura';
import './estrutura.css';

/** O estado do bloco em palavras, para o leitor de tela (o ponto é só desenho). */
const ESTADO_POR_EXTENSO: Record<EstadoDoPonto, string> = {
  feito: 'lida',
  atual: 'em leitura',
  falta: 'ainda não lida',
};

/**
 * O nome do bloco: a rubrica dobrada nele (o `nome` logo depois) ou, no anexo e no bloco solto, o
 * próprio texto. Vazio enquanto o texto não chegou.
 */
function nomeDoBloco(
  nos: readonly NoDaLeitura[],
  textos: ReadonlyMap<number, ItemDaJanela>,
  indice: number,
): string {
  const proximo = nos[indice + 1]?.dispositivo;
  const rubrica = proximo?.tipo === 'nome' && proximo.paiId === nos[indice]?.dispositivo.id;
  const texto = textos.get(rubrica ? indice + 1 : indice)?.texto;
  return (
    texto?.trechos
      .map((t) => t.texto)
      .join('')
      .trim() ?? ''
  );
}

/**
 * A estrutura da norma ao lado do texto (Ponto de luz, P4; tablet e desktop): o bloco de agora e os
 * irmãos dele (as seções do capítulo), cada um com o ponto de luz do que já foi lido (feita, em
 * leitura, ainda não lida) e o de agora em cal, com os blocos de dentro dele logo abaixo; acima, o
 * caminho até a lista (título, capítulo). Tocar leva o bloco ao alto da tela, e tocar no caminho
 * sobe um nível. O estado vem do "lido até" (uma ação da pessoa); o bloco de agora segue a rolagem,
 * por salto, e só a lista que muda de bloco faz a tela se redesenhar.
 */
export function EstruturaDaNorma({
  nos,
  estrutura,
  textos,
  pedir,
  lidoAte,
  noDoAlto,
  ir,
}: {
  nos: readonly NoDaLeitura[];
  estrutura: IndiceDaEstrutura;
  textos: ReadonlyMap<number, ItemDaJanela>;
  /** Pede o texto dos nós de `de` a `ate` (o nome dos blocos pode estar longe do que se lê). */
  pedir: (de: number, ate: number) => void;
  /** Índice do nó do "lido até", se há. */
  lidoAte: number | undefined;
  /** Índice do nó no alto da tela, se há. */
  noDoAlto: () => number | undefined;
  ir: (indice: number) => void;
}) {
  // O bloco mais fundo da leitura: muda quando ela passa de um bloco a outro, não a cada nó.
  const blocoDoAlto = () => {
    const no = noDoAlto();
    return no === undefined ? RAIZ : (estrutura.dentroDe[no] ?? RAIZ);
  };
  const [dentro, setDentro] = useState(blocoDoAlto);
  useEffect(() => {
    let quadro = 0;
    const conferir = () => {
      quadro = 0;
      const no = noDoAlto();
      setDentro(no === undefined ? RAIZ : (estrutura.dentroDe[no] ?? RAIZ));
    };
    const aoRolar = () => {
      if (quadro === 0) quadro = requestAnimationFrame(conferir);
    };
    quadro = requestAnimationFrame(conferir);
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
    };
  }, [noDoAlto, estrutura]);

  const vista = useMemo(() => vistaDaEstrutura(estrutura, dentro), [estrutura, dentro]);
  useEffect(() => {
    const blocos = [...vista.acima, ...vista.itens.flatMap((item) => [item.bloco, ...item.dentro])];
    for (const bloco of blocos) pedir(bloco, bloco + 1);
  }, [vista, pedir]);

  // O bloco de agora fica à vista dentro do painel (que rola sozinho quando a lista é grande). Rola
  // só o painel, por salto: nunca a página, que é a leitura.
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
  }, [vista]);

  const item = (bloco: number, aqui: boolean) => {
    const estado = estadoDoBloco(estrutura, bloco, lidoAte);
    const nome = nomeDoBloco(nos, textos, bloco);
    return (
      <button
        type="button"
        className="estrutura-item"
        aria-current={aqui ? 'location' : undefined}
        data-aqui={aqui ? '' : undefined}
        onClick={() => {
          ir(bloco);
        }}
      >
        <PontoDeLuz estado={estado} />
        <span className="estrutura-nome">
          <span className="estrutura-rotulo">{nos[bloco]?.dispositivo.rotulo}</span>{' '}
          {nome && <span className="estrutura-titulo">{nome}</span>}
        </span>
        <span className="visualmente-oculto">, {ESTADO_POR_EXTENSO[estado]}</span>
      </button>
    );
  };

  return (
    <nav ref={painel} className="estrutura" aria-label="Estrutura da norma">
      {vista.acima.length > 0 && (
        <ol className="estrutura-acima">
          {vista.acima.map((bloco) => {
            const nome = nomeDoBloco(nos, textos, bloco);
            return (
              <li key={bloco}>
                <button
                  type="button"
                  onClick={() => {
                    ir(bloco);
                  }}
                >
                  {nos[bloco]?.dispositivo.rotulo}
                  {nome && `, ${nome}`}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <ol className="estrutura-itens">
        {vista.itens.map(({ bloco, dentro: blocosDeDentro }) => (
          <li key={bloco}>
            {item(bloco, bloco === vista.aqui)}
            {blocosDeDentro.length > 0 && (
              <ol
                className="estrutura-dentro"
                aria-label={`Dentro de ${nos[bloco]?.dispositivo.rotulo ?? ''}`}
              >
                {blocosDeDentro.map((filho) => (
                  <li key={filho}>{item(filho, false)}</li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
