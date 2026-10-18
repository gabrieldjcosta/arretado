import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Título da tela com o "+" redondo em cal na mesma linha (D-D7, P2). O "+" abre o registro de erro,
 * por onde entra a Frase correta (D25); fica nas telas em que se registra (Hoje e Fixar). Nas outras,
 * o registro segue pela tecla E e, a partir de 900 px, pelo "Registrar erro" do cabeçalho.
 */
export function TituloComMais({ children }: { children: ReactNode }) {
  return (
    <div className="titulo-com-mais">
      <h1>{children}</h1>
      <Link
        to="/recall/registrar"
        className="botao mais"
        aria-label="Novo registro de erro"
        title="Registrar erro (atalho: E)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  );
}
