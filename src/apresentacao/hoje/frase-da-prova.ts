import { PASSADA_FINAL_DIAS } from '../../dominios/recall/agendamento';

const dias = (n: number) => (n === 1 ? '1 dia' : `${String(n)} dias`);

/** A frase do dia: quantos dias faltam e quando começa a passada final pelos Pontos mais cobrados. */
export function fraseDaProva(faltam: number): string | undefined {
  if (faltam < 0) return undefined;
  if (faltam === 0) return 'A prova é hoje.';
  const ate = faltam - PASSADA_FINAL_DIAS;
  const falta = faltam === 1 ? 'Falta' : 'Faltam';
  if (ate > 0)
    return `${falta} ${dias(faltam)} para a prova. A passada final começa em ${dias(ate)}.`;
  return `${falta} ${dias(faltam)} para a prova. A passada final está em andamento.`;
}
