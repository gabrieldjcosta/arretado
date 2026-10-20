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
}) {
  return (
    <section className="acao-agora" aria-label="Agora">
      <h2 className="agora-titulo">{titulo}</h2>
      {motivo !== undefined && <p className="agora-motivo">{motivo}</p>}
      {estimativa !== undefined && <p className="agora-estimativa">cerca de {estimativa} min</p>}
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
