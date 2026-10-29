import { CACTO, CAIXA_DO_LOCKUP, NOME, PONTO } from './escrita/geometria';
import { NeonDoNome } from './escrita/NeonDoNome';

/**
 * O lockup da marca (D-D9, Q2): "arretado" escrito num traço só, em minúsculas, com o cacto
 * simplificado e o ponto de luz ao lado. Parado: é o quadro final da escrita do nome (`EscritaDoNome`,
 * Q6) e o que o cabeçalho mostra nas aberturas em que a frequência não pede a escrita (`Marca`).
 * Decorativo para o leitor de tela, porque quem nomeia é o link que o envolve. O traço segue o
 * `currentColor`; o ponto e o halo, os tokens `--marca-ponto` e `--marca-disco` (o ponto de luz de cada
 * mundo). Geometria do kit da marca (`lockup-parado`), em `escrita/geometria.ts`, a mesma da escrita.
 * Leva o néon de repouso da escrita (`NeonDoNome`), o mesmo grupo do quadro final dela: de dia fora do
 * desenho, à noite baixo (D-D10, N1).
 */
export function LockupParado() {
  return (
    <svg
      className="lockup"
      viewBox={CAIXA_DO_LOCKUP}
      fill="none"
      stroke="currentColor"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <NeonDoNome />
      {NOME.map(([d, x]) => (
        <path key={`${String(x)}${d}`} d={d} transform={`translate(${String(x)} 0)`} />
      ))}
      {CACTO.map((d) => (
        <path key={d} d={d} />
      ))}
      <circle className="lockup-disco" cx={PONTO.x} cy={PONTO.y} r={PONTO.disco} stroke="none" />
      <circle className="lockup-ponto" cx={PONTO.x} cy={PONTO.y} r={PONTO.raio} stroke="none" />
    </svg>
  );
}
