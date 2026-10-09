// Prévia de uma remissão (F2, 11.9): o dispositivo citado, lido sem sair do lugar. Celular: folha
// inferior; computador: balão no canto de baixo. Diálogo nativo (foco preso, Esc fecha e devolve o
// foco ao que abriu). "Ir para" empilha a posição de onde se veio; o "voltar" fica no grupo fixo.
import type { ReactNode } from 'react';
import { Dialogo } from '../componentes/Dialogo';

export interface DadosDaPrevia {
  rubrica: string;
  /** O texto vigente já desenhado (nunca HTML solto). */
  texto: ReactNode;
  /** "Revogado.", "Renumerado." etc.; ausente no vigente. */
  aviso?: string;
  /** Notas de vigência do dispositivo citado. */
  notas: readonly string[];
}

export type EstadoDaPrevia = { estado: 'carregando' } | { estado: 'falha' } | DadosDaPrevia;

export function PreviaDaRemissao({
  aberta,
  titulo,
  dados,
  irPara,
  aoFechar,
}: {
  aberta: boolean;
  /** A referência do alvo, que já se sabe antes de o texto chegar. */
  titulo: string;
  dados: EstadoDaPrevia | undefined;
  irPara: () => void;
  aoFechar: () => void;
}) {
  return (
    <Dialogo aberto={aberta} aoFechar={aoFechar} titulo={titulo} classe="dialogo-previa">
      {dados === undefined || ('estado' in dados && dados.estado === 'carregando') ? (
        <p role="status" className="dica">
          Carregando…
        </p>
      ) : 'estado' in dados ? (
        <p role="alert" className="aviso falha">
          Não foi possível ler este dispositivo. Feche e tente de novo.
        </p>
      ) : (
        <div className="previa-remissao">
          {dados.aviso && <p className="aviso-previa">{dados.aviso}</p>}
          {dados.rubrica && <p className="rubrica">{dados.rubrica}</p>}
          <p className="texto-dispositivo">{dados.texto}</p>
          {dados.notas.length > 0 && (
            <ul className="notas-vigencia" aria-label="Notas de vigência">
              {dados.notas.map((nota, i) => (
                <li key={i}>{nota}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="linha-acoes">
        <button type="button" className="principal" onClick={irPara}>
          Ir para {titulo}
        </button>
        <button type="button" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </Dialogo>
  );
}
