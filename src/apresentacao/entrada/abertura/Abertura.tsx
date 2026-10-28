import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { EscritaDoNome } from '../../componentes/escrita/EscritaDoNome';
import type { Encontro, PeDoZe } from '../../componentes/escrita/encontro';
import { PONTO } from '../../componentes/escrita/geometria';
import { FLOR } from '../../componentes/ze/geometria';
import { documentoInativo, esperar } from '../../movimento';
import {
  andar,
  curvaDaViagem,
  luzNaViagem,
  pontoDeControleAoZe,
  type Ponto,
  type Viagem,
} from './voo';
import './abertura.css';

/**
 * Os tempos de cada abertura (ms), do contrato do Zé (§9). `nome`: até o nome estar escrito e a luz
 * parada no braço do cacto; `pausa`: o respiro antes de a luz sair; `voo`: a viagem até o cabeçalho;
 * `calmo`: o esmaecer de 0,24 s mais o tempo com o nome à vista.
 */
const TEMPOS = {
  completa: { nome: 2640, pausa: 300, voo: 500, calmo: 240 + 900 },
  curta: { nome: 1200, pausa: 150, voo: 450, calmo: 240 + 700 },
} as const;

/** O nome e o fundo esmaecem enquanto a luz voa (e no perfil Calmo, depois de o nome ficar à vista). */
const SAIDA_MS = 360;

/** A largura da caixa do lockup (`CAIXA_DO_LOCKUP`): a escala da luz é a largura do desenho sobre ela. */
const LARGURA_DA_CAIXA = 1015;

/** Quanto o toque ou a tecla que pulou ainda pode gerar de clique (ou de soltar a tecla) a engolir. */
const JANELA_DO_GESTO_MS = 700;

/**
 * Na primeira vez a luz espera a Chegada se oferecer, depois da pausa. Ela costuma estar pronta (abre
 * enquanto o nome se escreve); passado o prazo, a luz vai ao cabeçalho, como se ela não viesse.
 */
const PRAZO_DA_CHEGADA_MS = 600;

/** O halo da luz, em múltiplos do raio do ponto: o da marca, e o da flor do Zé (o da caneta que ela vira). */
const HALO_DA_MARCA = 1.35;
const HALO_DO_ZE = FLOR.disco / FLOR.r;
/** O desfoque da flor do Zé em unidades do desenho (`ids.halo` do `Ze.tsx`): vira pixels pela escala da luz. */
const DESFOQUE_DO_ZE = 4.5;

type Escrita = 'completa' | 'curta';

interface Props {
  escrita: Escrita;
  /** Perfil Calmo: o nome só esmaece, sem caneta, sem voo da luz. */
  calmo: boolean;
  /** A camada acabou (ou foi pulada): quem a monta a tira da tela. Chamada mais de uma vez, não faz mal. */
  aoSair: () => void;
  /**
   * Por onde a Chegada se oferece à luz: só na primeira vez, com a Chegada por vir. Com ele, a luz voa até o
   * pé esquerdo do Zé das Boas-vindas, e a Chegada se revela quando ela pousa; sem ele (ou sem oferta a
   * tempo), a luz pousa no cabeçalho.
   */
  encontro?: Encontro;
}

const centro = (el: Element): Ponto => {
  const caixa = el.getBoundingClientRect();
  return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 };
};

/**
 * Onde a luz sai (o disco atrás do ponto, no braço do cacto do nome) e onde pousa (o ponto do lockup do
 * cabeçalho), com o tamanho que a luz tem em cada um. Sem cabeçalho à vista (a Sessão o esconde) não há
 * viagem: o nome só esmaece.
 */
function medirAViagem(camada: HTMLElement): Viagem | null {
  const saida = medirASaida(camada);
  const alvo = document.querySelector('.marca .lockup-ponto');
  const marca = alvo?.closest('svg');
  if (!saida || !alvo || !marca) return null;
  const larguraDaMarca = marca.getBoundingClientRect().width;
  if (!larguraDaMarca) return null;
  return {
    de: saida.de,
    para: centro(alvo),
    raioDe: saida.raioDe,
    raioPara: (PONTO.raio * larguraDaMarca) / LARGURA_DA_CAIXA,
  };
}

/** Onde a luz sai (o disco atrás do ponto, no braço do cacto do nome) e o raio dela aí. */
function medirASaida(camada: HTMLElement): Pick<Viagem, 'de' | 'raioDe'> | null {
  const disco = camada.querySelector('.eb-disco');
  const nome = camada.querySelector('svg.eb');
  if (!disco || !nome) return null;
  const larguraDoNome = nome.getBoundingClientRect().width;
  if (!larguraDoNome) return null;
  return { de: centro(disco), raioDe: (PONTO.raio * larguraDoNome) / LARGURA_DA_CAIXA };
}

/**
 * A viagem até o pé esquerdo do Zé das Boas-vindas, que a Chegada mediu (`pe`): num arco que sobe
 * acima dos dois pontos, e a luz chega do tamanho da luz da caneta do Zé.
 */
function medirAViagemAoZe(camada: HTMLElement, pe: PeDoZe): Viagem | null {
  const saida = medirASaida(camada);
  if (!saida) return null;
  const para = { x: pe.x, y: pe.y };
  return {
    de: saida.de,
    para,
    raioDe: saida.raioDe,
    raioPara: pe.raio,
    controle: pontoDeControleAoZe(saida.de, para),
  };
}

/**
 * Põe a luz (halo, disco de marca-texto e ponto) em `luz`, com o raio dado ao ponto. Na viagem ao Zé
 * (`aoZe`) ela já é o ponto dele: sem o disco, com o halo e o desfoque da flor dele na escala do ponto.
 */
function pousarALuz(grupo: SVGGElement, luz: Ponto & { raio: number }, aoZe = false) {
  const [halo, disco, ponto] = grupo.children;
  grupo.setAttribute('transform', `translate(${luz.x.toFixed(2)} ${luz.y.toFixed(2)})`);
  halo?.setAttribute('r', (luz.raio * (aoZe ? HALO_DO_ZE : HALO_DA_MARCA)).toFixed(2));
  disco?.setAttribute('r', aoZe ? '0' : (luz.raio * (PONTO.disco / PONTO.raio)).toFixed(2));
  ponto?.setAttribute('r', luz.raio.toFixed(2));
  if (aoZe) {
    grupo.style.setProperty(
      '--abertura-desfoque',
      `${((luz.raio * DESFOQUE_DO_ZE) / FLOR.r).toFixed(2)}px`,
    );
  }
  grupo.setAttribute('visibility', 'visible');
}

/**
 * O toque ou a tecla que pulou a Abertura é só isso: não aciona o que estiver embaixo. O próprio
 * evento já foi barrado na captura; aqui se engole o que ele ainda gera (o clique depois do toque, o
 * soltar da tecla), uma vez, dentro de uma janela curta.
 */
function engolirOQueSegue(origem: Event): void {
  const seguinte = origem.type === 'keydown' ? 'keyup' : 'click';
  const tecla = origem instanceof KeyboardEvent ? origem.key : null;
  const desligar = () => {
    document.removeEventListener(seguinte, engolir, true);
    window.clearTimeout(relogio);
  };
  function engolir(e: Event) {
    if (tecla !== null && e instanceof KeyboardEvent && e.key !== tecla) return;
    e.stopPropagation();
    e.preventDefault();
    desligar();
  }
  const relogio = window.setTimeout(desligar, JANELA_DO_GESTO_MS);
  document.addEventListener(seguinte, engolir, true);
}

/**
 * A Abertura (contrato do Zé, §9): o nome em tela cheia, escrito pela caneta, e a luz que o leva ao
 * cabeçalho. Na primeira vez no aparelho escreve o nome inteiro (2,64 s) e leva o botão "Pular"; na
 * primeira abertura de cada Dia seguinte, o modo curto (1,2 s), sem botão. Perfil Calmo: só esmaece.
 *
 * É uma camada decorativa que nunca atrasa nada: o nome e a luz são `aria-hidden`, o foco não vai
 * para ela, e um toque ou a primeira tecla em qualquer lugar a pula (esse primeiro gesto é só isso, não
 * aciona o que está embaixo). Um `popover="manual"` e não uma `div` fixa: uma `div` fica abaixo de um
 * `<dialog>` modal, que vai para a camada de topo do navegador; o popover aberto agora fica por cima de
 * qualquer um aberto antes (e o que abre por cima do app espera por ela, ver `useAberturaEmCurso`).
 * Quem usa leitor de tela lê a tela de baixo sem esperar.
 *
 * O nome em si é o `EscritaDoNome` de sempre; a luz que sai do braço do cacto e pousa no ponto do
 * cabeçalho é desenhada aqui, quadro a quadro, medindo os dois pontos na tela. Na primeira vez, com a
 * Chegada por vir (`encontro`), ela pousa no pé esquerdo do Zé das Boas-vindas, que já está pronto por baixo,
 * escondido: a Chegada se revela no mesmo quadro em que a luz some, e a caneta do Zé continua dali.
 */
export function Abertura({ escrita, calmo, aoSair, encontro }: Props) {
  const camada = useRef<HTMLDivElement>(null);
  const luz = useRef<SVGGElement>(null);
  const primeira = escrita === 'completa';

  // No topo, antes de pintar. Sem `showPopover` (navegador velho), a camada fixa do CSS cobre a tela.
  useLayoutEffect(() => {
    const el = camada.current;
    if (!el) return;
    try {
      if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) el.showPopover();
    } catch {
      /* sem popover, ou já aberto */
    }
  }, []);

  useEffect(() => {
    const raiz = camada.current;
    const grupo = luz.current;
    if (!raiz || !grupo) return;
    const controle = new AbortController();
    const { signal: sinal } = controle;
    const pular = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      engolirOQueSegue(e);
      controle.abort();
      aoSair();
    };
    const opcoes = { capture: true, once: true } as const;
    document.addEventListener('pointerdown', pular, opcoes);
    document.addEventListener('keydown', pular, opcoes);
    // Pousada a luz no Zé, a Abertura só esmaece: o toque ou a tecla seguinte já é da Chegada.
    const desligarOPulo = () => {
      document.removeEventListener('pointerdown', pular, opcoes);
      document.removeEventListener('keydown', pular, opcoes);
    };

    const tempos = TEMPOS[escrita];
    // Uma função e não `sinal.aborted` direto: o TypeScript fixaria o valor da primeira checagem para as seguintes,
    // e é justamente depois de cada espera que o sinal pode ter mudado.
    const abortado = () => sinal.aborted;
    const roteiro = async () => {
      if (calmo) {
        // Calmo: o nome esmaece (0,24 s do próprio desenho), fica à vista e a camada esmaece.
        await esperar(tempos.calmo, sinal);
        if (abortado()) return;
        raiz.dataset.fase = 'saindo';
        await esperar(SAIDA_MS, sinal);
        return;
      }
      await esperar(tempos.nome + tempos.pausa, sinal);
      if (abortado()) return;
      // Com a Chegada por vir, a luz vai ao Zé dela; sem oferta no prazo (ou sem o Zé à vista), ao cabeçalho.
      const oferta = encontro ? await encontro.esperar(PRAZO_DA_CHEGADA_MS, sinal) : null;
      if (abortado()) return;
      const pe = oferta?.medirPe() ?? null;
      const aoZe = pe ? medirAViagemAoZe(raiz, pe) : null;
      const viagem = aoZe ?? medirAViagem(raiz);
      if (!viagem) {
        raiz.dataset.fase = 'saindo';
        await esperar(SAIDA_MS, sinal);
        return;
      }
      if (aoZe) raiz.dataset.voo = 'ze';
      // A luz do nome passa a ser a que voa: no mesmo quadro, uma some e a outra sai do mesmo lugar.
      pousarALuz(grupo, { ...viagem.de, raio: viagem.raioDe }, !!aoZe);
      raiz.dataset.fase = 'voando';
      await andar(
        tempos.voo,
        curvaDaViagem,
        (progresso) => {
          pousarALuz(grupo, luzNaViagem(viagem, progresso), !!aoZe);
        },
        sinal,
      );
      if (abortado()) return;
      if (aoZe && oferta) {
        // A luz pousou no pé do Zé. A Chegada se revela e a caneta dele assume, antes de qualquer
        // quadro (`flushSync`): a luz de cá só some depois, e nunca há um quadro sem uma das duas.
        desligarOPulo();
        flushSync(() => {
          oferta.receber();
        });
        grupo.setAttribute('visibility', 'hidden');
        raiz.dataset.fase = 'saindo';
        await esperar(SAIDA_MS, sinal);
        return;
      }
      grupo.setAttribute('visibility', 'hidden');
      await esperar(Math.max(0, SAIDA_MS - tempos.voo), sinal);
    };
    roteiro().then(
      () => {
        if (!abortado()) aoSair();
      },
      (erro: unknown) => {
        // Uma página que recarrega no meio do voo não tem mais o que medir; o resto nunca derruba o uso.
        if (!documentoInativo(erro)) console.error(erro);
        aoSair();
      },
    );

    return () => {
      controle.abort();
      desligarOPulo();
    };
  }, [escrita, calmo, aoSair, encontro]);

  return (
    <div
      ref={camada}
      popover="manual"
      className="abertura"
      data-escrita={escrita}
      data-calmo={calmo ? '' : undefined}
      data-fase="escrevendo"
    >
      <div className="abertura-palco" aria-hidden="true">
        <div className="abertura-nome">
          <EscritaDoNome curta={escrita === 'curta'} calmo={calmo} />
        </div>
      </div>
      <svg className="abertura-luz" aria-hidden="true" focusable="false">
        <g ref={luz} visibility="hidden">
          <circle className="abertura-halo" r="0" />
          <circle className="abertura-disco" r="0" />
          <circle className="abertura-ponto" r="0" />
        </g>
      </svg>
      {primeira && (
        <button type="button" className="botao botao-texto abertura-pular" onClick={aoSair}>
          Pular
        </button>
      )}
    </div>
  );
}
