import { v7 } from 'uuid';

/** Novo identificador estável (UUIDv7: único, ordenável por tempo; T6). */
export function novoId(): string {
  return v7();
}

/**
 * Relógio lógico híbrido (T7). Carimbo `mmmmmmmmmmmmm-cccccc-aaaaaaaa`:
 * milissegundos (13 dígitos), contador (6 dígitos) e sufixo do Aparelho (8 hex).
 * A ordem lexicográfica dos carimbos é a ordem das alterações, mesmo que o
 * relógio do aparelho volte no tempo.
 */
export class RelogioLogico {
  private ultimoMs = 0;
  private contador = 0;
  private readonly sufixo: string;

  constructor(
    aparelhoId: string,
    private readonly agora: () => number = Date.now,
  ) {
    const hex = aparelhoId.replace(/-/g, '').toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error('aparelhoId inválido para o relógio lógico');
    // Parte aleatória do UUID; o início do UUIDv7 é tempo e colidiria entre aparelhos.
    this.sufixo = hex.slice(-8);
  }

  /** Carimbo para uma alteração local. */
  tick(): string {
    const fisico = this.agora();
    if (fisico > this.ultimoMs) {
      this.ultimoMs = fisico;
      this.contador = 0;
    } else {
      this.avancarContador();
    }
    return this.formatar();
  }

  /** Incorpora um carimbo recebido (restauração ou sincronização) para nunca emitir um menor. */
  observar(carimbo: string): void {
    const lido = lerCarimbo(carimbo);
    if (lido.ms > this.ultimoMs) {
      this.ultimoMs = lido.ms;
      this.contador = lido.contador;
    } else if (lido.ms === this.ultimoMs && lido.contador > this.contador) {
      this.contador = lido.contador;
    }
  }

  private avancarContador(): void {
    this.contador += 1;
    if (this.contador > 999_999) {
      this.ultimoMs += 1;
      this.contador = 0;
    }
  }

  private formatar(): string {
    return `${String(this.ultimoMs).padStart(13, '0')}-${String(this.contador).padStart(6, '0')}-${this.sufixo}`;
  }
}

export function lerCarimbo(carimbo: string): { ms: number; contador: number; aparelho: string } {
  const m = /^(\d{13})-(\d{6})-([0-9a-f]{8})$/.exec(carimbo);
  if (!m) throw new Error(`Carimbo lógico inválido: ${carimbo}`);
  return { ms: Number(m[1]), contador: Number(m[2]), aparelho: m[3] ?? '' };
}
