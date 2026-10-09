/** Progresso em barra fina; o texto "3 de 10" ao lado, para não depender só da cor. */
export function BarraFina({ valor, max, rotulo }: { valor: number; max: number; rotulo: string }) {
  const teto = Math.max(0, Math.floor(max));
  const atual = Math.min(Math.max(0, Math.floor(valor)), teto);
  const pct = teto === 0 ? 0 : (atual / teto) * 100;
  return (
    <div className="barra-fina">
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuenow={atual}
        aria-valuemin={0}
        aria-valuemax={teto}
        className="barra-fina-trilho"
      >
        <span className="barra-fina-cheia" style={{ width: `${String(pct)}%` }} />
      </div>
      <span className="barra-fina-texto">
        {atual} de {teto}
      </span>
    </div>
  );
}
