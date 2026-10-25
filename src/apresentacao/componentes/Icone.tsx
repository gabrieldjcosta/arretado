// Ícones de traço único da interface (D-D7: nada de glifo de texto como desenho). Decorativos: o
// texto ao lado, ou o `aria-label` do botão, diz o que é. Tamanho e alinhamento: `.icone-svg`.

const CIRCULO = 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z';

const CAMINHOS = {
  voltar: ['M19 12H5', 'M11 6l-6 6 6 6'],
  /** Seta para a direita: a linha leva a outra tela. */
  seta: ['M9 6l6 6-6 6'],
  /** Aberto. Fechado, o CSS o gira para a direita. */
  abre: ['M6 9l6 6 6-6'],
  marca: ['M5 12.5l4.5 4.5L19 7.5'],
  fechar: ['M7 7l10 10', 'M17 7L7 17'],
  nota: ['M5 19l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z', 'M14 7l3 3'],
  info: [CIRCULO, 'M12 11v5', 'M12 8h.01'],
  /** Seta que volta ao começo: "De novo" na revisão. */
  repetir: ['M20 12a8 8 0 1 1-2.6-5.9L20 8', 'M20 4v4h-4'],
  /** Onda: "Difícil" na revisão. */
  onda: ['M4 12c2.5-4 5-4 8 0s5.5 4 8 0'],
  /** Interrogação: o erro em que o acerto foi chute. */
  ajuda: ['M9.5 9.2a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.6', 'M12 17h.01'],
  /** Relógio: o cartão já está no prazo de revisão. */
  relogio: [CIRCULO, 'M12 8v4.2l2.8 1.8'],
  /** Quatro quadrados: o Mapa da norma. */
  mapa: ['M5 5h5.5v5.5H5z', 'M13.5 5H19v5.5h-5.5z', 'M5 13.5h5.5V19H5z', 'M13.5 13.5H19V19h-5.5z'],
} as const;

export type NomeDoIcone = keyof typeof CAMINHOS;

export function Icone({ nome, className }: { nome: NomeDoIcone; className?: string }) {
  return (
    <svg
      className={className ? `icone-svg ${className}` : 'icone-svg'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {CAMINHOS[nome].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
