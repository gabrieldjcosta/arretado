import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { animar, aCadaQuadro, cancelarAnimacoes, modoAgora, MOLA, TROCAR, useSinal } from './anima';

/**
 * O fio que se puxa (`#puxar-area` do mockup): um fio de luz pendurado, o ponto na ponta e a dica. Arrastar o
 * ponto para baixo estica o fio; solto antes do limite, ele volta balançando; passando dele, ou num toque,
 * ou com Enter e Espaço, o fio é puxado de vez e `aoPuxar` leva ao passo. O desenho e a física são os do
 * mockup, linha por linha (montarFio, desenharFio, puxar).
 */
export function PuxarM({
  titulo,
  apoio,
  aoPuxar,
}: {
  titulo: string;
  apoio: string;
  aoPuxar: () => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const puxador = useRef<HTMLButtonElement>(null);
  const linha = useRef<SVGPathElement>(null);
  const brilho = useRef<SVGPathElement>(null);
  const dica = useRef<HTMLDivElement>(null);
  const sinal = useSinal();
  // `base` é onde o ponto repousa; `fioY` é onde ele está agora (a base mais o arrasto).
  const geo = useRef({ base: 0, fioY: 0, puxando: false });
  const aoPuxarRef = useRef(aoPuxar);
  useEffect(() => {
    aoPuxarRef.current = aoPuxar;
  }, [aoPuxar]);

  const desenhar = useCallback((puxao: number) => {
    const a = area.current;
    if (!a || !linha.current || !brilho.current || !puxador.current) return;
    const cx = a.clientWidth / 2;
    const y = geo.current.base + puxao;
    const balanco = Math.sin(puxao / 30) * 6;
    const d = `M${String(cx)} -40 Q${String(cx + balanco)} ${String(y / 2)} ${String(cx)} ${String(y - 40)}`;
    linha.current.setAttribute('d', d);
    brilho.current.setAttribute('d', d);
    puxador.current.style.transform = `translateY(${String(puxao)}px)`;
  }, []);

  /** Mede a área, põe o ponto e a dica no lugar e, na primeira vez, o faz cair do alto. */
  const montar = useCallback(
    (entrada: boolean) => {
      const a = area.current;
      const p = puxador.current;
      const d = dica.current;
      if (!a || !p || !d) return;
      const base = Math.min(a.clientHeight * 0.55, 230);
      geo.current.base = base;
      geo.current.fioY = base;
      desenhar(0);
      p.style.top = `${String(base - 42)}px`;
      d.style.top = `${String(base + 58)}px`;
      if (entrada && modoAgora() === 'normal') {
        void animar(
          p,
          [
            { transform: 'translateY(-30px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 700, easing: MOLA },
        );
      }
    },
    [desenhar],
  );

  useLayoutEffect(() => {
    montar(true);
    const aoRedimensionar = () => {
      montar(false);
    };
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [montar]);

  async function puxar() {
    const p = puxador.current;
    if (!p || geo.current.puxando) return;
    geo.current.puxando = true;
    if (modoAgora() === 'normal') {
      await animar(
        p,
        [
          { transform: `translateY(${String(geo.current.fioY - geo.current.base)}px)` },
          { transform: 'translateY(90px)' },
        ],
        { duration: 180, easing: TROCAR },
      );
      desenhar(90);
      await animar(
        p,
        [
          { transform: 'translateY(90px)' },
          { transform: 'translateY(-20px)' },
          { transform: 'translateY(0px)' },
        ],
        { duration: 420, easing: MOLA },
      );
    }
    cancelarAnimacoes(p);
    desenhar(0);
    geo.current.puxando = false;
    if (!sinal().aborted) aoPuxarRef.current();
  }

  // O arrasto: o ponto segue o dedo até 140 px; o fio acompanha.
  const arrasto = useRef<{ y0: number; movido: boolean } | null>(null);

  function soltar() {
    const a = arrasto.current;
    if (!a) return;
    arrasto.current = null;
    const dy = geo.current.fioY - geo.current.base;
    if (!a.movido || dy > 70) {
      void puxar();
      return;
    }
    if (modoAgora() === 'reduzido') {
      desenhar(0);
      return;
    }
    // Solto antes do limite: volta balançando, como uma mola que amortece.
    const t0 = performance.now();
    aCadaQuadro((t) => {
      const k = Math.min(1, (t - t0) / 420);
      desenhar(dy * Math.cos(k * Math.PI * 1.5) * (1 - k));
      return k < 1;
    }, sinal());
    geo.current.fioY = geo.current.base;
  }

  return (
    <div className="m-puxar-area" ref={area}>
      <svg aria-hidden="true">
        <path className="m-fio-pendurado-b m-brilho" ref={brilho} />
        <path className="m-fio-pendurado" ref={linha} />
      </svg>
      <div className="m-dica-puxar" ref={dica}>
        {titulo}
        <small>{apoio}</small>
      </div>
      <button
        type="button"
        className="m-puxador"
        ref={puxador}
        aria-label="Puxar o fio: começar o próximo passo"
        onPointerDown={(e) => {
          arrasto.current = { y0: e.clientY, movido: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          const dy = Math.max(0, Math.min(140, e.clientY - a.y0));
          if (dy > 4) a.movido = true;
          geo.current.fioY = geo.current.base + dy;
          desenhar(dy);
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void puxar();
          }
        }}
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
