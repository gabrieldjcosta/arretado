import './luz.css';

/** O que um ponto do Dia reporta: feito (aceso), atual (aceso pela metade) ou falta (apagado, um anel). */
export type EstadoDoPonto = 'feito' | 'atual' | 'falta';

/**
 * O ponto do Dia (D-D7, P3; por mundo na D-D9, Q3): um quadrado de 22 px que o CSS desenha (componentes/
 * luz.css): de dia um rabisco com hachura de marca-texto, à noite um círculo com miolo. O estado muda a
 * forma (só o anel, o miolo pela metade, o miolo inteiro), nunca só a cor. Nunca é texto: o estado
 * vem em texto ao lado (quem o usa escreve o rótulo e o estado para o leitor de tela). Com `acende`,
 * aparece em 160 ms, uma vez; o movimento reduzido o mostra aceso na hora. Decorativo.
 */
export function PontoDeLuz({
  estado,
  acende = false,
}: {
  estado: EstadoDoPonto;
  acende?: boolean;
}) {
  return (
    <span
      className={acende ? 'ponto-de-luz acende' : 'ponto-de-luz'}
      data-estado={estado}
      aria-hidden="true"
    />
  );
}
