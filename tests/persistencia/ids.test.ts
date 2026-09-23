import { ehId, novoId } from "@core/ids";
import { describe, expect, it } from "vitest";

describe("ids (T4)", () => {
  it("gera UUIDv7 válidos", () => {
    const id = novoId();
    expect(ehId(id)).toBe(true);
    expect(ehId("nao-e-id")).toBe(false);
    expect(ehId("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(false); // v4
  });

  it("ids gerados em sequência ordenam por tempo como texto", async () => {
    const primeiro = novoId();
    await new Promise((r) => setTimeout(r, 2));
    const segundo = novoId();
    expect(primeiro < segundo).toBe(true);
  });

  it("não repete em lote", () => {
    const lote = new Set(Array.from({ length: 5000 }, () => novoId()));
    expect(lote.size).toBe(5000);
  });
});
