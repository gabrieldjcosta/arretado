import { describe, expect, it } from 'vitest';
import { ocultosDosGrifos, sugerirOcultos } from './sugestao';

const trechos = (texto: string) => sugerirOcultos(texto).map((o) => texto.slice(o.inicio, o.fim));

describe('sugerirOcultos', () => {
  it('pega prazos, números, vedações e negações', () => {
    expect(trechos('O prazo é de 30 dias, vedada a prorrogação.')).toEqual(['30 dias', 'vedada']);
    expect(trechos('Não é cabível recurso após cinco anos.')).toEqual([
      'Não',
      'é cabível',
      'cinco anos',
    ]);
    expect(trechos('Aprovação por dois terços; art. 5º.')).toEqual(['dois terços']);
  });

  it('não parte palavras com acento nem pega o "não" dentro de outra palavra', () => {
    expect(trechos('Nação, nãozinho e inadmissível.')).toEqual(['inadmissível']);
  });

  it('limita o total e dá preferência a números e prazos', () => {
    const t = 'não não não não não não não 10 dias';
    const achados = trechos(t);
    expect(achados).toHaveLength(6);
    expect(achados).toContain('10 dias');
  });

  it('texto sem nada a sugerir volta vazio', () => {
    expect(sugerirOcultos('A lei vale em todo o território.')).toEqual([]);
  });
});

describe('ocultosDosGrifos', () => {
  const ancora = (texto: string, inicio: number) => ({
    texto,
    inicio,
    fim: inicio + texto.length,
  });
  it('desloca os grifos pelo aparo e ignora nota e pendente', () => {
    const gravado = '  Prazo de dez dias úteis.';
    const { texto, ocultos } = ocultosDosGrifos(gravado, [
      { tipo: 'grifo', status: 'valida', ancora: ancora('dez dias', 11) },
      { tipo: 'nota', status: 'valida', ancora: ancora('Prazo', 2) },
      { tipo: 'grifo', status: 'pendente', ancora: ancora('úteis', 20) },
    ]);
    expect(texto).toBe('Prazo de dez dias úteis.');
    expect(ocultos.map((o) => texto.slice(o.inicio, o.fim))).toEqual(['dez dias']);
  });
});
