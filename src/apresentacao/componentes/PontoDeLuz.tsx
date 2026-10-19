import './luz.css';

/** O que um ponto do Dia reporta: feito (aceso), atual (aceso pela metade) ou falta (apagado, um anel). */
export type EstadoDoPonto = 'feito' | 'atual' | 'falta';

/**
 * O ponto de luz (D-D7, P3): três estados num círculo de 22 px, todos com o contorno na tinta, que é o
 * que o separa do fundo (a luz sozinha, a cal sobre a areia, não passa de 1,4:1). Nunca é texto: o
 * estado vem em texto ao lado (quem o usa escreve o rótulo e o estado para o leitor de tela). Com
 * `acende`, aparece em 160 ms, uma vez; o movimento reduzido o mostra aceso na hora. Decorativo.
 */
export function PontoDeLuz({
  estado,
  acende = false,
}: {
  estado: EstadoDoPonto;
  acende?: boolean;
}) {
  return (
    <svg
      className={acende ? 'ponto-de-luz acende' : 'ponto-de-luz'}
      data-estado={estado}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {estado === 'feito' && <circle className="ponto-luz" cx="12" cy="12" r="9" />}
      {estado === 'atual' && <path className="ponto-luz" d="M12 3a9 9 0 0 1 0 18z" />}
      <circle
        className={estado === 'falta' ? 'ponto-anel apagado' : 'ponto-anel'}
        cx="12"
        cy="12"
        r="9"
      />
      {estado !== 'falta' && <circle className="ponto-nucleo" cx="12" cy="12" r="3.4" />}
    </svg>
  );
}
