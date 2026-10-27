import {
  Children,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** Quantos blocos abaixo do Agora aparecem de uma vez (S7); o resto espera atrás de "Ver mais". */
export const ORCAMENTO_DE_BLOCOS = 2;

/**
 * Orçamento de blocos do Hoje (S7, 27/10/2026). Cada filho é um bloco que decide sozinho se renderiza
 * (muitos devolvem `null` sem dados); aqui vale só o que apareceu: os `ORCAMENTO_DE_BLOCOS` primeiros,
 * na ordem dos filhos (a ordem é a prioridade), ficam à vista, e os demais ficam escondidos atrás de um
 * botão "Ver mais". Os blocos escondidos seguem montados, então um aviso que chega depois só entra na
 * conta. A contagem sai do DOM porque quem sabe se um bloco aparece é o próprio bloco. O botão não
 * mostra a contagem nem diz "avisos": o número soa como pendência, e o que fica atrás não é só aviso
 * (o "Para lembrar" é nota da própria pessoa).
 */
export function BlocosDoHoje({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);
  const idDaLista = useId();
  const [aberto, setAberto] = useState(false);
  const [escondidos, setEscondidos] = useState(0);

  const medir = useCallback(() => {
    const el = raiz.current;
    if (!el) return;
    const aparecem = Array.from(el.querySelectorAll<HTMLElement>(':scope > [data-bloco]')).filter(
      (b) => b.childElementCount > 0,
    );
    aparecem.forEach((b, i) => {
      b.hidden = !aberto && i >= ORCAMENTO_DE_BLOCOS;
    });
    setEscondidos(Math.max(0, aparecem.length - ORCAMENTO_DE_BLOCOS));
  }, [aberto]);

  useLayoutEffect(() => {
    medir();
    const el = raiz.current;
    if (!el) return undefined;
    // Só filhos que entram ou saem: mudar `hidden` é atributo e não dispara de novo.
    const observador = new MutationObserver(medir);
    observador.observe(el, { childList: true, subtree: true });
    return () => {
      observador.disconnect();
    };
  }, [medir]);

  return (
    <>
      <div ref={raiz} id={idDaLista}>
        {Children.toArray(children).map((filho, i) => (
          <div key={i} data-bloco="">
            {filho}
          </div>
        ))}
      </div>
      {escondidos > 0 && (
        <button
          type="button"
          className="botao botao-texto na-margem mais-do-hoje"
          aria-expanded={aberto}
          aria-controls={idDaLista}
          onClick={() => {
            setAberto((a) => !a);
          }}
        >
          {aberto ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </>
  );
}
