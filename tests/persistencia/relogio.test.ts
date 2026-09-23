import { formatar, interpretar, RelogioHibrido } from "@core/log/relogio";
import { describe, expect, it } from "vitest";

describe("relógio híbrido (T5)", () => {
  it("emite carimbos estritamente crescentes mesmo no mesmo milissegundo", () => {
    const relogio = new RelogioHibrido(() => 1_000);
    const a = relogio.proximo();
    const b = relogio.proximo();
    const c = relogio.proximo();
    expect(a < b && b < c).toBe(true);
    expect(interpretar(a)).toEqual({ ms: 1000, contador: 0 });
    expect(interpretar(c)).toEqual({ ms: 1000, contador: 2 });
  });

  it("não retrocede quando o relógio de parede volta", () => {
    let agora = 5_000;
    const relogio = new RelogioHibrido(() => agora);
    const antes = relogio.proximo();
    agora = 4_000;
    const depois = relogio.proximo();
    expect(antes < depois).toBe(true);
    expect(interpretar(depois).ms).toBe(5_000);
  });

  it("avança ao receber carimbo remoto maior e ignora menor", () => {
    const relogio = new RelogioHibrido(() => 1_000);
    relogio.receber(formatar(9_000, 3));
    const proximo = relogio.proximo();
    expect(interpretar(proximo)).toEqual({ ms: 9000, contador: 4 });
    relogio.receber(formatar(100, 0));
    expect(interpretar(relogio.proximo()).ms).toBe(9_000);
  });

  it("carimbos de tamanhos fixos comparam corretamente como texto", () => {
    expect(formatar(999, 0) < formatar(1_000, 0)).toBe(true);
    expect(formatar(1_000, 9) < formatar(1_000, 10)).toBe(true);
  });
});
