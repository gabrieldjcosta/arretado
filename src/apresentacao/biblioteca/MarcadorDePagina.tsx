// O marcador de página: ao reabrir uma Norma onde a pessoa estava, uma fita cai e prende no canto do artigo,
// sem texto (nada que soe a cobrança). Motion (`motion/mini`): cai com a mola do app; no Calmo só esmaece;
// com movimento reduzido já aparece pronta. Some sozinha depois de alguns segundos.
import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/mini';
import { movimentoAgora } from '../movimento';
import './marcador-de-pagina.css';

const MOLA: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export function MarcadorDePagina() {
  const fita = useRef<HTMLSpanElement>(null);
  const [visivel, setVisivel] = useState(true);
  useEffect(() => {
    const el = fita.current;
    if (el) {
      const mov = movimentoAgora();
      if (mov === 'normal') {
        animate(
          el,
          { transform: ['translateY(-110%)', 'translateY(0%)'] },
          { duration: 0.6, ease: MOLA },
        );
      } else if (mov === 'calmo') {
        animate(el, { opacity: [0, 1] }, { duration: 0.4 });
      }
    }
    const id = window.setTimeout(() => {
      setVisivel(false);
    }, 9000);
    return () => {
      window.clearTimeout(id);
    };
  }, []);
  return (
    <span
      ref={fita}
      className={visivel ? 'marcador-de-pagina' : 'marcador-de-pagina some'}
      data-marcador-de-pagina=""
      aria-hidden="true"
    >
      <svg viewBox="0 0 14 30" focusable="false">
        <path d="M0 0h14v30l-7-6-7 6z" />
      </svg>
    </span>
  );
}
