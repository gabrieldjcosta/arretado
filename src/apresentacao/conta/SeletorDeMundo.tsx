import type { Mundo } from '../fio/m/mundo';

/**
 * A troca entre noite e dia: a lua (um disco claro com a sombra que balança, do uiverse `bad-parrot-46`)
 * vira o sol (disco de âmbar com a emanação de calor). O nome é fixo e `aria-pressed` diz se é noite (o nome não repete "claro" nem "escuro": os botões de rádio têm esses nomes).
 * Reduzir movimento deixa a sombra parada e tira a emanação (`estilos.css`).
 */
export function SeletorDeMundo({ mundo, aoTrocar }: { mundo: Mundo; aoTrocar: () => void }) {
  return (
    <button
      type="button"
      className={`seletor-mundo seletor-mundo-${mundo}`}
      aria-label="Alternar entre noite e dia"
      aria-pressed={mundo === 'noite'}
      onClick={aoTrocar}
    >
      <span className="seletor-mundo-halo" aria-hidden="true" />
      <span className="seletor-mundo-disco" aria-hidden="true" />
    </button>
  );
}
