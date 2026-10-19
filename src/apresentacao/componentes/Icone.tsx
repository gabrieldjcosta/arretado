// Ícones de traço único da interface (D-D7: nada de glifo de texto como desenho). Decorativos: o
// texto ao lado, ou o `aria-label` do botão, diz o que é. Tamanho e alinhamento: `.icone-svg`.

const CAMINHOS = {
  voltar: ['M19 12H5', 'M11 6l-6 6 6 6'],
  /** Seta para a direita: a linha leva a outra tela. */
  seta: ['M9 6l6 6-6 6'],
  /** Aberto. Fechado, o CSS o gira para a direita. */
  abre: ['M6 9l6 6 6-6'],
  marca: ['M5 12.5l4.5 4.5L19 7.5'],
  fechar: ['M7 7l10 10', 'M17 7L7 17'],
  nota: ['M5 19l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z', 'M14 7l3 3'],
  info: ['M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 11v5', 'M12 8h.01'],
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
