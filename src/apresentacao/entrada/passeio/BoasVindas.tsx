import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Encontro, PeDoZe } from '../../componentes/escrita/encontro';
import type { ControleDoZe } from '../../componentes/ze/controle';
import { Ze } from '../../componentes/ze/Ze';
import { desenharOZe, type EntradaDoZe } from './entrada-do-ze';
import { BOAS_VINDAS } from './passos';
import { iniciarLuzDaMao, iniciarPiscadas } from './vida-do-ze';

interface Props {
  /**
   * O nome do diálogo (a Chegada o aponta em `aria-labelledby`): um texto só para o leitor de tela, com o nome do
   * app. O título que se vê é o provérbio, e é ele que recebe o foco.
   */
  idTitulo: string;
  aoVamos: () => void;
  aoAgoraNao: () => void;
  /**
   * Como o Zé entra (ver `EntradaDoZe`). Sem isto, `pronta`: o Zé inteiro e parado, como no passeio refeito.
   * Na `espera` a tela já existe, escondida pela Chegada, e se oferece à luz da Abertura; em `desenhar` o Zé se
   * desenha e o texto sobe na metade do contorno.
   */
  entrada?: EntradaDoZe;
  /** Em `espera`: por onde a tela se oferece à luz que vem da Abertura, e o que avisar quando ela pousa. */
  encontro?: Encontro;
  aoReceber?: () => void;
}

/**
 * As Boas-vindas (D-D10): o Zé inteiro, a fala dele (o provérbio e a frase, sempre inteiros: D-D11) e só
 * dois botões, "Vamos" e "Agora não". O Zé dá vida à espera, e só aqui, onde a pessoa escolhe: pisca os
 * dois olhos em rajadas curtas e, se ela demora, a luz amarela da mão dele pisca (3 rodadas, no máximo;
 * `vida-do-ze.ts`). Nos passos e no Começar ele fica quieto. Tudo é decorativo e nenhum botão espera por
 * ele.
 *
 * Na primeira vez (M3b) a tela é montada antes, escondida, para a luz da Abertura ter para onde voar: ela
 * mede o pé esquerdo do Zé aqui. Quando a luz pousa, o Zé se desenha (`entrada-do-ze.ts`) e a vida dele
 * (as piscadas, a luz da mão) só começa depois.
 */
export function BoasVindas({
  idTitulo,
  aoVamos,
  aoAgoraNao,
  entrada = 'pronta',
  encontro,
  aoReceber,
}: Props) {
  const zona = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const ze = useRef<ControleDoZe>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const idProverbio = `${idTitulo}-proverbio`;
  const idFrase = `${idTitulo}-frase`;
  // A entrada acabou. Quando o Zé nasce pronto, a vida dele começa já.
  const [terminou, setTerminou] = useState(false);
  const vivo = entrada === 'pronta' || terminou;

  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!vivo) return;
    const pararPiscadas = iniciarPiscadas(() => ze.current);
    const pararLuz = zona.current
      ? iniciarLuzDaMao(() => ze.current, zona.current)
      : () => undefined;
    return () => {
      pararPiscadas();
      pararLuz();
    };
  }, [vivo]);

  // Escondida por baixo da Abertura, a tela oferece o pé do Zé à luz e espera ela pousar. O pé só vale se
  // está à vista: numa tela baixa o corpo rola e o Zé pode ficar para fora, e então a luz vai ao cabeçalho.
  useEffect(() => {
    if (entrada !== 'espera' || !encontro || !aoReceber) return;
    const medirPe = (): PeDoZe | null => {
      const pe = ze.current?.peNaTela();
      const area = corpo.current?.getBoundingClientRect();
      if (!pe || !area) return null;
      const aVista =
        pe.x >= area.left && pe.x <= area.right && pe.y >= area.top && pe.y <= area.bottom;
      return aVista ? pe : null;
    };
    return encontro.oferecer({ medirPe, receber: aoReceber });
  }, [entrada, encontro, aoReceber]);

  // A luz pousou: o Zé se desenha, antes da primeira pintura, para a luz da caneta já estar no pé.
  useLayoutEffect(() => {
    const controle = ze.current;
    if (entrada !== 'desenhar' || !controle) return;
    const interromper = new AbortController();
    void desenharOZe(controle, {
      sinal: interromper.signal,
      aoMeio: () => {
        zona.current?.toggleAttribute('data-revelado', true);
      },
    }).then(() => {
      if (!interromper.signal.aborted) setTerminou(true);
    });
    return () => {
      interromper.abort();
    };
  }, [entrada]);

  return (
    <div className="chegada-tela" data-tela="boas" data-entrada={entrada} ref={zona}>
      <div className="chegada-topo">
        <span />
        <button type="button" className="botao botao-texto" onClick={aoAgoraNao}>
          {BOAS_VINDAS.agoraNao}
        </button>
      </div>
      <div className="chegada-corpo" ref={corpo}>
        <div className="chegada-ze">
          <Ze ref={ze} humor="neutro" tamanho="grande" />
        </div>
        <div className="chegada-texto revela">
          <span id={idTitulo} className="visualmente-oculto">
            {BOAS_VINDAS.nome}
          </span>
          <h2 id={idProverbio} ref={titulo} tabIndex={-1} className="chegada-titulo">
            {BOAS_VINDAS.titulo}
          </h2>
          <p id={idFrase}>{BOAS_VINDAS.frase}</p>
        </div>
      </div>
      <div className="chegada-rodape revela">
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
