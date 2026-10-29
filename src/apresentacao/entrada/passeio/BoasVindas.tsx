import { useEffect, useRef } from 'react';
import type { ControleDoZe } from '../../componentes/ze/controle';
import { Ze } from '../../componentes/ze/Ze';
import { BOAS_VINDAS } from './passos';
import { iniciarLuzDaMao, iniciarPiscadas } from './vida-do-ze';

interface Props {
  /** O título da tela é também o nome do diálogo (a Chegada o aponta em `aria-labelledby`). */
  idTitulo: string;
  aoVamos: () => void;
  aoAgoraNao: () => void;
}

/**
 * As Boas-vindas (D-D10): o Zé inteiro, a frase do Gabriel e só dois botões, "Vamos" e "Agora não". O
 * Zé dá vida à espera, e só aqui, onde a pessoa escolhe: pisca os dois olhos em rajadas curtas e, se ela
 * demora, a luz amarela da mão dele pisca (3 rodadas, no máximo; `vida-do-ze.ts`). Nos passos e no
 * Começar ele fica quieto. Tudo é decorativo e nenhum botão espera por ele.
 */
export function BoasVindas({ idTitulo, aoVamos, aoAgoraNao }: Props) {
  const zona = useRef<HTMLDivElement>(null);
  const ze = useRef<ControleDoZe>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const idFrase = `${idTitulo}-frase`;

  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    const pararPiscadas = iniciarPiscadas(() => ze.current);
    const pararLuz = zona.current
      ? iniciarLuzDaMao(() => ze.current, zona.current)
      : () => undefined;
    return () => {
      pararPiscadas();
      pararLuz();
    };
  }, []);

  return (
    <div className="chegada-tela" data-tela="boas" ref={zona}>
      <div className="chegada-topo">
        <span />
        <button type="button" className="botao botao-texto" onClick={aoAgoraNao}>
          {BOAS_VINDAS.agoraNao}
        </button>
      </div>
      <div className="chegada-corpo">
        <div className="chegada-ze">
          <Ze ref={ze} humor="neutro" tamanho="grande" />
        </div>
        <div className="chegada-texto">
          <h2 id={idTitulo} ref={titulo} tabIndex={-1} className="chegada-titulo">
            {BOAS_VINDAS.titulo}
          </h2>
          <p id={idFrase}>{BOAS_VINDAS.frase}</p>
        </div>
      </div>
      <div className="chegada-rodape">
        <button
          type="button"
          className="botao principal"
          aria-describedby={idFrase}
          onClick={aoVamos}
        >
          {BOAS_VINDAS.vamos}
        </button>
      </div>
    </div>
  );
}
