// Datas civis no fuso do usuário (T14): "hoje" não vira à meia-noite UTC (21 h em Brasília).

export const FUSO_PADRAO = 'America/Sao_Paulo';

const formatadores = new Map<string, Intl.DateTimeFormat>();

function formatador(fuso: string): Intl.DateTimeFormat {
  let f = formatadores.get(fuso);
  if (!f) {
    // en-CA formata como AAAA-MM-DD.
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatadores.set(fuso, f);
  }
  return f;
}

/** Data civil `AAAA-MM-DD` de um instante no fuso indicado. */
export function dataCivil(instante: Date, fuso = FUSO_PADRAO): string {
  return formatador(fuso).format(instante);
}

/** Soma dias a uma data civil (aritmética de calendário, sem fuso). */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(a, m - 1, d + dias));
  return utc.toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas civis (`b - a`). */
export function diferencaEmDias(a: string, b: string): number {
  const ms = (s: string) => {
    const [ano, mes, dia] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

/** Hora civil `HH:mm` de um instante no fuso indicado. */
export function horaCivil(instante: Date, fuso = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: fuso,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante);
}
