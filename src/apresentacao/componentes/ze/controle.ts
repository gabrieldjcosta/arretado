// O controle do Zé (D-D10): o que o React não faz. O componente desenha o <svg> uma vez; quem muda os
// olhos, o traço e a flor depois é este controle, quadro a quadro, nos atributos e no CSSOM, como o
// traço de seleção (`traco/tracar.ts`). O movimento é lido na hora de usar (`movimentoAgora()`): só o
// normal anda; o Calmo e o reduzido mostram o resultado na hora (e a luz da flor esmaece, no Calmo).
import { curva, documentoInativo, movimentoAgora } from '../../movimento';
import {
  arredondar,
  caminhoDoOlho,
  EIXOS_DOS_OLHOS,
  espessuraDoOlho,
  FLOR,
  FOLGA_DO_HALO,
  opacidadeDoHalo,
} from './geometria';
import { HUMORES, type Humor } from './humores';

/** As partes que a Abertura e o Passeio mostram uma a uma. */
export type ParteDoZe = 'corpo' | 'miolo' | 'olho0' | 'olho1' | 'bochechas' | 'flor';
const PARTES: readonly ParteDoZe[] = ['corpo', 'miolo', 'olho0', 'olho1', 'bochechas', 'flor'];

/** O rosto neste instante. `p` é quanto os olhos estão fechados no piscar (0 a 1). */
interface Rosto {
  ey: number;
  sx: number;
  sy: number;
  a: [number, number];
  b: number;
  p: number;
}

interface Olho {
  g: SVGGElement;
  pupila: SVGPathElement;
  halo: SVGPathElement;
  x: number;
  escala: number;
}

interface Ligacao {
  svg: SVGSVGElement;
  corpo: SVGPathElement;
  /** As quatro camadas de traço (brilho, faixa de dia, faixa de noite e linha): andam juntas. */
  camadas: SVGPathElement[];
  miolo: SVGPathElement;
  bochechas: SVGGElement;
  forca: SVGGElement;
  flor: SVGGElement;
  luz: SVGGElement;
  olhosG: SVGGElement;
  olhos: readonly [Olho, Olho];
}

export interface ControleDoZe {
  /** Liga o controle ao <svg> do `Ze` (e aplica o rosto); `null` desliga e cancela o que andava. */
  ligar: (svg: SVGSVGElement | null) => void;
  /** Cancela o que anda (os olhos e a luz da flor) e deixa tudo como está. */
  parar: () => void;
  readonly svg: SVGSVGElement | null;
  /** O traço da linha: quem anda a luz pelo contorno mede aqui (`getPointAtLength`). */
  readonly corpo: SVGPathElement | null;
  /** Muda de humor: 200 ms de passagem no movimento normal; na hora nos outros. */
  humor: (nome: Humor) => void;
  /** Os dois olhos deslizam `dx` unidades do desenho (uma vez por passo); parados no reduzido. */
  olhar: (dx: number, dy?: number) => void;
  /** Os dois olhos piscam (160 ms). Só no normal, e o olho contente já está fechado. */
  piscar: () => void;
  /** Um olho (o direito, por padrão) fecha em arco, segura e abre, em 560 ms. Só no normal e com a cápsula aberta. */
  piscadela: (lado?: 0 | 1) => Promise<void>;
  /** A luz da flor pisca `vezes` vezes (460 ms cada); no Calmo é um esmaecer só, de 0,9 s; no reduzido não pisca. */
  piscarFlor: (vezes?: number) => Promise<void>;
  pararFlor: () => void;
  comprimento: () => number;
  esconder: (parte: ParteDoZe) => void;
  mostrar: (parte: ParteDoZe) => void;
  ocultarTudo: () => void;
  tudoVisivel: () => void;
  /** O desenho do traço, de 0 a 1 do comprimento, nas quatro camadas ao mesmo tempo. */
  prepararTraco: () => void;
  tracar: (progresso: number) => void;
  tracoPronto: () => void;
  /** O néon: aceso enquanto a luz traça; ao apagar, o brilho assenta (0,6 s, a transição está no CSS). */
  acender: (sim: boolean) => void;
  miolo: (opacidade: number) => void;
  bochechas: (opacidade: number) => void;
  /** A flor brota da ponta do braço: escala de 0 a 1, a partir do pé da haste. */
  florEscala: (escala: number) => void;
  olhoEscala: (olho: 0 | 1, escala: number) => void;
}

/** Anda `duracao` ms a cada quadro; resolve ao fim ou quando `vale()` deixa de valer (quem pediu foi substituído). */
function andar(
  duracao: number,
  quadro: (progresso: number) => void,
  vale: () => boolean,
): Promise<void> {
  return new Promise((resolver) => {
    const inicio = performance.now();
    const passo = (agora: number) => {
      if (!vale()) {
        resolver();
        return;
      }
      const progresso = Math.min(1, Math.max(0, (agora - inicio) / duracao));
      quadro(progresso);
      if (progresso < 1) requestAnimationFrame(passo);
      else resolver();
    };
    requestAnimationFrame(passo);
  });
}

/** O Zé desenha tudo o que o controle mexe; faltar uma parte é erro de quem montou o <svg>. */
function obrigatorio<T>(elemento: T | null, seletor: string): T {
  if (!elemento) throw new Error(`O Zé não tem ${seletor}.`);
  return elemento;
}

function ligarAoSvg(svg: SVGSVGElement): Ligacao {
  const olho = (g: SVGGElement, i: 0 | 1): Olho => ({
    g,
    pupila: obrigatorio(g.querySelector<SVGPathElement>('.z-pupila'), '.z-pupila'),
    halo: obrigatorio(g.querySelector<SVGPathElement>('.z-oh'), '.z-oh'),
    x: EIXOS_DOS_OLHOS[i],
    escala: 1,
  });
  const [esquerdo, direito] = svg.querySelectorAll<SVGGElement>('.z-olho');
  if (!esquerdo || !direito) throw new Error('O Zé tem dois olhos.');
  return {
    svg,
    corpo: obrigatorio(svg.querySelector<SVGPathElement>('.z-linha'), '.z-linha'),
    camadas: [...svg.querySelectorAll<SVGPathElement>('.z-tr')],
    miolo: obrigatorio(svg.querySelector<SVGPathElement>('.z-miolo'), '.z-miolo'),
    bochechas: obrigatorio(svg.querySelector<SVGGElement>('.z-bochechas'), '.z-bochechas'),
    forca: obrigatorio(svg.querySelector<SVGGElement>('.z-bc'), '.z-bc'),
    flor: obrigatorio(svg.querySelector<SVGGElement>('.z-flor'), '.z-flor'),
    luz: obrigatorio(svg.querySelector<SVGGElement>('.z-luz'), '.z-luz'),
    olhosG: obrigatorio(svg.querySelector<SVGGElement>('.z-olhos'), '.z-olhos'),
    olhos: [olho(esquerdo, 0), olho(direito, 1)],
  };
}

export function criarControle(humorInicial: Humor = 'neutro'): ControleDoZe {
  const repouso = (nome: Humor): Rosto => {
    const { ey, sx, sy, a, b } = HUMORES[nome];
    return { ey, sx, sy, a: [a[0], a[1]], b, p: 0 };
  };
  const rosto = repouso(humorInicial);
  let humorAtual = humorInicial;
  let ligacao: Ligacao | null = null;
  // Quem mexe nos olhos (humor, piscar, piscadela) vale só enquanto for o último a pedir; a luz da flor tem o seu.
  let corrida = 0;
  let corridaFlor = 0;

  const aplicarOlho = (o: Olho, t: number) => {
    const escalaY = Math.max(rosto.sy * o.escala * (1 - 0.88 * rosto.p), 0.02);
    o.g.setAttribute(
      'transform',
      `translate(${o.x} ${arredondar(rosto.ey)}) scale(${arredondar(rosto.sx * o.escala)} ${arredondar(escalaY)})`,
    );
    o.pupila.setAttribute('d', caminhoDoOlho(t));
    o.pupila.setAttribute('stroke-width', String(espessuraDoOlho(t)));
    o.halo.setAttribute('d', caminhoDoOlho(t));
    o.halo.setAttribute('stroke-width', String(espessuraDoOlho(t) + FOLGA_DO_HALO));
    o.halo.setAttribute('opacity', String(opacidadeDoHalo(t)));
  };
  const aplicar = () => {
    if (!ligacao) return;
    aplicarOlho(ligacao.olhos[0], rosto.a[0]);
    aplicarOlho(ligacao.olhos[1], rosto.a[1]);
    ligacao.forca.setAttribute('opacity', String(arredondar(rosto.b)));
  };
  /** Antes de piscar, o rosto volta ao do humor: um piscar cancelado no meio não deixa o olho fechado. */
  const assentar = () => {
    Object.assign(rosto, repouso(humorAtual));
    aplicar();
  };

  const definirParte = (parte: ParteDoZe, escondida: boolean) => {
    if (!ligacao) return;
    const opacidade = escondida ? '0' : '';
    if (parte === 'corpo') {
      for (const camada of ligacao.camadas) camada.style.opacity = opacidade;
    } else if (parte === 'miolo') ligacao.miolo.style.opacity = opacidade;
    else if (parte === 'olho0') ligacao.olhos[0].g.style.opacity = opacidade;
    else if (parte === 'olho1') ligacao.olhos[1].g.style.opacity = opacidade;
    else if (parte === 'bochechas') ligacao.bochechas.style.opacity = opacidade;
    else ligacao.flor.style.opacity = opacidade;
  };

  const pararFlor = () => {
    corridaFlor += 1;
    if (ligacao) ligacao.luz.style.opacity = '';
  };
  const parar = () => {
    corrida += 1;
    pararFlor();
  };
  const comprimento = () => {
    if (!ligacao) return 0;
    try {
      return ligacao.corpo.getTotalLength();
    } catch (erro) {
      // A página recarregou no meio do desenho: o navegador não mede um documento inativo.
      if (documentoInativo(erro)) return 0;
      throw erro;
    }
  };
  const tracoPronto = () => {
    for (const camada of ligacao?.camadas ?? []) {
      camada.style.strokeDasharray = '';
      camada.style.strokeDashoffset = '';
    }
  };

  const tudoVisivel = () => {
    pararFlor();
    tracoPronto();
    for (const parte of PARTES) definirParte(parte, false);
    if (ligacao) {
      for (const o of ligacao.olhos) o.escala = 1;
      ligacao.flor.removeAttribute('transform');
      ligacao.svg.removeAttribute('data-acesa');
    }
    aplicar();
  };

  return {
    ligar(svg) {
      parar();
      ligacao = svg ? ligarAoSvg(svg) : null;
      aplicar();
    },
    parar,
    get svg() {
      return ligacao?.svg ?? null;
    },
    get corpo() {
      return ligacao?.corpo ?? null;
    },

    humor(nome) {
      if (nome === humorAtual) return;
      humorAtual = nome;
      const alvo = HUMORES[nome];
      const id = (corrida += 1);
      rosto.p = 0;
      if (movimentoAgora() !== 'normal') {
        Object.assign(rosto, repouso(nome));
        aplicar();
        return;
      }
      const de = { ...rosto, a: [...rosto.a] as [number, number] };
      void andar(
        200,
        (progresso) => {
          const e = curva(progresso);
          const entre = (x: number, y: number) => x + (y - x) * e;
          rosto.ey = entre(de.ey, alvo.ey);
          rosto.sx = entre(de.sx, alvo.sx);
          rosto.sy = entre(de.sy, alvo.sy);
          rosto.b = entre(de.b, alvo.b);
          rosto.a = [entre(de.a[0], alvo.a[0]), entre(de.a[1], alvo.a[1])];
          aplicar();
        },
        () => id === corrida,
      );
    },
    olhar(dx, dy = 0) {
      if (!ligacao) return;
      ligacao.olhosG.style.transform =
        movimentoAgora() === 'reduzido' ? 'none' : `translate(${dx}px,${dy}px)`;
    },
    piscar() {
      if (movimentoAgora() !== 'normal') return;
      assentar();
      if (rosto.a[0] > 0.5 && rosto.a[1] > 0.5) return; // o olho contente já está fechado
      const id = (corrida += 1);
      void andar(
        160,
        (progresso) => {
          rosto.p = progresso < 0.45 ? progresso / 0.45 : 1 - (progresso - 0.45) / 0.55;
          aplicar();
        },
        () => id === corrida,
      );
    },
    piscadela(lado = 1) {
      if (movimentoAgora() !== 'normal') return Promise.resolve();
      assentar();
      if (rosto.a[lado] > 0.5) return Promise.resolve();
      const id = (corrida += 1);
      return andar(
        560,
        (progresso) => {
          rosto.a[lado] =
            progresso < 0.25
              ? curva(progresso / 0.25)
              : progresso < 0.75
                ? 1
                : 1 - curva((progresso - 0.75) / 0.25);
          aplicar();
        },
        () => id === corrida,
      ).then(() => {
        if (id === corrida) assentar();
      });
    },
    piscarFlor(vezes = 3) {
      const movimento = movimentoAgora();
      if (movimento === 'reduzido' || !ligacao) return Promise.resolve();
      const { luz } = ligacao;
      const n = movimento === 'calmo' ? 1 : vezes;
      const id = (corridaFlor += 1);
      return andar(
        (movimento === 'calmo' ? 900 : 460) * n,
        (progresso) => {
          const ciclo = progresso >= 1 ? 0 : (progresso * n) % 1;
          luz.style.opacity = (1 - 0.88 * Math.sin(Math.PI * ciclo)).toFixed(3);
        },
        () => id === corridaFlor,
      ).then(() => {
        if (id === corridaFlor) luz.style.opacity = '';
      });
    },
    pararFlor,
    comprimento,
    esconder: (parte) => {
      definirParte(parte, true);
    },
    mostrar: (parte) => {
      definirParte(parte, false);
    },
    ocultarTudo() {
      for (const parte of PARTES) definirParte(parte, true);
    },
    tudoVisivel,
    prepararTraco() {
      const total = comprimento();
      for (const camada of ligacao?.camadas ?? []) {
        camada.style.strokeDasharray = `${total} ${total}`;
        camada.style.strokeDashoffset = String(total);
      }
    },
    tracar(progresso) {
      const total = comprimento();
      for (const camada of ligacao?.camadas ?? []) {
        camada.style.strokeDashoffset = String(total * (1 - progresso));
      }
    },
    tracoPronto,
    acender(sim) {
      ligacao?.svg.toggleAttribute('data-acesa', sim);
    },
    miolo(opacidade) {
      if (ligacao) ligacao.miolo.style.opacity = String(opacidade);
    },
    bochechas(opacidade) {
      if (ligacao) ligacao.bochechas.style.opacity = String(opacidade);
    },
    florEscala(escala) {
      if (!ligacao) return;
      if (escala >= 1) ligacao.flor.removeAttribute('transform');
      else {
        ligacao.flor.setAttribute(
          'transform',
          `translate(${FLOR.x} ${FLOR.y}) scale(${arredondar(escala)}) translate(${-FLOR.x} ${-FLOR.y})`,
        );
      }
    },
    olhoEscala(olho, escala) {
      if (!ligacao) return;
      ligacao.olhos[olho].escala = escala;
      aplicar();
    },
  };
}
