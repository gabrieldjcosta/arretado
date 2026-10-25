// O gerador do Ache o erro sobre o ECA e o Código Penal colados (texto puro, uma linha por
// dispositivo): toda troca aprovada é falsa, mexe num só trecho e cai num trecho tocável antes e
// depois. O relatório (aprovadas e rejeitadas por tipo) sai no console: é a evidência do piloto.
import { describe, expect, it } from 'vitest';
import { aplicarTroca, avaliarTrocas, candidatosDeToque, type TipoDeTroca } from './trocas';

const TEXTOS = import.meta.glob<string>('../../../corpus/normas/*-compilado.colado.txt', {
  query: '?raw',
  import: 'default',
  eager: false,
});

const NORMAS = ['eca', 'cp'] as const;

const cobre = (texto: string, inicio: number, fim: number) =>
  candidatosDeToque(texto).some((c) => c.inicio <= inicio && fim <= c.fim);

describe.each(NORMAS)('trocas sobre o corpus: %s', (norma) => {
  it('toda troca aprovada é falsa, única e tocável; relata o total', async () => {
    const carregar = TEXTOS[`../../../corpus/normas/${norma}-compilado.colado.txt`];
    expect(carregar).toBeDefined();
    const linhas = (await carregar!())
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^(Art\.|§|Parágrafo|[IVXLC]+ -|[a-z]\))/u.test(l));
    const porTipo: Record<TipoDeTroca, number> = {
      numero: 0,
      prazo: 0,
      quantificador: 0,
      absoluto: 0,
      pena: 0,
    };
    let rejeitadas = 0;
    let comTroca = 0;
    for (const texto of linhas) {
      const r = avaliarTrocas(texto);
      rejeitadas += r.rejeitadas;
      if (r.aprovadas.length > 0) comTroca += 1;
      for (const t of r.aprovadas) {
        porTipo[t.tipo] += 1;
        const falsa = aplicarTroca(texto, t);
        expect(falsa, texto).not.toBe(texto);
        expect(texto.slice(t.inicio, t.fim)).toBe(t.original);
        expect(falsa.slice(0, t.inicio) + falsa.slice(t.inicio + t.substituto.length)).toBe(
          texto.slice(0, t.inicio) + texto.slice(t.fim),
        );
        expect(cobre(texto, t.inicio, t.fim), `${texto} › ${t.original}`).toBe(true);
        expect(
          cobre(falsa, t.inicio, t.inicio + t.substituto.length),
          `${falsa} › ${t.substituto}`,
        ).toBe(true);
        // Gramática do número: singular só com 1 ("1 (um) ano", "um dia").
        if (t.tipo === 'numero') {
          const singular = /\b(?:dia|mês|ano|hora|semana)$/u.test(t.substituto);
          const um = /^(?:1 \(|uma?\b)/u.test(t.substituto);
          if (/\b(?:dias?|mês|meses|anos?|horas?|semanas?)$/u.test(t.substituto)) {
            expect(singular, t.substituto).toBe(um);
          }
        }
      }
    }
    const aprovadas = Object.values(porTipo).reduce((a, b) => a + b, 0);
    console.info(
      `[ache-o-erro] ${norma}: ${String(linhas.length)} dispositivos, ${String(comTroca)} com troca, ` +
        `${String(aprovadas)} trocas aprovadas (${Object.entries(porTipo)
          .map(([k, v]) => `${k} ${String(v)}`)
          .join(', ')}), ${String(rejeitadas)} rejeitadas`,
    );
    expect(comTroca).toBeGreaterThan(linhas.length / 10);
  });
});
