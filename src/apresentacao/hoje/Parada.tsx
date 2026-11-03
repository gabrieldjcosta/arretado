// A linha de parada do Hoje (D-D7, P3): onde retomar a leitura. A caneta que ficava encostada na folha
// do Agora saiu (D-D12): ela é só o ícone do app.
import type { ParadaDaLeitura } from './parada-da-leitura';

/**
 * "Retomar em LEP, art. 112, § 2º" com "salvo hoje, 22h10" embaixo. "Você parou em" saiu: soa como
 * dívida; "Retomar" convida. Sem leitura salva não há linha.
 */
export function Parada({ parada }: { parada?: ParadaDaLeitura }) {
  if (parada === undefined) return null;
  return (
    <div className="parada">
      <p className="parada-texto">
        Retomar em <strong className="parada-onde">{parada.rotulo}</strong>
        <span className="parada-quando">{parada.quando}</span>
      </p>
    </div>
  );
}
