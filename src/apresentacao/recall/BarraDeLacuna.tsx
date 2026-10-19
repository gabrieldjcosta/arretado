import { useState } from 'react';
import type { Intervalo } from '../../core/modelo';
import { normalizarOcultos } from '../../dominios/recall/servico';
import { sugerirOcultos } from '../../dominios/recall/sugestao';

/**
 * Sob o editor de lacuna: "Sugerir lacunas" esconde por regra números, prazos, vedações e negações
 * (a pessoa desfaz o que não quer) e, com mais de um trecho, "Um cartão por trecho".
 */
export function BarraDeLacuna({
  texto,
  ocultos,
  aoMudar,
  separados,
  aoSeparar,
}: {
  texto: string;
  ocultos: readonly Intervalo[];
  aoMudar: (ocultos: Intervalo[]) => void;
  /** Sem isto, não há a opção de um cartão por trecho. */
  separados?: boolean;
  aoSeparar?: (separados: boolean) => void;
}) {
  const [semSugestao, setSemSugestao] = useState(false);
  return (
    <div className="barra-de-lacuna">
      <button
        type="button"
        className="botao botao-texto"
        onClick={() => {
          const achados = sugerirOcultos(texto);
          setSemSugestao(achados.length === 0);
          if (achados.length > 0) aoMudar(normalizarOcultos(texto, [...ocultos, ...achados]));
        }}
      >
        Sugerir lacunas
      </button>
      {aoSeparar && ocultos.length > 1 && (
        <label className="lacuna-separados">
          <input
            type="checkbox"
            checked={separados ?? false}
            onChange={(e) => {
              aoSeparar(e.target.checked);
            }}
          />
          Um cartão por trecho
        </label>
      )}
      <p role="status" className={semSugestao ? 'dica' : 'visualmente-oculto'}>
        {semSugestao ? 'Nada a sugerir neste texto. Selecione o que quer esconder.' : ''}
      </p>
    </div>
  );
}
