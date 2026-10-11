import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

/** Menu "Ajuda": ajuda sobre a tela e "Relatar problema" (juntou o "?" e o "!"; muda o D6). */
export function MenuAjuda({
  paraAjuda,
  aoRelatar,
}: {
  /** Rota da seção de orientações desta tela. */
  paraAjuda: string;
  aoRelatar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (e.target instanceof Node && !raiz.current?.contains(e.target)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <div className="menu-ajuda" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="discreto"
        aria-expanded={aberto}
        aria-controls="menu-ajuda-itens"
        onClick={() => {
          setAberto((a) => !a);
        }}
      >
        Ajuda
      </button>
      {aberto && (
        <div id="menu-ajuda-itens" className="menu-ajuda-itens">
          <Link
            to={paraAjuda}
            className="botao discreto"
            onClick={() => {
              setAberto(false);
            }}
          >
            Ajuda sobre esta tela
          </Link>
          <button
            type="button"
            className="discreto"
            onClick={() => {
              setAberto(false);
              aoRelatar();
            }}
          >
            Relatar problema
          </button>
        </div>
      )}
    </div>
  );
}
