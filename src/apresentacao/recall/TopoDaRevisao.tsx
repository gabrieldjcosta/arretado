import { Link } from 'react-router';
import { BarraFina } from '../componentes/BarraFina';

/**
 * O topo das duas revisões (cartões e frases): "Sair" e o andamento da rodada (D-D7, P5). A caneta
 * encostada que ficava no canto saiu (D-D12).
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
    </div>
  );
}
