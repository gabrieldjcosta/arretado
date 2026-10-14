import { Link } from 'react-router';
import imagemMascote from '../imagens/mascote-estudando.svg';

/** O que fazer agora: uma coisa só em destaque por tela (redesign, fatia 2). */
export function AcaoAgora({
  titulo,
  estimativa,
  rotuloBotao,
  para,
  aoClicar,
  mascote: comMascote = false,
}: {
  titulo: string;
  /** Minutos; aparece como texto ("cerca de 6 min"). */
  estimativa?: number;
  rotuloBotao: string;
  /** Rota de destino: o botão vira link. */
  para?: string;
  aoClicar?: () => void;
  /** O mascote só aparece em pontos estratégicos (Hoje), não em todo cartão. */
  mascote?: boolean;
}) {
  return (
    <section className="acao-agora" aria-label="Agora">
      {comMascote && <img className="agora-mascote" src={imagemMascote} alt="" width={96} />}
      <h2 className="agora-titulo">{titulo}</h2>
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
