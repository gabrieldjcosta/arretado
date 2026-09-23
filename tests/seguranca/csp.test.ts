import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HTML = readFileSync(join(import.meta.dirname, "..", "..", "index.html"), "utf8");

const diretiva = (nome: string): string => {
  const politica = /content="([^"]*)"/.exec(
    /http-equiv="Content-Security-Policy"[\s\S]*?content="[^"]*"/.exec(HTML)?.[0] ?? "",
  )?.[1];
  const encontrada = politica
    ?.split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${nome} `));
  return encontrada ?? "";
};

describe("CSP do index.html (T8, D18)", () => {
  it("script-src é estrito: é ele que impede a execução de código injetado", () => {
    const scriptSrc = diretiva("script-src");
    expect(scriptSrc).toBe("script-src 'self'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("nada é carregado de origem externa", () => {
    expect(diretiva("default-src")).toBe("default-src 'self'");
    expect(diretiva("connect-src")).toBe("connect-src 'self'");
    expect(diretiva("object-src")).toBe("object-src 'none'");
    expect(diretiva("base-uri")).toBe("base-uri 'self'");
    expect(diretiva("form-action")).toBe("form-action 'self'");
  });

  /**
   * `style-src` tem 'unsafe-inline' por necessidade: atributos `style` aplicados por JavaScript
   * não podem ser autorizados por nonce, e toda biblioteca de interface os usa. Este teste registra
   * a exceção como decisão consciente — e garante que ela não se estenda a origens externas.
   */
  it("style-src permite inline, mas nenhuma origem externa", () => {
    const styleSrc = diretiva("style-src");
    expect(styleSrc).toBe("style-src 'self' 'unsafe-inline'");
    expect(styleSrc).not.toMatch(/https?:/);
  });

  it("não declara frame-ancestors em <meta>, onde o navegador a ignora", () => {
    expect(diretiva("frame-ancestors")).toBe("");
  });
});
