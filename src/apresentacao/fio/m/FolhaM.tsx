// A folha que sobe do pé do quadro, como a do mockup aprovado (`abrirFolha` e `fecharFolha`): um véu escurece, o corpo sobe
// com um repique e, ao fechar, desce. Fecha pela alça, pelo véu, por Escape ou puxando o corpo para baixo (se a puxada não
// passa de 90 px, a mola o devolve). O mockup a esconde com `hidden`; aqui ela só existe enquanto aberta. Mora no quadro
// (`#conteudo`), por cima de tudo, como a `.folha` do mockup, e o resto do quadro fica inerte enquanto ela está aberta, com
// o foco preso nela (desvio 37).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as CliqueDoReact,
  type PointerEvent as ToqueDoReact,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { animar, cancelarAnimacoes, modoAgora, MOLA } from './anima';
import { useQuadroDoFio } from './quadro';

/** O que dá para focar dentro da folha (para prender o Tab nela). */
const FOCAVEIS =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Para onde o foco vai ao abrir, por ordem de preferência. */
const ALVOS_DO_FOCO = ['textarea', '.m-acao:not([disabled])', 'button.m-alca'];

/** O véu do mockup: o azul da noite a 60%. */
const VEU = 'rgba(3,7,14,.6)';
const SEM_VEU = 'rgba(3,7,14,0)';

export interface PropsDaFolha {
  aberta: boolean;
  /** Chamada quando a folha acabou de descer: quem a abriu a fecha por aqui. */
  aoFechar: () => void;
  /** O `id` do título dentro da folha (`aria-labelledby`). */
  idDoTitulo: string;
  /** A classe do corpo da folha (`m-opcoes-org`, `m-acoes-item`…). */
  classeDoCorpo?: string;
  /** O conteúdo; uma função recebe `fechar`, que faz a folha descer e só então chama `aoFechar`. */
  children: ReactNode | ((fechar: () => Promise<void>) => ReactNode);
}

/** Chama o conteúdo que pede o `fechar` já dentro do corpo (a chamada fica fora da renderização da folha, que guarda refs). */
function Corpo({
  conteudo,
  fechar,
}: {
  conteudo: (fechar: () => Promise<void>) => ReactNode;
  fechar: () => Promise<void>;
}) {
  return conteudo(fechar);
}

export function FolhaM({ aberta, ...resto }: PropsDaFolha) {
  const quadro = useQuadroDoFio();
  if (!aberta || !quadro) return null;
  return createPortal(<FolhaAberta {...resto} />, quadro);
}

function FolhaAberta({
  aoFechar,
  idDoTitulo,
  classeDoCorpo,
  children,
}: Omit<PropsDaFolha, 'aberta'>) {
  const raiz = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const fechando = useRef(false);
  const aoFecharRef = useRef(aoFechar);
  const focoAntes = useRef<Element | null>(null);
  const arrasto = useRef<{ y0: number; dy: number } | null>(null);

  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  /** Desce o corpo e some o véu, e só então avisa quem a abriu (o mockup espera `fecharFolha` antes de seguir). */
  const fechar = useCallback(async () => {
    if (fechando.current) return;
    fechando.current = true;
    const f = raiz.current;
    const c = corpo.current;
    if (f && c) {
      const agora = getComputedStyle(c).transform;
      await Promise.all([
        animar(c, [{ transform: agora }, { transform: 'translateY(100%)' }], {
          duration: 300,
          easing: 'cubic-bezier(.4,0,1,1)',
        }),
        animar(f, [{ backgroundColor: VEU }, { backgroundColor: SEM_VEU }], { duration: 300 }),
      ]);
    }
    aoFecharRef.current();
  }, []);

  // Sobe: o véu em 300 ms e o corpo com o repique (no Calmo, só esmaece e sobe 40 px).
  useLayoutEffect(() => {
    const f = raiz.current;
    const c = corpo.current;
    if (!f || !c) return;
    focoAntes.current = document.activeElement;
    cancelarAnimacoes(c);
    cancelarAnimacoes(f);
    const normal = modoAgora() === 'normal';
    void animar(f, [{ backgroundColor: SEM_VEU }, { backgroundColor: VEU }], { duration: 300 });
    void animar(
      c,
      normal
        ? [
            { transform: 'translateY(100%)' },
            { transform: 'translateY(-6px)', offset: 0.75 },
            { transform: 'none' },
          ]
        : [
            { transform: 'translateY(40px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
      { duration: normal ? 460 : 400, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
  }, []);

  // O resto do quadro fica inerte enquanto a folha está aberta (o aviso, que é uma região viva, continua). Vem antes do efeito
  // do foco de propósito: o React roda as limpezas na ordem em que os efeitos foram escritos, e o foco só volta a quem abriu
  // depois que o quadro deixou de ser inerte (um elemento dentro de um `inert` não recebe foco).
  useEffect(() => {
    const quadro = raiz.current?.parentElement;
    if (!quadro) return;
    const inertes: Element[] = [];
    for (const filho of Array.from(quadro.children)) {
      if (filho === raiz.current || filho.hasAttribute('inert')) continue;
      if (filho.getAttribute('role') === 'status') continue;
      filho.setAttribute('inert', '');
      inertes.push(filho);
    }
    return () => {
      inertes.forEach((x) => {
        x.removeAttribute('inert');
      });
    };
  }, []);

  // O foco vai ao campo de texto, senão ao botão de ação, senão à alça, um instante depois, e volta a quem abriu quando ela
  // se vai. (O `querySelector` do mockup, com os três numa lista só, devolve sempre a alça, que vem primeiro: aqui vale a ordem.)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const alvo = ALVOS_DO_FOCO.map((seletor) =>
        raiz.current?.querySelector<HTMLElement>(seletor),
      ).find(Boolean);
      alvo?.focus({ preventScroll: true });
    }, 60);
    return () => {
      window.clearTimeout(id);
      const antes = focoAntes.current;
      if (antes instanceof HTMLElement && antes.isConnected) antes.focus({ preventScroll: true });
    };
  }, []);

  // Escape fecha; o Tab dá a volta dentro da folha.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void fechar();
        return;
      }
      if (e.key !== 'Tab') return;
      const itens = Array.from(corpo.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []);
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (!primeiro || !ultimo) return;
      const ativo = document.activeElement;
      const dentro = corpo.current?.contains(ativo) ?? false;
      if (e.shiftKey && (ativo === primeiro || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || !dentro)) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [fechar]);

  // Fechar puxando o corpo para baixo (o mockup não começa a puxada em botão, campo de texto nem no deque da porteira).
  const aoApertar = (e: ToqueDoReact<HTMLDivElement>) => {
    const c = corpo.current;
    if (!c || fechando.current || c.scrollTop > 0) return;
    if ((e.target as Element).closest('button, textarea, .m-cd')) return;
    // A entrada, com `fill: 'both'`, segura o corpo no quadro final e esconderia o estilo da puxada: solta-a antes.
    cancelarAnimacoes(c);
    arrasto.current = { y0: e.clientY, dy: 0 };
    try {
      c.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura (o jsdom não tem): a puxada segue pelo que o corpo recebe */
    }
  };
  const aoArrastar = (e: ToqueDoReact<HTMLDivElement>) => {
    const a = arrasto.current;
    const c = corpo.current;
    if (!a || !c) return;
    a.dy = Math.max(0, e.clientY - a.y0);
    c.style.transform = `translateY(${String(a.dy)}px)`;
  };
  const aoSoltar = () => {
    const a = arrasto.current;
    const c = corpo.current;
    if (!a || !c) return;
    arrasto.current = null;
    if (a.dy > 90) {
      void fechar();
      return;
    }
    void animar(c, [{ transform: `translateY(${String(a.dy)}px)` }, { transform: 'none' }], {
      duration: 320,
      easing: MOLA,
    }).then(() => {
      cancelarAnimacoes(c);
      c.style.transform = '';
    });
  };

  const aoTocarNoVeu = (e: CliqueDoReact<HTMLDivElement>) => {
    const alvo = e.target as Element;
    if (alvo === e.currentTarget || alvo.closest('[data-fechar]')) void fechar();
  };

  return (
    // O véu fecha com o toque; para o teclado há Escape e a alça, que é um botão.
    <div
      ref={raiz}
      className="m-folha"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idDoTitulo}
      onClick={aoTocarNoVeu}
    >
      <div
        ref={corpo}
        className={['m-corpo', classeDoCorpo].filter(Boolean).join(' ')}
        onPointerDown={aoApertar}
        onPointerMove={aoArrastar}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <button
          type="button"
          className="m-alca"
          aria-label="Fechar"
          onClick={() => {
            void fechar();
          }}
        />
        {typeof children === 'function' ? <Corpo conteudo={children} fechar={fechar} /> : children}
      </div>
    </div>
  );
}
