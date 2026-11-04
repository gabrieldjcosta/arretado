import { useEffect, useRef, useState } from 'react';
import { animar, cancelarAnimacoes, modoAgora } from './anima';
import { SetaM } from './IconesM';

/** Quanto a barra leva para esvaziar: um convite, não um prazo. Passar dela não faz nada. */
export const SEGUNDOS_DO_BRANCO = 30;

/**
 * O pouso em branco: antes do resumo, uma página sem pista onde a pessoa escreve o que lembra da etapa
 * (evocação livre). O texto fica na tela e não é guardado. "Mostrar o resumo" abre a lista de fatos; "Pular"
 * leva ao resumo de sempre, com um toque e sem custo.
 */
export function EvocacaoM({ aoMostrar, aoPular }: { aoMostrar: () => void; aoPular: () => void }) {
  const barra = useRef<HTMLElement>(null);
  const [comBarra] = useState(() => modoAgora() !== 'reduzido');
  useEffect(() => {
    const el = barra.current;
    if (!el) return undefined;
    void animar(el, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      duration: SEGUNDOS_DO_BRANCO * 1000,
      easing: 'linear',
    });
    return () => {
      cancelarAnimacoes(el);
    };
  }, []);
  return (
    <div className="m-evoca" data-pouso-em-branco="">
      <label className="m-rotulo-campo" htmlFor="m-evoca-texto">
        <b>O que você lembra desta etapa?</b> Escreva sem olhar. Palavras soltas bastam.
      </label>
      <textarea
        id="m-evoca-texto"
        className="m-campo"
        rows={3}
        placeholder="Do jeito que vier"
        spellCheck={false}
        autoComplete="off"
      />
      {comBarra && (
        <div className="m-evoca-barra" aria-hidden="true">
          <i ref={barra} />
        </div>
      )}
      <div className="m-evoca-botoes">
        <button type="button" className="m-acao" onClick={aoMostrar}>
          Mostrar o resumo
          <SetaM />
        </button>
        <button type="button" className="m-chip" onClick={aoPular}>
          Pular
        </button>
      </div>
    </div>
  );
}

/**
 * O resumo como lista, depois do branco: a pessoa marca o que já tinha escrito ou lembrado. É só dela; nada
 * disso é guardado nem vira nota.
 */
export function ConferirOResumoM({ fatos }: { fatos: readonly string[] }) {
  const [marcados, setMarcados] = useState<ReadonlySet<number>>(new Set());
  const trouxe = marcados.size;
  return (
    <fieldset className="m-evoca-lista">
      <legend className="m-quieto">Marque o que você lembrou.</legend>
      {fatos.map((fato, i) => (
        <label key={fato} className="m-evoca-item">
          <input
            type="checkbox"
            checked={marcados.has(i)}
            onChange={(e) => {
              setMarcados((antes) => {
                const depois = new Set(antes);
                if (e.target.checked) depois.add(i);
                else depois.delete(i);
                return depois;
              });
            }}
          />
          <span>{fato.replace(/[.\s]+$/, '')}.</span>
        </label>
      ))}
      <p className="m-quieto" role="status" aria-live="polite">
        {trouxe > 0 ? `Você trouxe ${String(trouxe)} de ${String(fatos.length)} de memória.` : ''}
      </p>
    </fieldset>
  );
}
