// Lembrete discreto de backup (revisão de design, §7): uma linha no Hoje, nunca bloqueia.
// Decisão pura: sem relógio nem armazenamento aqui.

export const DIAS_SEM_BACKUP = 7;
export const DIAS_DE_DISPENSA = 7;
const DIA_MS = 86_400_000;

export interface EntradaDoLembrete {
  /** Instante ISO do último pacote integral gerado, ou `null` se nunca. */
  ultimoBackup: string | null;
  /** Há algo a perder (erros ou cartões). Sem dados, não há o que lembrar. */
  haDados: boolean;
  agora: Date;
  /** Instante ISO até quando a pessoa dispensou o aviso, se dispensou. */
  dispensadoAte: string | null;
}

export type Lembrete = { mostrar: false } | { mostrar: true; dias: number | null };

/** `dias` = há quantos dias foi o último backup; `null` = nunca fez. */
export function lembreteDeBackup(e: EntradaDoLembrete): Lembrete {
  if (!e.haDados) return { mostrar: false };
  if (e.dispensadoAte !== null && new Date(e.dispensadoAte).getTime() > e.agora.getTime()) {
    return { mostrar: false };
  }
  if (e.ultimoBackup === null) return { mostrar: true, dias: null };
  const dias = Math.floor((e.agora.getTime() - new Date(e.ultimoBackup).getTime()) / DIA_MS);
  return dias >= DIAS_SEM_BACKUP ? { mostrar: true, dias } : { mostrar: false };
}

export function dispensarPorDias(agora: Date): string {
  return new Date(agora.getTime() + DIAS_DE_DISPENSA * DIA_MS).toISOString();
}
