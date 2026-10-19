import { Link } from 'react-router';
import { BarraFina } from '../componentes/BarraFina';
import { Caneta } from '../componentes/Caneta';

/**
 * O topo das duas revisões (cartões e frases): "Sair", o andamento da rodada e, no canto, a caneta
 * encostada na borda do cartão atual (D-D7, P5). É a única caneta da tela e fica fora do cartão: a
 * passagem de um cartão ao seguinte não a move.
 */
export function TopoDaRevisao({
  sair,
  valor,
  max,
  rotulo,
}: {
  sair: string;
  valor: number;
  max: number;
  rotulo: string;
}) {
  return (
    <div className="topo-drill">
      <Link to={sair} className="botao botao-texto">
        Sair
      </Link>
      <BarraFina valor={valor} max={max} rotulo={rotulo} />
      <Caneta pose="encostada" className="topo-caneta" />
    </div>
  );
}
