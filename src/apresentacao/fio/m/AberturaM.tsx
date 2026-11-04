import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { CamadaDoFio } from '../../componentes/escrita/vez-da-escrita';
import { useFio } from '../dados/useFio';
import { ROTA_DA_PROVA } from '../lugares';
import {
  rodarAbertura,
  type Alvo,
  type DestinoDaAbertura,
  type TelaSeguinte,
} from './abertura-voo';
import { espera } from './anima';
import { mundoAgora } from './mundo';

const LETRAS = ['a', 'r', 'r', 'e', 't', 'a', 'd', 'o'];

/** Quanto a abertura espera o Fio saber se há prova antes de seguir para o Agora. */
const ESPERA_DO_FIO_MS = 1500;
/** Quanto um pulo espera o Fio saber se há prova (os dados leem em poucos quadros). */
const ESPERA_DO_PULO_MS = 600;
/** Quanto espera a tela seguinte (a prova é um pedaço à parte do pacote) aparecer no quadro. */
const ESPERA_DA_TELA_MS = 1500;

function umQuadro(): Promise<void> {
  return new Promise((resolver) => {
    window.requestAnimationFrame(() => {
      resolver();
    });
  });
}

/** Espera `achar` devolver algo, quadro a quadro, até `limite` ms. */
async function esperarPor<T>(achar: () => T | null | undefined, limite: number): Promise<T | null> {
  const fim = performance.now() + limite;
  for (;;) {
    const achado = achar();
    if (achado) return achado;
    if (performance.now() > fim) return null;
    await umQuadro();
  }
}

/**
 * A abertura do mockup aprovado (a tela `abertura`): o nome se escreve a cada pouso do ponto de luz, o ponto vira o
 * ponto final do cacto e um fio o leva, como um pêndulo, até a tela seguinte (a prova, para quem ainda não
 * escolheu uma; o Agora, para quem já). Um toque, ou qualquer tecla, pula. O movimento é o de `abertura-voo.ts`.
 * Fica sobre as telas do quadro (que esperam por baixo, escondidas) e sai quando o ponto pousa.
 */
export function AberturaM({ camada }: { camada: CamadaDoFio }) {
  const navegar = useNavigate();
  const fio = useFio();
  // O que a abertura precisa saber do Fio quando chega a hora de decidir, sem recomeçar a cada mudança dele.
  const semProva = useRef<boolean | undefined>(undefined);
  const avancoDoFio = fio.avanco;
  useEffect(() => {
    semProva.current = avancoDoFio ? avancoDoFio.proximo.tipo === 'sem_materia' : undefined;
  }, [avancoDoFio]);
  const navegarRef = useRef(navegar);
  const aoSair = useRef(camada.aoSair);
  // Os valores de agora ficam à mão do voo, que não recomeça quando eles mudam.
  useEffect(() => {
    navegarRef.current = navegar;
    aoSair.current = camada.aoSair;
  });

  const tela = useRef<HTMLElement>(null);
  const rastro = useRef<SVGSVGElement>(null);
  const nome = useRef<HTMLHeadingElement>(null);
  const frase = useRef<HTMLParagraphElement>(null);
  const pular = useRef<HTMLSpanElement>(null);
  /** Para o toque que pula: aborta o voo e leva à tela certa. */
  const pulo = useRef<(() => void) | null>(null);

  // A prova é um pedaço à parte: pedida já, está à mão quando o ponto chegar.
  useEffect(() => {
    void import('./ProvaM').catch(() => undefined);
  }, []);

  useEffect(() => {
    const el = tela.current;
    const app = el?.parentElement;
    if (!el || !app || !rastro.current || !nome.current || !frase.current || !pular.current) return;
    const controle = new AbortController();
    const { signal } = controle;
    // O sinal só muda por fora (pulo, rota): conferir em função evita que o TypeScript o dê por parado depois de um await.
    const cancelada = () => signal.aborted;
    const irParaAProva = () => {
      void navegarRef.current(ROTA_DA_PROVA, { replace: true });
    };
    let pousou = false;
    let voo: ReturnType<typeof rodarAbertura> | undefined;

    const saber = async (): Promise<boolean> => {
      const fim = performance.now() + ESPERA_DO_FIO_MS;
      while (semProva.current === undefined && performance.now() < fim && !cancelada()) {
        await umQuadro();
      }
      return semProva.current === true;
    };

    /** Decide a tela seguinte, a põe por baixo e a mede: o `medir()` do mockup. */
    const preparar = async (): Promise<TelaSeguinte | null> => {
      const destino: DestinoDaAbertura = (await saber()) ? 'prova' : 'inicio';
      if (cancelada()) return null;
      if (destino === 'prova') irParaAProva();
      const seguinte = await esperarPor(
        () => app.querySelector<HTMLElement>(`:scope > [data-tela="${destino}"]`),
        ESPERA_DA_TELA_MS,
      );
      if (!seguinte || cancelada()) return null;
      const A = app.getBoundingClientRect();
      let alvo: Alvo | undefined;
      if (destino === 'inicio') {
        const area = await esperarPor(
          () => seguinte.querySelector<HTMLElement>('.m-puxar-area'),
          400,
        );
        const marca = seguinte.querySelector('.m-cabeca .m-cacto-marca');
        if (area) {
          const a = area.getBoundingClientRect();
          alvo = {
            x: a.left - A.left + a.width / 2,
            y: a.top - A.top + Math.min(a.height * 0.55, 230),
            s: 1,
            ...(marca ? { cacto: marca.getBoundingClientRect() } : {}),
          };
        }
      } else {
        const no = await esperarPor(() => seguinte.querySelector('.m-no-prova'), 400);
        if (no) {
          const k = no.getBoundingClientRect();
          alvo = {
            x: k.left - A.left + k.width / 2,
            y: k.top - A.top + k.height / 2,
            s: 14 / 84,
          };
        }
      }
      // Sem onde pousar (a tela não veio), o ponto some e a tela seguinte aparece.
      if (!alvo) return null;
      return { destino, alvo, tela: seguinte };
    };

    // A fonte do nome tem de estar pronta: a posição de cada letra é medida e o ponto pousa nela.
    const fontes =
      typeof document !== 'undefined' && 'fonts' in document ? document.fonts.ready : null;
    void Promise.race([fontes ?? Promise.resolve(), espera(800, signal)]).then(() => {
      if (cancelada()) return;
      voo = rodarAbertura({
        app,
        tela: el,
        rastro: rastro.current as SVGSVGElement,
        nome: nome.current as HTMLElement,
        frase: frase.current as HTMLElement,
        pular: pular.current as HTMLElement,
        calmo: camada.calmo,
        dia: mundoAgora() === 'dia',
        sinal: signal,
        preparar,
        aoPousar: () => {
          pousou = true;
          aoSair.current('fim');
        },
      });
      void voo.fim.then(() => {
        // Acabou sem pousar (a tela seguinte não veio): sai do mesmo jeito, sem contar pulo.
        if (!pousou && !cancelada()) aoSair.current('fim');
      });
    });

    pulo.current = () => {
      if (cancelada()) return;
      controle.abort();
      voo?.limpar();
      // Pulou: vai direto à tela seguinte, sem o voo. Quem ainda não escolheu a prova vai à escolha; se o Fio ainda
      // não leu os dados (um toque nos primeiros instantes), espera um pouco por eles para não piscar o Agora.
      void (async () => {
        const fim = performance.now() + ESPERA_DO_PULO_MS;
        while (semProva.current === undefined && performance.now() < fim) await umQuadro();
        if (semProva.current === true) irParaAProva();
        aoSair.current('pulou');
      })();
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab') return;
      pulo.current?.();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      pulo.current = null;
      controle.abort();
      // Depois do pouso o ponto e o fio ainda têm o que fazer (esperar a tela seguinte chegar); o voo os tira.
      if (!pousou) voo?.limpar();
    };
  }, [camada.calmo]);

  return (
    <section
      ref={tela}
      className="m-tela m-abertura"
      data-tela="abertura"
      onClick={() => pulo.current?.()}
    >
      <svg className="m-rastro" ref={rastro} aria-hidden="true" />
      <h1 className="m-nome-pulo" ref={nome} aria-label="arretado">
        {LETRAS.map((l, i) => (
          <span key={i} aria-hidden="true">
            {l}
          </span>
        ))}
        <svg className="m-cacto-abertura" viewBox="854 24 140 136" aria-hidden="true">
          <path
            className="m-cm-l"
            pathLength="1"
            d="M923 151V37M923 111H890A24 24 0 0 1 866 87V65M923 131H956A24 24 0 0 0 980 107V87"
          />
          <circle className="m-cm-p" cx="980" cy="87" r="13" />
        </svg>
      </h1>
      <p ref={frase}>
        Tecendo seu destino,
        <br />
        ponto a ponto.
      </p>
      <span className="m-pular" ref={pular}>
        Toque para pular
      </span>
    </section>
  );
}
