// Estimativa em minutos escrita no formulário: número inteiro entre 1 e 600, ou nada (o campo é opcional).
export function estimativaDe(minutos: string): number | undefined {
  const min = Number.parseInt(minutos, 10);
  return Number.isInteger(min) && min >= 1 && min <= 600 ? min : undefined;
}
