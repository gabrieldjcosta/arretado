// A linha de parada do Hoje (D-D7, P3): onde a pessoa parou de ler e a caneta encostada na folha.
import { Caneta } from '../componentes/Caneta';
import type { ParadaDaLeitura } from './parada-da-leitura';

/**
 * "Você parou em LEP, art. 112, § 2º" com a hora, e a caneta-cacto de pé na borda de cima da folha
 * do Agora, a ponta encostada nela. A caneta é um objeto da folha (não de um texto): aparece com a
 * folha mesmo sem leitura salva. Quando o Dia é fechado, ela sai daqui e fica no Resumo do Dia
 * (`comCaneta` falso): uma caneta por tela, e ela muda de lugar por salto.
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
          Você parou em <strong>{parada.rotulo}</strong>
          <span className="parada-quando">{parada.quando}</span>
        </p>
      )}
      {comCaneta && <Caneta pose="encostada" className="parada-caneta" />}
    </div>
  );
}
