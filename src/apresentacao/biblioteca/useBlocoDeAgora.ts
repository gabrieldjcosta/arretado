import { useEffect, useState } from 'react';
import { RAIZ, type IndiceDaEstrutura } from './estrutura';

/**
 * O bloco mais fundo da leitura (`RAIZ` antes do primeiro): muda quando ela passa de um bloco a outro, não a cada nó.
 * Segue a rolagem por quadro e só redesenha quem o usa quando o bloco muda.
 */
export function useBlocoDeAgora(
  noDaLeitura: () => number | undefined,
  estrutura: IndiceDaEstrutura,
  /** O que muda quando a leitura anda sem rolar a página (o artigo do cartão no modo foco): refaz a conta. */
  chave?: number,
): number {
  const blocoDoAlto = () => {
    const no = noDaLeitura();
    return no === undefined ? RAIZ : (estrutura.dentroDe[no] ?? RAIZ);
  };
  const [dentro, setDentro] = useState(blocoDoAlto);
  useEffect(() => {
    let quadro = 0;
    const conferir = () => {
      quadro = 0;
      setDentro(blocoDoAlto());
    };
    const aoRolar = () => {
      if (quadro === 0) quadro = requestAnimationFrame(conferir);
    };
    quadro = requestAnimationFrame(conferir);
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `blocoDoAlto` só lê as duas entradas abaixo.
  }, [noDaLeitura, estrutura, chave]);
  return dentro;
}
