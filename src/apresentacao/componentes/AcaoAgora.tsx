import { Link } from 'react-router';

/** O que fazer agora: uma coisa só em destaque por tela (redesign, fatia 2). */
export function AcaoAgora({
  titulo,
  estimativa,
  rotuloBotao,
  para,
  aoClicar,
}: {
  titulo: string;
  /** Minutos; aparece como texto ("cerca de 6 min"). */
  estimativa?: number;
  rotuloBotao: string;
  /** Rota de destino: o botão vira link. */
  para?: string;
  aoClicar?: () => void;
}) {
  return (
    <section className="acao-agora" aria-label="Agora">
      <h2 className="agora-titulo">
        <span className="agora-marca">{titulo}</span>
      </h2>
      {estimativa !== undefined && <p className="agora-estimativa">cerca de {estimativa} min</p>}
      {para !== undefined ? (
        <Link to={para} className="botao principal">
          {rotuloBotao}
        </Link>
      ) : (
        <button type="button" className="principal" onClick={aoClicar}>
          {rotuloBotao}
        </button>
      )}
    </section>
  );
}
