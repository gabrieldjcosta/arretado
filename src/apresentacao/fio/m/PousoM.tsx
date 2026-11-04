import { useLayoutEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router';
import type { Pouso } from '../../../dominios/fio';
import { marcarPausa } from '../dados/pausa';
import { useFio, type FioNaTela } from '../dados/useFio';
import { pousoNaVereda, pousosDaVolta, type PousoNaVereda } from '../pouso/lugares';
import { animar, aCadaQuadro, cancelarAnimacoes, modoAgora, MOLA, useSinal } from './anima';
import { CenaM } from './CenaM';
import { TelaM } from './TelaM';

/**
 * Os fatos do pouso que a tela mostra: os de agora, ou os de um pouso anterior da volta (o aparelho guarda os
 * últimos dez). Sem registro de um pouso antigo, a tela não inventa nada: `undefined`.
 */
function fatosDoPousoVisto(
  visto: PousoNaVereda,
  agora: Pouso,
  guardados: readonly Pouso[],
): readonly string[] | undefined {
  if (visto.numero === agora.etapa + 1) return agora.fatos;
  return guardados.find((p) => p.etapa + 1 === visto.numero)?.fatos;
}

/** Os fatos, em frases corridas (o `#fato-pouso` do mockup é um parágrafo). */
const fraseDosFatos = (fatos: readonly string[]): string =>
  `${fatos.map((f) => f.replace(/[.\s]+$/, '')).join('. ')}.`;

/**
 * O fio de seguir do pouso (`#puxa-pouso` do mockup): o ponto dourado pendurado num fio. Arrastar para baixo
 * até 70 px estica o fio; solto antes de 28 px, ele volta balançando; passando disso, num toque, ou com Enter e
 * Espaço, o fio é puxado de vez e `aoPuxar` fecha a etapa.
 */
function PuxaPousoM({ aoPuxar }: { aoPuxar: () => void }) {
  const area = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const linha = useRef<SVGPathElement>(null);
  const brilho = useRef<SVGPathElement>(null);
  const no = useRef<HTMLButtonElement>(null);
  const sinal = useSinal();
  const puxando = useRef(false);
  const arrasto = useRef<{ y0: number; dy: number; mov: boolean } | null>(null);

  /** O desenho do fio com o ponto `dy` px abaixo do repouso (o `fioPouso()` do mockup). */
  function desenhar(dy: number) {
    const a = area.current;
    if (!a || !linha.current || !brilho.current || !svg.current || !no.current) return;
    const w = a.clientWidth;
    const cx = w / 2;
    const y = 58 + dy;
    const d = `M${String(cx)} -6 Q${String(cx + Math.sin(dy / 20) * 5)} ${String(y / 2)} ${String(cx)} ${String(y)}`;
    linha.current.setAttribute('d', d);
    brilho.current.setAttribute('d', d);
    svg.current.setAttribute('viewBox', `0 0 ${String(w)} 150`);
    no.current.style.transform = `translateY(${String(dy)}px)`;
  }

  useLayoutEffect(() => {
    desenhar(0);
    const n = no.current;
    // O ponto chega do alto, depois da cena (o `animar` do `pouso()` do mockup).
    if (n && modoAgora() === 'normal') {
      void animar(
        n,
        [
          { transform: 'translateY(-30px)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 700, delay: 900, easing: MOLA },
      ).then(() => {
        cancelarAnimacoes(n);
      });
    }
    const aoRedimensionar = () => {
      desenhar(0);
    };
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, []);

  async function seguir() {
    const n = no.current;
    if (!n || puxando.current) return;
    puxando.current = true;
    if (modoAgora() === 'normal') {
      await animar(
        n,
        [
          { transform: n.style.transform || 'none' },
          { transform: 'translateY(46px)' },
          { transform: 'translateY(-10px)' },
          { transform: 'none' },
        ],
        { duration: 520, easing: MOLA },
      );
      cancelarAnimacoes(n);
    }
    desenhar(0);
    puxando.current = false;
    if (!sinal().aborted) aoPuxar();
  }

  function soltar() {
    const a = arrasto.current;
    if (!a) return;
    arrasto.current = null;
    if (!a.mov || a.dy > 28) {
      void seguir();
      return;
    }
    const de = a.dy;
    const t0 = performance.now();
    aCadaQuadro((t) => {
      const k = Math.min(1, (t - t0) / 380);
      desenhar(de * Math.cos(k * Math.PI * 1.5) * (1 - k));
      return k < 1;
    }, sinal());
  }

  return (
    <div className="m-puxa-pouso" ref={area}>
      <svg aria-hidden="true" viewBox="0 0 100 120" preserveAspectRatio="none" ref={svg}>
        <path className="m-fio-pendurado-b m-brilho" ref={brilho} />
        <path className="m-fio-pendurado" ref={linha} />
      </svg>
      <button
        type="button"
        className="m-no-seguir"
        ref={no}
        aria-label="Puxar o fio: seguir para o próximo passo"
        onPointerDown={(e) => {
          arrasto.current = { y0: e.clientY, dy: 0, mov: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (!a) return;
          a.dy = Math.max(0, Math.min(70, e.clientY - a.y0));
          if (a.dy > 4) a.mov = true;
          desenhar(a.dy);
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void seguir();
          }
        }}
      />
      <span className="m-dica-no">puxe para seguir</span>
    </div>
  );
}

/**
 * A cena e o que a acompanha. As pílulas só mostram o que a pessoa já visitou na volta; tocar numa troca a
 * cena, o título e os fatos para os daquele pouso, sem mexer em nada guardado.
 */
function PousoEmCena({ pouso, fio }: { pouso: Pouso; fio: FioNaTela }) {
  const numero = pouso.etapa + 1;
  const [escolhido, setEscolhido] = useState(numero);
  const faixa = useRef<HTMLDivElement>(null);
  // As pílulas rolam de lado em tela estreita: a da vez, a última, já abre à vista.
  useLayoutEffect(() => {
    const atual = faixa.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (faixa.current && atual) faixa.current.scrollLeft = Math.max(0, atual.offsetLeft - 8);
  }, []);
  const volta = pousosDaVolta(numero);
  const visto = volta.find((p) => p.numero === escolhido) ?? pousoNaVereda(numero);
  const fatos = fatosDoPousoVisto(visto, pouso, fio.fio.estado.pousos);

  return (
    <TelaM nome="pouso" className="m-pouso" rotulo="Pouso">
      <div className="m-ceu">
        <span className="m-olho">
          Pouso {String(visto.numero)} · {visto.lugar.nome}
        </span>
        <CenaM key={visto.numero} pouso={visto} />
      </div>
      <div className="m-corpo">
        <h2 aria-live="polite">{visto.lugar.titulo}</h2>
        {fatos !== undefined && (
          <p className="m-quieto" style={{ color: 'var(--m-texto)', fontSize: 15 }}>
            {fatos.length > 0 ? fraseDosFatos(fatos) : 'Você deu esse passo. Amanhã tem mais.'}
          </p>
        )}
        <div className="m-lugares" role="group" aria-label="Pousos da vereda" ref={faixa}>
          {volta.map((p) => (
            <button
              key={p.numero}
              type="button"
              className="m-lugar-chip"
              aria-pressed={p.numero === visto.numero}
              aria-label={`${p.lugar.nome}: pouso ${String(p.numero)}, cacto com ${String(p.flores)} ${p.flores === 1 ? 'flor' : 'flores'}`}
              onClick={() => {
                setEscolhido(p.numero);
              }}
            >
              {p.lugar.nome}
              <span className="m-flores" aria-hidden="true">
                {'✿'.repeat(p.flores)}
              </span>
            </button>
          ))}
        </div>
        <div className="m-vazio" />
        <div className="m-saida-pouso">
          <button
            type="button"
            className="m-lua-btn"
            aria-label="Descansar por hoje"
            onClick={() => {
              // A etapa conta e o Agora diz, uma vez, que está tudo salvo.
              marcarPausa();
              fio.pousarEtapa();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
            </svg>
            <span>descansar</span>
          </button>
          <PuxaPousoM
            aoPuxar={() => {
              fio.pousarEtapa();
            }}
          />
          <span className="m-lado-vazio" aria-hidden="true" />
        </div>
      </div>
    </TelaM>
  );
}

/**
 * O pouso (D-D25), a tela `pouso` do mockup aprovado: a etapa fecha numa cena (o Zé diante de um lugar da vereda,
 * com o jardim dele) e nos fatos do que foi feito, em frases curtas e sem placar. Passo pulado não deixa fato,
 * e a falta dele não vira aviso. Puxar o fio conta a etapa e volta ao Agora; "descansar" faz o mesmo e o Agora diz
 * que está tudo salvo. O próximo puxão planeja a etapa seguinte.
 */
export function PousoM() {
  const fio = useFio();
  const { avanco } = fio;
  if (fio.falhou) {
    return (
      <TelaM nome="pouso" rotulo="Pouso">
        <p className="m-quieto" role="alert">
          Não deu para ler seus dados agora. Nada se perdeu; tente de novo em instantes.
        </p>
      </TelaM>
    );
  }
  if (!avanco) {
    return (
      <section className="m-tela" data-tela="pouso" aria-busy="true" aria-label="Pouso">
        <p className="m-so-leitor">Abrindo o pouso…</p>
      </section>
    );
  }
  if (avanco.proximo.tipo !== 'pouso') return <Navigate to="/" replace />;
  return <PousoEmCena pouso={avanco.proximo.pouso} fio={fio} />;
}
