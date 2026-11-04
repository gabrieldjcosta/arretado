import { useEffect, useRef, useState } from 'react';
import { animar, cancelarAnimacoes, modoAgora } from './anima';
import type { PontoDaEtapa } from '../passos/pontos-da-etapa';
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
        <b>O que você lembra desta etapa?</b> Sem olhar.
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
        <button type="button" className="m-acao m-contorno" onClick={aoMostrar}>
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
/**
 * O resumo como lista, depois do branco: o assunto de cada artigo lido, para marcar o que já tinha escrito ou
 * lembrado. É só da pessoa; nada disso é guardado nem vira nota. Os contadores da etapa ficam na frase de cima.
 */
export function ConferirOResumoM({ pontos }: { pontos: readonly PontoDaEtapa[] }) {
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(new Set());
  const trouxe = marcados.size;
  return (
    <div className="m-evoca-lista" role="group" aria-label="Marque o que você lembrou">
      <p className="m-quieto">Marque o que você lembrou.</p>
      {pontos.map((ponto) => (
        <button
          key={ponto.chave}
          type="button"
          className="m-chip m-evoca-item"
          aria-pressed={marcados.has(ponto.chave)}
          onClick={() => {
            setMarcados((antes) => {
              const depois = new Set(antes);
              if (!depois.delete(ponto.chave)) depois.add(ponto.chave);
              return depois;
            });
          }}
        >
          <b>{ponto.rotulo}</b>
          <span>{ponto.assunto}</span>
        </button>
      ))}
      <p className="m-quieto" role="status" aria-live="polite">
        {trouxe > 0 ? `Você trouxe ${String(trouxe)} de ${String(pontos.length)} de memória.` : ''}
      </p>
    </div>
  );
}
