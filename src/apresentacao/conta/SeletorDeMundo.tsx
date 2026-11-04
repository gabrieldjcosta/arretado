import type { Mundo } from '../fio/m/mundo';

/**
 * A troca entre noite e dia: a lua (um disco claro com a sombra que balança, do uiverse `bad-parrot-46`)
 * vira o sol (disco de âmbar com a emanação de calor). Só desenho: o botão diz, no nome, para onde leva.
 * Reduzir movimento deixa a sombra parada e tira a emanação (`estilos.css`).
 */
export function SeletorDeMundo({ mundo, aoTrocar }: { mundo: Mundo; aoTrocar: () => void }) {
  return (
    <button
      type="button"
      className={`seletor-mundo seletor-mundo-${mundo}`}
      aria-label={mundo === 'noite' ? 'Trocar para o tema claro' : 'Trocar para o tema escuro'}
      onClick={aoTrocar}
    >
      <span className="seletor-mundo-halo" aria-hidden="true" />
      <span className="seletor-mundo-disco" aria-hidden="true" />
    </button>
  );
}
