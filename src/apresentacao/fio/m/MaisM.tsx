import { useNavigate } from 'react-router';

/**
 * O "+" do mockup (`<button class="mais">`): o canto de onde se guarda um erro. Leva ao registro do erro,
 * onde a Frase correta entra; a folha do mockup ("Guardar um erro") é a próxima fatia.
 */
export function MaisM() {
  const navegar = useNavigate();
  return (
    <button
      type="button"
      className="m-mais"
      aria-label="Guardar um erro: escrever a frase certa"
      onClick={() => {
        void navegar('/recall/registrar');
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
