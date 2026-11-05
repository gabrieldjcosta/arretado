import { useState } from 'react';
import { ErroM } from './ErroM';

/**
 * O "+" do mockup (`<button class="mais">`): o canto de onde se guarda um erro. Abre a folha "Guardar um erro"
 * (`ErroM`), onde a Frase certa entra; o registro completo de antes continua em `/recall/registrar`, pelo Recall.
 */
export function MaisM() {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button
        type="button"
        className="m-mais"
        aria-label="Guardar um erro: escrever a frase certa"
        aria-haspopup="dialog"
        onClick={() => {
          setAberta(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <ErroM
        aberta={aberta}
        aoFechar={() => {
          setAberta(false);
        }}
      />
    </>
  );
}
