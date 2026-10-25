import { describe, expect, it } from 'vitest';
import { aplicarTroca, candidatosDeToque, escolherTroca, gerarTrocas, porExtenso } from './trocas';

const ECA_121_2 =
  'A medida não comporta prazo determinado, devendo sua manutenção ser reavaliada, mediante decisão fundamentada, no máximo a cada seis meses.';
const CP_155 = 'Pena - reclusão, de um a quatro anos, e multa.';
const CP_PAR = 'Pena - detenção, de 3 (três) meses a 1 (um) ano, ou multa.';

describe('porExtenso', () => {
  it('escreve como a lei escreve', () => {
    expect(porExtenso(1, true)).toBe('uma');
    expect(porExtenso(2)).toBe('dois');
    expect(porExtenso(21)).toBe('vinte e um');
    expect(porExtenso(100)).toBe('cem');
    expect(porExtenso(180)).toBe('cento e oitenta');
    expect(porExtenso(360)).toBe('trezentos e sessenta');
    expect(porExtenso(200, true)).toBe('duzentas');
    expect(porExtenso(0)).toBe('');
    expect(porExtenso(1000)).toBe('');
  });
});

describe('gerarTrocas', () => {
  it('troca o extenso do prazo e o quantificador, cada um sozinho', () => {
    const trocas = gerarTrocas(ECA_121_2);
    const substitutos = trocas.map((t) => t.substituto);
    expect(substitutos).toContain('cinco meses');
    expect(substitutos).toContain('sete meses');
    expect(substitutos).toContain('no mínimo');
    for (const t of trocas) {
      const falsa = aplicarTroca(ECA_121_2, t);
      expect(falsa).not.toBe(ECA_121_2);
      // Uma troca só: fora do trecho, o texto é o mesmo.
      expect(falsa.slice(0, t.inicio)).toBe(ECA_121_2.slice(0, t.inicio));
      expect(falsa.slice(t.inicio + t.substituto.length)).toBe(ECA_121_2.slice(t.fim));
    }
  });

  it('troca algarismo e extenso juntos e mantém o intervalo crescente', () => {
    const trocas = gerarTrocas(CP_PAR);
    const numeros = trocas.filter((t) => t.tipo === 'numero').map((t) => t.substituto);
    expect(numeros).toContain('2 (dois) meses');
    expect(numeros).toContain('4 (quatro) meses');
    // "1 (um) ano" só sobe (não há "0"), e a unidade concorda.
    expect(numeros).toContain('2 (dois) anos');
    expect(numeros).toHaveLength(3);
    expect(trocas.map((t) => t.substituto)).toContain('reclusão');
    expect(trocas.map((t) => t.substituto)).not.toContain('multa');
  });

  it('não deixa "de um a quatro anos" virar decrescente', () => {
    const trocas = gerarTrocas(CP_155).filter((t) => t.tipo === 'numero');
    const substitutos = trocas.map((t) => t.substituto);
    expect(substitutos).toEqual(['dois', 'cinco anos', 'três anos']); // nunca "de quatro a quatro"
  });

  it('rejeita o par cujo extenso não bate com o algarismo', () => {
    expect(gerarTrocas('prazo de 30 (vinte) dias').filter((t) => t.tipo === 'numero')).toEqual([]);
  });

  it('guarda a maiúscula inicial e troca termos absolutos', () => {
    const trocas = gerarTrocas('Salvo disposição em contrário, a pena nunca excederá o teto.');
    expect(trocas.map((t) => t.substituto)).toEqual(['Inclusive', 'sempre']);
  });

  it('é determinístico e sem troca segura devolve vazio', () => {
    expect(gerarTrocas(ECA_121_2)).toEqual(gerarTrocas(ECA_121_2));
    expect(gerarTrocas('O juiz decidirá.')).toEqual([]);
    expect(escolherTroca('O juiz decidirá.', 3)).toBeUndefined();
    expect(escolherTroca(ECA_121_2, 1)).toEqual(gerarTrocas(ECA_121_2)[1]);
  });
});

describe('candidatosDeToque', () => {
  it('cobre toda troca e também o substituto, no texto trocado', () => {
    for (const texto of [
      ECA_121_2,
      CP_PAR,
      'Salvo disposição em contrário, a pena nunca excederá.',
    ]) {
      for (const t of gerarTrocas(texto)) {
        expect(
          candidatosDeToque(texto).some((c) => c.inicio <= t.inicio && t.fim <= c.fim),
          `${texto} › ${t.original}`,
        ).toBe(true);
        const falsa = aplicarTroca(texto, t);
        const fim = t.inicio + t.substituto.length;
        expect(
          candidatosDeToque(falsa).some((c) => c.inicio <= t.inicio && fim <= c.fim),
          `${falsa} › ${t.substituto}`,
        ).toBe(true);
      }
    }
  });
});
