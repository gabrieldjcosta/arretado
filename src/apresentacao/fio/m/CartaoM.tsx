import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { voltouDeUmDesfazer } from '../dados/desfazer';
import { animar, cancelarAnimacoes, modoAgora, MOLA, SAIR, TROCAR, useSinal } from './anima';
import { avisar } from './toast';
import { faisca } from './trilho';
import { ContextoDaSaida, type SaidaDoCartao } from './saida';
import { TrilhoM } from './TrilhoM';

interface Props {
  /** O `data-cartao` do mockup: ler, lembrar, achar... */
  nome: string;
  /** O que fica no alto do cartão, ao lado do botão de pausa ("Ler · Execução Penal"). */
  etiqueta: ReactNode;
  /** O carimbo da direita (o mockup: LI, FEITO, ACHEI). */
  carimbo: string;
  /** O cartão já pode ser passado para a direita? Antes disso, a direita só ensaia. */
  resolvido: boolean;
  aoSeguir: () => void;
  aoPular: () => void;
  aoPausar: () => void;
  trilho: { feitos: number; nos: number; animarNovo: boolean };
  /**
   * Quando o mesmo cartão leva mais de uma pergunta (o Lembrar de vários artigos), a chave da pergunta da
   * vez: ao mudar, o conteúdo novo chega do lado em que o cartão saiu.
   */
  entrada?: string | number;
  children: ReactNode;
}

/**
 * O cartão do passo: o trilho, a pilha com o cartão por cima de um fantasma, os carimbos e o gesto de arrastar
 * (`ligarArraste` e `sairCartao` do mockup). Arrastar para a direita passa o passo (depois de resolvido),
 * para a esquerda o pula; solto antes do limite, o cartão volta na mola.
 */
export function CartaoM({
  nome,
  etiqueta,
  carimbo,
  resolvido,
  aoSeguir,
  aoPular,
  aoPausar,
  trilho,
  entrada,
  children,
}: Props) {
  const cartao = useRef<HTMLDivElement>(null);
  const ok = useRef<HTMLSpanElement>(null);
  const pu = useRef<HTMLSpanElement>(null);
  const sinal = useSinal();
  const vivo = useRef({ resolvido, aoSeguir, aoPular });
  useEffect(() => {
    vivo.current = { resolvido, aoSeguir, aoPular };
  }, [resolvido, aoSeguir, aoPular]);
  const arrasto = useRef<{ x0: number; y0: number; dx: number; ativo: boolean } | null>(null);
  const saindo = useRef(false);

  // Voltando de um "Desfazer", o cartão chega de onde saiu, na mola (o mockup: `desfazer()`).
  useEffect(() => {
    const c = cartao.current;
    if (!c || !voltouDeUmDesfazer() || modoAgora() !== 'normal') return;
    void animar(
      c,
      [
        { transform: 'translateX(-420px) rotate(-14deg)', opacity: 0.5 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 480, easing: MOLA },
    ).then(() => {
      cancelarAnimacoes(c);
    });
  }, []);

  // A pergunta seguinte, no mesmo cartão, chega pela direita (o cartão anterior saiu por ali).
  const anterior = useRef(entrada);
  useLayoutEffect(() => {
    if (anterior.current === entrada) return;
    anterior.current = entrada;
    const c = cartao.current;
    if (!c) return;
    // O cartão que saiu volta ao lugar dele, já com a pergunta nova: o que o gesto e a saída deixaram sai.
    cancelarAnimacoes(c);
    c.style.transform = '';
    c.style.opacity = '';
    // A pergunta nova começa do alto: a tela tinha rolado até o fim do cartão anterior (como o `scrollTop = 0` do mockup).
    const tela = c.closest<HTMLElement>('.m-tela');
    if (tela) tela.scrollTop = 0;
    const modo = modoAgora();
    if (modo === 'reduzido') return;
    void animar(
      c,
      modo === 'normal'
        ? [
            { transform: 'translateX(54px) rotate(3deg)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ]
        : [{ opacity: 0 }, { opacity: 1 }],
      { duration: modo === 'normal' ? 440 : 220, easing: SAIR },
    ).then(() => {
      cancelarAnimacoes(c);
    });
  }, [entrada]);

  async function sair(lado: 1 | -1, depois: () => void) {
    const c = cartao.current;
    if (saindo.current) return;
    saindo.current = true;
    if (c) {
      const modo = modoAgora();
      if (modo === 'normal') {
        await animar(
          c,
          [
            { transform: c.style.transform || 'none' },
            {
              transform: `translateX(${String(lado * 460)}px) rotate(${String(lado * 18)}deg)`,
              opacity: 0.6,
            },
          ],
          { duration: 320, easing: TROCAR },
        );
      } else if (modo === 'calmo') {
        await animar(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      }
      // Como no mockup (`sairCartao`): o cartão volta ao lugar antes de a tela trocar, e é a tela inteira que sai.
      cancelarAnimacoes(c);
      c.style.transform = '';
      c.style.opacity = '';
    }
    saindo.current = false;
    if (!sinal().aborted) depois();
  }

  const saida: SaidaDoCartao = {
    seguir: (botao) => {
      void (async () => {
        if (botao)
          await faisca(
            cartao.current?.closest('.m-passo')?.querySelector('.m-trilho') ?? null,
            botao,
            trilho.feitos,
          );
        await sair(1, vivo.current.aoSeguir);
      })();
    },
    pular: () => {
      void sair(-1, vivo.current.aoPular);
    },
  };

  const limite = (v: number) => Math.max(0, Math.min(1, v));

  return (
    <div className="m-passo">
      <TrilhoM {...trilho} />
      <div className="m-pilha">
        <div className="m-fantasma" />
        <div
          className="m-cartao"
          data-cartao={nome}
          ref={cartao}
          onPointerDown={(e) => {
            // O que tem gesto próprio (o deque da porteira) e o que se toca (botão, link) não arrasta o cartão.
            if ((e.target as Element).closest('button, .m-palavra, a, [data-sem-arrasto]')) return;
            arrasto.current = { x0: e.clientX, y0: e.clientY, dx: 0, ativo: false };
          }}
          onPointerMove={(e) => {
            const a = arrasto.current;
            const c = cartao.current;
            if (!a || !c) return;
            const mx = e.clientX - a.x0;
            const my = e.clientY - a.y0;
            if (!a.ativo) {
              if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my)) {
                a.ativo = true;
                c.setPointerCapture(e.pointerId);
                c.classList.add('m-arrastando');
              } else if (Math.abs(my) > 10) {
                arrasto.current = null;
                return;
              } else return;
            }
            a.dx = mx;
            const podeSeguir = vivo.current.resolvido;
            const efetivo = mx > 0 && !podeSeguir ? mx * 0.25 : mx;
            c.style.transform = `translateX(${String(efetivo)}px) rotate(${String(efetivo / 22)}deg)`;
            if (ok.current) ok.current.style.opacity = String(podeSeguir ? limite(mx / 90) : 0);
            if (pu.current) pu.current.style.opacity = String(limite(-mx / 90));
          }}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        >
          <span className="m-carimbo m-seguir" ref={ok}>
            {carimbo}
          </span>
          <span className="m-carimbo m-pular" ref={pu}>
            PULAR
          </span>
          <div className="m-topo-cartao">
            <span className="m-olho">{etiqueta}</span>
            {/* O trilho é só desenho: quem usa leitor de tela ouve a posição do passo aqui. */}
            <span className="m-so-leitor">{`Passo ${String(trilho.feitos + 1)} de ${String(trilho.nos - 1)}`}</span>
            <button
              type="button"
              className="m-icone"
              aria-label="Pausar: tudo fica salvo"
              onClick={aoPausar}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6v12M15 6v12" />
              </svg>
            </button>
          </div>
          <ContextoDaSaida value={saida}>{children}</ContextoDaSaida>
        </div>
      </div>
    </div>
  );

  function soltar() {
    const a = arrasto.current;
    const c = cartao.current;
    if (!a || !c) return;
    arrasto.current = null;
    c.classList.remove('m-arrastando');
    if (ok.current) ok.current.style.opacity = '0';
    if (pu.current) pu.current.style.opacity = '0';
    if (!a.ativo) return;
    if (a.dx > 100 && vivo.current.resolvido) {
      void sair(1, vivo.current.aoSeguir);
      return;
    }
    if (a.dx < -100) {
      void sair(-1, vivo.current.aoPular);
      return;
    }
    if (a.dx > 60 && !vivo.current.resolvido) avisar('Responda primeiro, depois passe pro lado.');
    const de = c.style.transform;
    c.style.transform = '';
    if (modoAgora() === 'normal') {
      void animar(c, [{ transform: de || 'none' }, { transform: 'none' }], {
        duration: 420,
        easing: MOLA,
      }).then(() => {
        cancelarAnimacoes(c);
      });
    }
  }
}
