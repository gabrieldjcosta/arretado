/** Os últimos 7 dias com revisão (janela móvel, nunca zera); do mais antigo ao mais recente. */
export function DiasDaSemana({ dias }: { dias: readonly boolean[] }) {
  const n = dias.filter(Boolean).length;
  const texto =
    n === 0
      ? 'Nenhum dia nos últimos 7'
      : n === 1
        ? '1 dos últimos 7 dias'
        : `${String(n)} dos últimos 7 dias`;
  return (
    <p className="dias-da-semana">
      <span className="dias-marcas" aria-hidden="true">
        {dias.map((feito, i) => (
          <span key={i} className={feito ? 'dia-marca feito' : 'dia-marca'} />
        ))}
      </span>
      <span>{texto}</span>
    </p>
  );
}
