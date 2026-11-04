import { useRef, useState, type ReactNode } from 'react';
import {
  conferirCartao,
  type CartaoCertoOuErrado,
  type RespostaCertoOuErrado,
} from '../../../dominios/legislacao/lembrar';
import { animar, cancelarAnimacoes, modoAgora, MOLA, TROCAR, useSinal } from './anima';

/** O que o deque devolve quando o último cartão sai. */
export interface FimDoDeque {
  acertos: number;
  total: number;
  /** Os cartões que a pessoa errou, para a Frase certa. */
  erros: readonly CartaoCertoOuErrado[];
}

/** O que a lei diz, em uma linha, depois de cada cartão (o `a.certa` do mockup). */
function oQueDiz(cartao: CartaoCertoOuErrado): string {
  const t = cartao.troca;
  return t ? `A lei diz “${t.original}”, não “${t.substituto}”.` : 'Estava como está na lei.';
}

function CartaDoDeque({
  cartao,
  posicao,
  de,
  noTopo,
  aoResponder,
}: {
  cartao: CartaoCertoOuErrado;
  posicao: number;
  de: number;
  noTopo: boolean;
  aoResponder: (el: HTMLElement, resposta: RespostaCertoOuErrado) => void;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const certo = useRef<HTMLSpanElement>(null);
  const errado = useRef<HTMLSpanElement>(null);
  const arrasto = useRef<{ x0: number; dx: number } | null>(null);

  function soltar() {
    const a = arrasto.current;
    const c = el.current;
    if (!a || !c) return;
    arrasto.current = null;
    if (Math.abs(a.dx) > 90) {
      aoResponder(c, a.dx > 0 ? 'certo' : 'errado');
      return;
    }
    if (certo.current) certo.current.style.opacity = '0';
    if (errado.current) errado.current.style.opacity = '0';
    const de_ = c.style.transform;
    c.style.transform = '';
    void animar(c, [{ transform: de_ || 'none' }, { transform: 'none' }], {
      duration: 360,
      easing: MOLA,
    }).then(() => {
      cancelarAnimacoes(c);
    });
  }

  return (
    <div
      className="m-cd"
      ref={el}
      onPointerDown={(e) => {
        if (!noTopo) return;
        arrasto.current = { x0: e.clientX, dx: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const a = arrasto.current;
        const c = el.current;
        if (!a || !c) return;
        a.dx = e.clientX - a.x0;
        c.style.transform = `translateX(${String(a.dx)}px) rotate(${String(a.dx / 18)}deg)`;
        if (certo.current)
          certo.current.style.opacity = String(Math.max(0, Math.min(1, a.dx / 90)));
        if (errado.current) {
          errado.current.style.opacity = String(Math.max(0, Math.min(1, -a.dx / 90)));
        }
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <span className="m-selo m-c" ref={certo}>
        CERTO
      </span>
      <span className="m-selo m-e" ref={errado}>
        ERRADO
      </span>
      <span className="m-n">
        {posicao} de {de}
      </span>
      <p>{cartao.mostrado}</p>
    </div>
  );
}

/**
 * O deque da porteira (`#deque` do mockup): cartões de certo ou errado empilhados. Passa-se para a direita
 * o que está certo e para a esquerda o que está errado, ou toca em "Certo" e "Errado". Depois de cada um, o
 * que a lei diz; ao fim, "A porteira abriu". Sem prazo e sem perda.
 */
export function DequeM({
  cartoes,
  aoFim,
  final,
}: {
  cartoes: readonly CartaoCertoOuErrado[];
  aoFim: (fim: FimDoDeque) => void;
  /** O que fecha a porteira dentro do veredito (o "Guardar as Frases"). */
  final?: (fim: FimDoDeque) => ReactNode;
}) {
  const [indice, setIndice] = useState(0);
  const [veredito, setVeredito] = useState<{ chave: number; acertou: boolean; curto: string }>();
  const [fim, setFim] = useState<FimDoDeque>();
  const conta = useRef({ acertos: 0, erros: [] as CartaoCertoOuErrado[] });
  const respondendo = useRef(false);
  const raiz = useRef<HTMLDivElement>(null);
  const textoDoVeredito = useRef<HTMLDivElement>(null);
  const sinal = useSinal();

  async function responder(el: HTMLElement, resposta: RespostaCertoOuErrado) {
    const cartao = cartoes[indice];
    if (!cartao || respondendo.current) return;
    respondendo.current = true;
    const acertou = conferirCartao(cartao, resposta);
    if (acertou) conta.current.acertos += 1;
    else conta.current.erros.push(cartao);
    const lado = resposta === 'certo' ? 1 : -1;
    const normal = modoAgora() === 'normal';
    await animar(
      el,
      [
        { transform: el.style.transform || 'none' },
        {
          transform: `translateX(${String(lado * 420)}px) rotate(${String(lado * 16)}deg)`,
          opacity: 0.4,
        },
      ],
      { duration: normal ? 320 : 240, easing: TROCAR },
    );
    if (sinal().aborted) return;
    respondendo.current = false;
    const ultimo = indice + 1 >= cartoes.length;
    setIndice(indice + 1);
    if (ultimo) {
      const resultado: FimDoDeque = {
        acertos: conta.current.acertos,
        total: cartoes.length,
        erros: conta.current.erros,
      };
      setFim(resultado);
      setVeredito(undefined);
      aoFim(resultado);
    } else {
      setVeredito({ chave: indice, acertou, curto: oQueDiz(cartao) });
    }
    if (normal) {
      window.requestAnimationFrame(() => {
        void animar(
          textoDoVeredito.current,
          [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 260 },
        );
      });
    }
  }

  /** O cartão do topo é o último da pilha (o `topoDeque()` do mockup). */
  function responderNoTopo(resposta: RespostaCertoOuErrado) {
    const topo = raiz.current?.querySelector<HTMLElement>('.m-deque .m-cd:last-child');
    return topo ? responder(topo, resposta) : Promise.resolve();
  }

  const restantes = cartoes.slice(indice);
  return (
    <div data-sem-arrasto ref={raiz}>
      <div className="m-deque">
        {[...restantes].reverse().map((cartao, k) => {
          const i = indice + restantes.length - 1 - k;
          return (
            <CartaDoDeque
              key={cartao.fonte.dispositivoId}
              cartao={cartao}
              posicao={i + 1}
              de={cartoes.length}
              noTopo={i === indice}
              aoResponder={(el, r) => {
                void responder(el, r);
              }}
            />
          );
        })}
      </div>
      <div className="m-veredito" role="status" ref={textoDoVeredito}>
        {veredito && (
          <>
            {veredito.acertou ? 'Isso.' : 'Quase.'}
            <small>{veredito.curto}</small>
          </>
        )}
        {fim && (
          <>
            A porteira abriu.
            <small>
              {fim.acertos} de {fim.total} de primeira
              {fim.erros.length > 0 ? '; o que escapou vira Frase com um toque.' : '.'}
            </small>
            {final?.(fim)}
          </>
        )}
      </div>
      {!fim && (
        <div className="m-botoes-deque">
          <button
            type="button"
            className="m-b-e"
            aria-label="Errado"
            onClick={() => {
              void responderNoTopo('errado');
            }}
          >
            Errado
          </button>
          <button
            type="button"
            className="m-b-c"
            aria-label="Certo"
            onClick={() => {
              void responderNoTopo('certo');
            }}
          >
            Certo
          </button>
        </div>
      )}
    </div>
  );
}
