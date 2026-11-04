import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useRegistroDeItens } from './ItensDoMais';
import { teclaForaDosAtalhos } from './teclado';

/**
 * Atalho global "E": registrar erro de qualquer tela (fora de campos de texto). A tela pode ter o registro
 * dela, ligado ao que está à vista (no Leitor, o dispositivo no alto da tela, sem sair da lei); sem ele, vai
 * ao registro. Vale nas duas cascas (a de hoje e a do Arretado novo).
 */
export function useAtalhoDeRegistrarErro(): void {
  const navegar = useNavigate();
  const registro = useRegistroDeItens();
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || teclaForaDosAtalhos(e)) return;
      e.preventDefault();
      const daTela = registro?.itens().find((item) => item.id === 'registrar-erro');
      if (daTela && daTela.indisponivel !== true) daTela.aoEscolher();
      else void navegar('/recall/registrar');
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
    };
  }, [navegar, registro]);
}
