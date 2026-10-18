// Os pontos do Dia (D-D7, P3): Leitura, Cartões e Frases, cada um apagado, aceso pela metade ou aceso.
import { useEffect, useState } from 'react';
import { PontoDeLuz, type EstadoDoPonto } from '../componentes/PontoDeLuz';
import {
  FAMILIAS_DO_DIA,
  ROTULO_DA_FAMILIA,
  TEXTO_DO_ESTADO,
  pontosQueAcenderam,
  type EstadosDosPontos,
} from './pontos';
import type { RetratoDoHoje } from './retrato';
import './estilos-hoje.css';

const CHAVE = 'arretado.pontos-vistos';

interface PontosVistos {
  data: string;
  estados: EstadosDosPontos;
}

const ESTADOS: readonly EstadoDoPonto[] = ['feito', 'atual', 'falta'];

/** O que a pessoa viu da última vez no Hoje; qualquer coisa fora do formato (ou sem armazenamento) vale nada. */
function lerVistos(): PontosVistos | undefined {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto === null) return undefined;
    const lido = JSON.parse(bruto) as Partial<PontosVistos> | null;
    const estados = lido?.estados;
    if (typeof lido?.data !== 'string' || estados === undefined) return undefined;
    const valido = FAMILIAS_DO_DIA.every((f) => ESTADOS.includes(estados[f]));
    return valido ? { data: lido.data, estados } : undefined;
  } catch {
    return undefined;
  }
}

function gravarVistos(vistos: PontosVistos) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(vistos));
  } catch {
    /* sem armazenamento: os pontos só não se animam na próxima visita */
  }
}

/**
 * O andamento de hoje, em três pontos com nome. O estado também vem em texto para o leitor de tela. Um
 * ponto que acendeu desde a última visita ao Hoje (no mesmo dia) acende uma vez; no resto, o Hoje abre
 * quieto. Só informa: nenhum ponto cobra.
 */
export function PontosDoDia({ retrato }: { retrato: RetratoDoHoje | undefined }) {
  const [visto] = useState(lerVistos);
  useEffect(() => {
    if (retrato !== undefined) gravarVistos({ data: retrato.data, estados: retrato.pontos });
  }, [retrato]);

  if (retrato === undefined) return <div className="pontos-do-dia" aria-hidden="true" />;
  const acendem =
    visto?.data === retrato.data ? pontosQueAcenderam(retrato.pontos, visto.estados) : [];
  return (
    <ul className="pontos-do-dia" aria-label="Andamento do Dia">
      {FAMILIAS_DO_DIA.map((familia) => {
        const estado = retrato.pontos[familia];
        return (
          <li key={familia} data-estado={estado}>
            <PontoDeLuz estado={estado} acende={acendem.includes(familia)} />
            <span>{ROTULO_DA_FAMILIA[familia]}</span>
            <span className="visualmente-oculto">, {TEXTO_DO_ESTADO[estado]}</span>
          </li>
        );
      })}
    </ul>
  );
}
