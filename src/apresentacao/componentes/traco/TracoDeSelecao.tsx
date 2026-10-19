import { useEffect, useRef } from 'react';
import { escolhaRecente, marcarEscolha } from './escolha';
import { tracar } from './tracar';
import './traco.css';

/**
 * O traço de seleção (D-D7, "A caneta que desenha"): vai dentro do item que se escolhe (aba, área,
 * resposta) e, quando a pessoa o toca e ele passa a ser o escolhido (`ativo`), desenha em volta dele
 * uma linha fina com a ponta de luz. `chave` identifica o item entre uma rota e outra: barras que se
 * remontam a cada rota (a Biblioteca) o recebem já `ativo`, e o toque de há pouco basta para desenhar.
 * Só decora (`aria-hidden`); o estado de verdade é o `aria-current` ou o `aria-pressed` do item. O
 * item precisa ser `position: relative` (ver `traco.css`).
 */
export function TracoDeSelecao({ chave, ativo }: { chave: string; ativo: boolean }) {
  const ref = useRef<SVGSVGElement>(null);

  // O toque vem do item (o pai do traço): é ele que se escolhe, e pode ser remontado a seguir.
  useEffect(() => {
    const item = ref.current?.parentElement;
    if (!item) return;
    const marcar = () => {
      marcarEscolha(chave);
    };
    item.addEventListener('click', marcar);
    return () => {
      item.removeEventListener('click', marcar);
    };
  }, [chave]);

  useEffect(() => {
    if (!ativo || !ref.current || !escolhaRecente(chave)) return;
    return tracar(ref.current);
  }, [ativo, chave]);

  return <svg ref={ref} className="traco-sel" aria-hidden="true" focusable="false" />;
}
