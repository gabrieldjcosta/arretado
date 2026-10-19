// Ícones de linha do Fixar (D-D6, D-D7): desenhados num só traço, no lugar dos glifos ↻ ~ ✓ ✕ ?.
// Decorativos: a palavra ao lado diz o que é, e o estado nunca depende só do ícone nem da cor.

const CAMINHOS = {
  /** De novo: seta que volta ao começo. */
  deNovo: ['M20 12a8 8 0 1 1-2.6-5.9L20 8', 'M20 4v4h-4'],
  dificil: ['M4 12c2.5-4 5-4 8 0s5.5 4 8 0'],
  facil: ['M5 12.5l4.5 4.5L19 7.5'],
  errei: ['M7 7l10 10', 'M17 7L7 17'],
  inseguro: ['M9.5 9.2a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.6', 'M12 17h.01'],
  /** Relógio: o cartão já está no prazo de revisão. */
  relogio: ['M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 8v4.2l2.8 1.8'],
} as const;

export type NomeDoIcone = keyof typeof CAMINHOS;

export function IconeDoFixar({ nome }: { nome: NomeDoIcone }) {
  return (
    <svg
      className="icone-fixar"
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
