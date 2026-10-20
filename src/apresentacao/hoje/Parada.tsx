// A linha de parada do Hoje (D-D7, P3; D-D9, Q5): onde retomar a leitura e a caneta encostada na folha.
import { Caneta } from '../componentes/Caneta';
import type { ParadaDaLeitura } from './parada-da-leitura';

/**
 * "Retomar em LEP, art. 112, § 2º" com "salvo hoje, 22h10" embaixo, e a caneta-cacto de vidro a 35° na
 * borda de cima da folha do Agora, a ponta sobre ela. A caneta é um objeto da folha (não de um texto):
 * aparece com a folha mesmo sem leitura salva. Quando o Dia é fechado, ela sai daqui e fica no Resumo
 * do Dia (`comCaneta` falso): uma caneta por tela, e ela muda de lugar por salto. "Você parou em"
 * saiu só daqui: soa como dívida; "Retomar" convida.
 */
export function Parada({
  parada,
  comCaneta = true,
}: {
  parada?: ParadaDaLeitura;
  comCaneta?: boolean;
}) {
  if (parada === undefined && !comCaneta) return null;
  return (
    <div className={comCaneta ? 'parada com-caneta' : 'parada'}>
      {parada !== undefined && (
        <p className="parada-texto">
          Retomar em <strong className="parada-onde">{parada.rotulo}</strong>
          <span className="parada-quando">{parada.quando}</span>
        </p>
      )}
      {comCaneta && <Caneta pose="encostada" className="parada-caneta" />}
    </div>
  );
}
