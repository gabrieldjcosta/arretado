import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent } from 'react';
import { movimentoAgora } from '../../movimento';

/** Quanto o fio estica (px) e a partir de quanto o solto vira puxão. */
const ESTICA_ATE = 140;
const PUXA_A_PARTIR_DE = 70;
/** O nó do puxão sai 42 px acima do fim do fio (metade do diâmetro de 84 px). */
const RAIO_DO_NO = 42;
const MOLA = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

interface Props {
  /** O puxão valeu (arrasto largado além do limite, toque, Enter ou Espaço). */
  aoPuxar: () => void;
  /** "Puxe o fio" ou, com um passo aberto, "Puxe para continuar". */
  titulo: string;
  apoio: string;
}

function terminou(animacao: Animation): Promise<void> {
  return animacao.finished.then(
    () => undefined,
    () => undefined,
  );
}

/**
 * O fio que se puxa (D-D25): um fio âmbar pendurado do alto e o nó na ponta. Arrastar para baixo e soltar
 * além de 70 px, tocar ou usar o teclado puxa; o fio dá um tranco e a mola devolve o nó ao lugar. Em
 * Movimento reduzido e no perfil Calmo o puxão é instantâneo. Desenha direto no DOM (sem estado do React)
 * para o arrasto acompanhar o dedo.
 */
export function FioQueSePuxa({ aoPuxar, titulo, apoio }: Props) {
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

  const desenhar = useCallback((dy: number) => {
    puxao.current = dy;
    const largura = area.current?.clientWidth ?? 0;
    const meio = largura / 2;
    const fim = base.current + dy;
    const balanco = Math.sin(dy / 30) * 6;
    const d = `M${String(meio)} -40 Q${String(meio + balanco)} ${String(fim / 2)} ${String(meio)} ${String(fim - 40)}`;
    linha.current?.setAttribute('d', d);
    brilho.current?.setAttribute('d', d);
    if (no.current) no.current.style.transform = `translateY(${String(dy)}px)`;
    // A dica sai da frente do nó que desce.
    if (dica.current) dica.current.style.opacity = String(Math.max(0, 1 - dy / 60));
  }, []);

  const medir = useCallback(() => {
    const altura = area.current?.clientHeight ?? 0;
    base.current = Math.min(altura * 0.55, 230);
    if (no.current) no.current.style.top = `${String(base.current - RAIO_DO_NO)}px`;
    if (dica.current) dica.current.style.top = `${String(base.current + 58)}px`;
    desenhar(puxao.current);
  }, [desenhar]);

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
            { transform: 'translateY(90px)' },
          ],
          { duration: 180, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' },
        ),
      );
      desenhar(90);
      await terminou(
        el.animate(
          [
            { transform: 'translateY(90px)' },
            { transform: 'translateY(-20px)' },
            { transform: 'translateY(0px)' },
          ],
          { duration: 420, easing: MOLA },
        ),
      );
      el.getAnimations().forEach((animacao) => {
        animacao.cancel();
      });
    }
    desenhar(0);
    ocupado.current = false;
    if (vivo.current) aoPuxar();
  }, [aoPuxar, desenhar]);

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
      const k = Math.min(1, (agora - inicio) / 420);
      desenhar(de * Math.cos(k * Math.PI * 1.5) * (1 - k));
      if (k < 1 && vivo.current) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }, [desenhar]);

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
    const dy = Math.max(0, Math.min(ESTICA_ATE, e.clientY - t.y0));
    if (dy > 4) t.moveu = true;
    desenhar(dy);
  };
  const aoSoltar = () => {
    const t = toque.current;
    toque.current = null;
    // O toque simples vira `click`; só o arrasto decide aqui, e o `click` que vem depois não vale.
    if (!t?.moveu) return;
    ignorarClique.current = true;
    if (puxao.current > PUXA_A_PARTIR_DE) void puxar();
    else soltarSemPuxar();
  };

  return (
    <div className="fio-puxar" ref={area}>
      <svg aria-hidden="true">
        <path className="fio-fio-brilho" ref={brilho} />
        <path className="fio-fio-linha" ref={linha} />
      </svg>
      <div className="fio-dica" ref={dica}>
        {titulo}
        <small>{apoio}</small>
      </div>
      <button
        type="button"
        className="fio-puxador fio-ponto"
        ref={no}
        aria-label={`${titulo}: ir ao próximo passo`}
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
