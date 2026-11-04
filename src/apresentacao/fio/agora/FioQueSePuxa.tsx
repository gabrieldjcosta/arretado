import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent } from 'react';
import { movimentoAgora } from '../../movimento';
import './fio-puxar.css';

const MOLA = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export type FormaDoFio = 'agora' | 'pouso';

interface Geometria {
  estica: number;
  puxaA: number;
  raio: number;
  inicio: number;
  mergulho: number;
  sobe: number;
  descida: number;
  volta: number;
  onda: number;
  balanco: number;
  base: (altura: number) => number;
  /** Quanto a dica fica abaixo do nó (px); sem isso, a folha de estilo a põe. */
  dicaAbaixoDoNo?: number;
}

/**
 * As medidas de cada forma do fio (protótipo v16 da Marca). O Agora é o fio grande, no meio da tela; o pouso, o
 * compacto, no pé dela. `estica` é quanto o fio estica (px); `puxaA`, a partir de quanto o solto vira puxão;
 * `raio`, metade do diâmetro do nó; `inicio`, onde o fio nasce (acima da área); `mergulho` e `sobe`, a descida
 * e a sobra da mola do puxão; `onda` e `balanco`, o quanto o fio se curva ao esticar.
 */
const GEOMETRIA: Record<FormaDoFio, Geometria> = {
  agora: {
    estica: 140,
    puxaA: 70,
    raio: 42,
    inicio: -40,
    mergulho: 90,
    sobe: -20,
    descida: 180,
    volta: 420,
    onda: 30,
    balanco: 6,
    base: (altura) => Math.min(altura * 0.55, 230),
    dicaAbaixoDoNo: 58,
  },
  pouso: {
    estica: 70,
    puxaA: 28,
    raio: 25,
    inicio: -6,
    mergulho: 46,
    sobe: -10,
    descida: 150,
    volta: 370,
    onda: 20,
    balanco: 5,
    base: () => 83,
  },
};

interface Props {
  /** O puxão valeu (arrasto largado além do limite, toque, Enter ou Espaço). */
  aoPuxar: () => void;
  /** "Puxe o fio", "Puxe para continuar" ou, no pouso, "Puxe para seguir". */
  titulo: string;
  /** A linha miúda sob o título; no pouso não há. */
  apoio?: string;
  /** Qual forma: a grande do Agora (padrão) ou a compacta do pouso. */
  forma?: FormaDoFio;
  /** O nome do nó para quem não o vê; sem ele, "<título>: ir ao próximo passo". */
  rotuloDoNo?: string;
}

function terminou(animacao: Animation): Promise<void> {
  return animacao.finished.then(
    () => undefined,
    () => undefined,
  );
}

/**
 * O fio que se puxa (D-D25): um fio âmbar pendurado do alto e o nó na ponta. Arrastar para baixo e soltar
 * além do limite da forma (70 px no Agora, 28 no pouso), tocar ou usar o teclado puxa; o fio dá um tranco e a
 * mola devolve o nó ao lugar. Em Movimento reduzido e no perfil Calmo o puxão é instantâneo. Desenha direto no
 * DOM (sem estado do React) para o arrasto acompanhar o dedo.
 */
export function FioQueSePuxa({ aoPuxar, titulo, apoio, forma = 'agora', rotuloDoNo }: Props) {
  const g = GEOMETRIA[forma];
  const area = useRef<HTMLDivElement>(null);
  const linha = useRef<SVGPathElement>(null);
  const brilho = useRef<SVGPathElement>(null);
  const no = useRef<HTMLButtonElement>(null);
  const dica = useRef<HTMLDivElement>(null);
  const base = useRef(0);
  const puxao = useRef(0);
  const toque = useRef<{ y0: number; moveu: boolean } | null>(null);
  const ignorarClique = useRef(false);
  const ocupado = useRef(false);
  const vivo = useRef(true);
  /** Cada volta da mola ganha um número; apertar o nó de novo invalida a que ainda corre. */
  const geracao = useRef(0);

  const desenhar = useCallback(
    (dy: number) => {
      puxao.current = dy;
      const largura = area.current?.clientWidth ?? 0;
      const meio = largura / 2;
      const fim = base.current + dy;
      const balanco = Math.sin(dy / g.onda) * g.balanco;
      // O fio entra 2 px no nó, para a ponta não aparecer por baixo dele.
      const d = `M${String(meio)} ${String(g.inicio)} Q${String(meio + balanco)} ${String(fim / 2)} ${String(meio)} ${String(fim - (g.raio - 2))}`;
      linha.current?.setAttribute('d', d);
      brilho.current?.setAttribute('d', d);
      if (no.current) no.current.style.transform = `translateY(${String(dy)}px)`;
      // A dica sai da frente do nó que desce.
      if (dica.current) dica.current.style.opacity = String(Math.max(0, 1 - dy / 60));
    },
    [g],
  );

  const medir = useCallback(() => {
    const altura = area.current?.clientHeight ?? 0;
    base.current = g.base(altura);
    if (no.current) no.current.style.top = `${String(base.current - g.raio)}px`;
    if (dica.current && g.dicaAbaixoDoNo !== undefined) {
      dica.current.style.top = `${String(base.current + g.dicaAbaixoDoNo)}px`;
    }
    desenhar(puxao.current);
  }, [desenhar, g]);

  useLayoutEffect(() => {
    medir();
    const alvo = area.current;
    if (!alvo || typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => {
      observador.disconnect();
    };
  }, [medir]);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const puxar = useCallback(async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    const el = no.current;
    if (movimentoAgora() === 'normal' && el && typeof el.animate === 'function') {
      await terminou(
        el.animate(
          [
            { transform: `translateY(${String(puxao.current)}px)` },
            { transform: `translateY(${String(g.mergulho)}px)` },
          ],
          { duration: g.descida, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' },
        ),
      );
      desenhar(g.mergulho);
      await terminou(
        el.animate(
          [
            { transform: `translateY(${String(g.mergulho)}px)` },
            { transform: `translateY(${String(g.sobe)}px)` },
            { transform: 'translateY(0px)' },
          ],
          { duration: g.volta, easing: MOLA },
        ),
      );
      el.getAnimations().forEach((animacao) => {
        animacao.cancel();
      });
    }
    desenhar(0);
    ocupado.current = false;
    if (vivo.current) aoPuxar();
  }, [aoPuxar, desenhar, g]);

  // Volta o nó ao lugar em quadros, com uma sobra que assenta (a mola do protótipo).
  const soltarSemPuxar = useCallback(() => {
    if (movimentoAgora() !== 'normal') {
      desenhar(0);
      return;
    }
    const de = puxao.current;
    const inicio = performance.now();
    geracao.current += 1;
    const minha = geracao.current;
    const quadro = (agora: number) => {
      if (minha !== geracao.current) return;
      const k = Math.min(1, (agora - inicio) / g.volta);
      desenhar(de * Math.cos(k * Math.PI * 1.5) * (1 - k));
      if (k < 1 && vivo.current) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }, [desenhar, g]);

  const aoApertar = (e: PointerEvent<HTMLButtonElement>) => {
    if (ocupado.current) return;
    geracao.current += 1;
    toque.current = { y0: e.clientY, moveu: false };
    ignorarClique.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura (ponteiro que já saiu): o arrasto segue pelo próprio nó */
    }
  };
  const aoMover = (e: PointerEvent<HTMLButtonElement>) => {
    const t = toque.current;
    if (!t) return;
    const dy = Math.max(0, Math.min(g.estica, e.clientY - t.y0));
    if (dy > 4) t.moveu = true;
    desenhar(dy);
  };
  const aoSoltar = () => {
    const t = toque.current;
    toque.current = null;
    // O toque simples vira `click`; só o arrasto decide aqui, e o `click` que vem depois não vale.
    if (!t?.moveu) return;
    ignorarClique.current = true;
    if (puxao.current > g.puxaA) void puxar();
    else soltarSemPuxar();
  };

  return (
    <div className="fio-puxar" data-forma={forma} ref={area}>
      <svg aria-hidden="true">
        <path className="fio-fio-brilho" ref={brilho} />
        <path className="fio-fio-linha" ref={linha} />
      </svg>
      <div className="fio-dica" ref={dica}>
        {titulo}
        {apoio !== undefined && <small>{apoio}</small>}
      </div>
      <button
        type="button"
        className="fio-puxador fio-ponto"
        ref={no}
        aria-label={rotuloDoNo ?? `${titulo}: ir ao próximo passo`}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onClick={() => {
          if (ignorarClique.current) {
            ignorarClique.current = false;
            return;
          }
          void puxar();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
