import { ErroDeSanitizacao, sanitizarHtml } from "@core/seguranca/sanitizar";
import { describe, expect, it } from "vitest";
import { HTML_LEGITIMO, PAYLOADS } from "./payloads";

describe("sanitizador (D13, D18)", () => {
  it.each(PAYLOADS)("bloqueia: $nome", ({ html, proibido }) => {
    const { blocos, texto } = sanitizarHtml(html);
    const saida = JSON.stringify({ blocos, texto }).toLowerCase();
    for (const termo of proibido) {
      expect(saida).not.toContain(termo.toLowerCase());
    }
  });

  it("nenhum payload escapa: nada executável sobrevive em nenhum caso", () => {
    // Só a estrutura entregue ao app; `removido` é o relatório do que foi barrado e cita os nomes
    // das tags removidas por definição.
    const saida = PAYLOADS.map((p) => {
      const { blocos, texto } = sanitizarHtml(p.html);
      return JSON.stringify({ blocos, texto });
    })
      .join(" ")
      .toLowerCase();
    for (const marca of ["<script", "javascript:", "onerror", "onload=", "<iframe", "<style"]) {
      expect(saida).not.toContain(marca);
    }
  });

  it("preserva o que tem sentido jurídico: tachado, ênfase e links", () => {
    const { blocos } = sanitizarHtml(HTML_LEGITIMO);

    const vigente = blocos.find((b) => b.texto.startsWith("Art. 9º"));
    expect(vigente?.tachado).toBe(false);

    const anterior = blocos.find((b) => b.texto.includes("redação anterior"));
    expect(anterior?.trechos.some((t) => t.tachado)).toBe(true);

    const comLink = blocos.find((b) => b.texto.includes("Redação dada"));
    expect(comLink?.trechos.some((t) => t.href?.includes("planalto.gov.br"))).toBe(true);

    const comEnfase = blocos.find((b) => b.texto.startsWith("Art. 10"));
    expect(comEnfase?.trechos.some((t) => t.enfase)).toBe(true);

    // Tachado por estilo, e não por <s>: é assim que o Planalto marca parte das revogações.
    const revogado = blocos.find((b) => b.texto.includes("Revogado"));
    expect(revogado?.tachado).toBe(true);
  });

  it("<br> fecha o bloco: cada linha lógica vira um bloco", () => {
    const { blocos } = sanitizarHtml("<p>Primeira linha<br>Segunda linha</p>");
    expect(blocos.map((b) => b.texto)).toEqual(["Primeira linha", "Segunda linha"]);
  });

  it("normaliza espaços, espaço rígido e quebras", () => {
    const { texto } = sanitizarHtml("<p>Art.\n  1º&nbsp;&nbsp; Texto   com    espaços</p>");
    expect(texto).toBe("Art. 1º Texto com espaços");
  });

  it("relata o que foi removido em vez de remover em silêncio", () => {
    const { removido } = sanitizarHtml('<p onclick="x()">a</p><script>b()</script><img src="c">');
    expect(removido.tags).toEqual(expect.arrayContaining(["script", "img"]));
    expect(removido.atributos).toEqual(expect.arrayContaining(["onclick"]));
  });

  it("recusa conteúdo acima do limite por importação", () => {
    expect(() => sanitizarHtml("<p>a</p>".repeat(100), { limite: 50 })).toThrow(ErroDeSanitizacao);
  });

  it("texto sem marcação nenhuma continua funcionando (fallback texto puro, D13)", () => {
    const { blocos } = sanitizarHtml("Art. 1º Primeiro.\nArt. 2º Segundo.");
    expect(blocos).toHaveLength(1);
    expect(blocos[0]?.texto).toBe("Art. 1º Primeiro. Art. 2º Segundo.");
  });
});
