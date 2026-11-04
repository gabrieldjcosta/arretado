import type { Cartao } from '../../core/modelo';
import {
  frenteDaRevisao,
  lacunaCresceu,
  nivelDaLacuna,
  ocultosDoNivel,
} from './lacuna-progressiva';
import { agendar } from './agendamento';
import { textoComLacunas } from './servico';

const TEXTO = 'Matar alguém: pena de reclusão, de seis a vinte anos.';
const BASE = [{ inicio: TEXTO.indexOf('reclusão'), fim: TEXTO.indexOf('reclusão') + 8 }];

const cartao = (caixa: number, extra: Partial<Cartao> = {}): Cartao =>
  ({
    frente: textoComLacunas(TEXTO, BASE),
    verso: TEXTO,
    tipo: 'lacuna',
    ocultos: BASE,
    caixa,
    ...extra,
  }) as Cartao;

describe('nivelDaLacuna', () => {
  it('caixa 1 é o que a pessoa escolheu; cada caixa a mais sobe um nível, até o último', () => {
    expect([1, 2, 3, 4, 5, 6].map((c) => nivelDaLacuna(c))).toEqual([0, 1, 2, 3, 3, 3]);
  });
});

describe('ocultosDoNivel', () => {
  it('o nível 0 é a escolha da pessoa; cada nível esconde mais e nunca solta o que estava escondido', () => {
    const tamanhos = [0, 1, 2, 3].map((n) =>
      ocultosDoNivel(TEXTO, BASE, n).reduce((s, i) => s + i.fim - i.inicio, 0),
    );
    expect(tamanhos[0]).toBe(8);
    expect(tamanhos[1]).toBeGreaterThan(tamanhos[0]!);
    expect(tamanhos[2]).toBeGreaterThan(tamanhos[1]!);
    expect(tamanhos[3]).toBeGreaterThan(tamanhos[2]!);
    for (const n of [1, 2, 3]) {
      const o = ocultosDoNivel(TEXTO, BASE, n);
      expect(o.some((i) => i.inicio <= BASE[0]!.inicio && i.fim >= BASE[0]!.fim)).toBe(true);
    }
  });

  it('no último nível só sobram as palavras curtas e a pontuação; é determinístico', () => {
    const frente = textoComLacunas(TEXTO, ocultosDoNivel(TEXTO, BASE, 3));
    expect(frente).not.toMatch(/Matar|alguém|reclusão|vinte/);
    expect(frente).toContain('de seis a');
    expect(ocultosDoNivel(TEXTO, BASE, 2)).toEqual(ocultosDoNivel(TEXTO, BASE, 2));
  });

  it('texto sem palavra de conteúdo livre não ganha lacuna extra', () => {
    expect(ocultosDoNivel('de seis a', [{ inicio: 0, fim: 2 }], 3)).toEqual([
      { inicio: 0, fim: 2 },
    ]);
  });
});

describe('cartão com irmão', () => {
  it('para um nível antes do máximo, e o nível 3 só existe sem irmão', () => {
    expect([1, 2, 3, 4, 6].map((c) => nivelDaLacuna(c, true))).toEqual([0, 1, 2, 2, 2]);
    expect(frenteDaRevisao(cartao(6), true)).not.toBe(frenteDaRevisao(cartao(6), false));
    expect(frenteDaRevisao(cartao(3), true)).toBe(frenteDaRevisao(cartao(3), false));
  });
});

describe('números primeiro', () => {
  it('o número, de qualquer tamanho, some no primeiro nível, antes das palavras longas', () => {
    const t = 'A pena aumenta de 16% e o prazo é de 30 dias, conforme regulamento posterior.';
    const frente = textoComLacunas(t, ocultosDoNivel(t, [{ inicio: 0, fim: 1 }], 1));
    expect(frente).not.toMatch(/16|30/);
    expect(frente).toContain('regulamento');
  });
});

describe('frenteDaRevisao', () => {
  it('na caixa 1 é a frente guardada; nas seguintes, a lacuna cresce', () => {
    const um = cartao(1);
    expect(frenteDaRevisao(um)).toBe(um.frente);
    expect(lacunaCresceu(um)).toBe(false);
    const tres = cartao(3);
    expect(frenteDaRevisao(tres)).not.toBe(tres.frente);
    expect(lacunaCresceu(tres)).toBe(true);
  });

  it('errar derruba a caixa (pelo agendamento) e a lacuna encolhe de volta', () => {
    const { caixaDepois } = agendar(
      { caixa: 4, proximaRevisao: '2026-09-23' },
      'errei',
      '2026-09-23',
    );
    expect(caixaDepois).toBe(1);
    expect(frenteDaRevisao(cartao(4))).not.toBe(cartao(4).frente);
    expect(frenteDaRevisao(cartao(caixaDepois))).toBe(cartao(1).frente);
  });

  it('cartão que não é lacuna, ou com a frente editada, fica como está', () => {
    expect(frenteDaRevisao(cartao(4, { tipo: 'pergunta' }))).toBe(cartao(4).frente);
    const editado = cartao(4, { frente: 'Frente que a pessoa reescreveu' });
    expect(frenteDaRevisao(editado)).toBe('Frente que a pessoa reescreveu');
    expect(frenteDaRevisao(cartao(4, { verso: null }))).toBe(cartao(4).frente);
  });
});
