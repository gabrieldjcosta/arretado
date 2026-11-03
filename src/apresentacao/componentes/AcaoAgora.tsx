import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** O que fazer agora: uma coisa só em destaque por tela (redesign, fatia 2; a folha do Agora). */
export function AcaoAgora({
  titulo,
  motivo,
  estimativa,
  rotuloBotao,
  para,
  aoClicar,
  aoEscolherOutra,
  emEvidencia,
  tempo,
  children,
}: {
  titulo: string;
  /** Por que esta ação, em linha secundária (o título fica no verbo). */
  motivo?: string;
  /** Minutos; aparece como texto ("cerca de 6 min"). */
  estimativa?: number;
  rotuloBotao: string;
  /** Rota de destino: o botão vira link. */
  para?: string;
  aoClicar?: () => void;
  /** "Escolher outra coisa": o botão-texto ao lado do botão de vidro, dentro da folha (Hoje). */
  aoEscolherOutra?: () => void;
  /**
   * Leva o contorno de evidência (D-D13): só o Agora do Hoje, o único elemento que a pessoa deve olhar
   * agora. O Agora das outras telas (Fixar, mapa da norma, plano) fica sem o anel.
   */
  emEvidencia?: boolean;
  /**
   * "tenho outro tempo": o link ao lado da estimativa, que mostra e esconde o painel (`children`) onde
   * a pessoa diz quanto tempo tem (Hoje, AP-01; D-D16). `idDoPainel` é o `id` do painel.
   */
  tempo?: { aberto: boolean; idDoPainel: string; aoAlternar: () => void };
  /** O painel dos minutos: fica sempre no DOM (escondido quando recolhido) para o link apontar para ele. */
  children?: ReactNode;
}) {
  const linkDoTempo =
    tempo === undefined ? null : (
      <button
        type="button"
        className="botao-texto agora-tempo"
        aria-expanded={tempo.aberto}
        aria-controls={tempo.idDoPainel}
        onClick={tempo.aoAlternar}
      >
        tenho outro tempo
      </button>
    );
  return (
    <section
      className={emEvidencia === true ? 'acao-agora evidencia' : 'acao-agora'}
      aria-label="Agora"
    >
      <h2 className="agora-titulo">{titulo}</h2>
      {motivo !== undefined && <p className="agora-motivo">{motivo}</p>}
      {(estimativa !== undefined || linkDoTempo !== null) && (
        <p className="agora-estimativa">
          {estimativa !== undefined && <span>cerca de {estimativa} min</span>}
          {linkDoTempo}
        </p>
      )}
      {children}
      <div className="agora-acoes">
        {para !== undefined ? (
          <Link to={para} className="botao principal">
            {rotuloBotao}
          </Link>
        ) : (
          <button type="button" className="principal" onClick={aoClicar}>
            {rotuloBotao}
          </button>
        )}
        {aoEscolherOutra !== undefined && (
          <button type="button" className="botao-texto agora-outra" onClick={aoEscolherOutra}>
            Escolher outra coisa
          </button>
        )}
      </div>
    </section>
  );
}
