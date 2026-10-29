import { PASSADA_FINAL_DIAS } from '../../dominios/recall/agendamento';

const dias = (n: number) => `${String(n)} dias`;
const formatar = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

/** A frase do dia com a data da prova (`AAAA-MM-DD`) e quantos dias faltam; nada depois da prova. */
export function fraseDaProva(faltam: number, data: string): string | undefined {
  if (faltam < 0) return undefined;
  if (faltam === 0) return 'A prova objetiva é hoje.';
  if (faltam === 1) return 'Prova objetiva amanhã.';
  if (faltam <= PASSADA_FINAL_DIAS)
    return `Prova objetiva em ${dias(faltam)}. Os pontos mais cobrados estão voltando.`;
  return `Prova objetiva em ${formatar(data)}, daqui a ${dias(faltam)}.`;
}
