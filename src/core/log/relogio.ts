/**
 * Relógio híbrido (T5): carimbo lógico ordenável como texto, composto de milissegundos de parede e
 * um contador que desempata escritas no mesmo milissegundo e absorve relógios de parede atrasados.
 * Formato: `MMMMMMMMMMMMMMM-CCCC` (15 dígitos de ms + 4 de contador), comparável com `<`.
 */
export type TsLogico = string;

const DIGITOS_MS = 15;
const DIGITOS_CONTADOR = 4;
const CONTADOR_MAXIMO = 10 ** DIGITOS_CONTADOR - 1;

export class RelogioHibrido {
  private ultimoMs = 0;
  private contador = 0;

  constructor(private readonly agoraMs: () => number = () => Date.now()) {}

  /** Próximo carimbo, sempre estritamente maior que qualquer um já emitido ou recebido. */
  proximo(): TsLogico {
    const fisico = this.agoraMs();
    if (fisico > this.ultimoMs) {
      this.ultimoMs = fisico;
      this.contador = 0;
    } else {
      this.contador += 1;
      if (this.contador > CONTADOR_MAXIMO) {
        this.ultimoMs += 1;
        this.contador = 0;
      }
    }
    return formatar(this.ultimoMs, this.contador);
  }

  /** Avança ao ver um carimbo de outro aparelho (usado pela sincronização, F4). */
  receber(remoto: TsLogico): void {
    const { ms, contador } = interpretar(remoto);
    if (ms > this.ultimoMs || (ms === this.ultimoMs && contador > this.contador)) {
      this.ultimoMs = ms;
      this.contador = contador;
    }
  }
}

export function formatar(ms: number, contador: number): TsLogico {
  const parteMs = String(ms).padStart(DIGITOS_MS, "0");
  const parteContador = String(contador).padStart(DIGITOS_CONTADOR, "0");
  return `${parteMs}-${parteContador}`;
}

export function interpretar(ts: TsLogico): { ms: number; contador: number } {
  const [ms, contador] = ts.split("-");
  return { ms: Number(ms ?? 0), contador: Number(contador ?? 0) };
}
