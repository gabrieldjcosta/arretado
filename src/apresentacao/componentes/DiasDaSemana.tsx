import { PontoDeLuz } from './PontoDeLuz';

/**
 * Os últimos 7 dias com revisão (janela móvel, nunca zera); do mais antigo ao mais recente. A
 * semana só aparece depois do primeiro Dia com revisão: antes disso o vazio não vira cobrança, e
 * nunca há um número à vista (as marcas acesas já dizem; o número fica para o leitor de tela).
 */
export function DiasDaSemana({ dias }: { dias: readonly boolean[] }) {
  const n = dias.filter(Boolean).length;
  if (n === 0) return null;
  const texto = n === 1 ? '1 dos últimos 7 dias' : `${String(n)} dos últimos 7 dias`;
  return (
    <p className="dias-da-semana">
      <span className="dias-marcas" aria-hidden="true">
        {dias.map((feito, i) => (
          <PontoDeLuz key={i} estado={feito ? 'feito' : 'falta'} />
        ))}
      </span>
      <span aria-hidden="true">Últimos 7 dias</span>
      <span className="visualmente-oculto">{texto}</span>
    </p>
  );
}
