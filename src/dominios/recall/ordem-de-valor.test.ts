import { describe, expect, it } from 'vitest';
import {
  itensQueCabem,
  minutosDoLote,
  motivoDoItem,
  ordenarPorValor,
  tamanhoDoLote,
  type ItemParaOrdenar,
} from './ordem-de-valor';

const HOJE = '2026-10-25';
const item = (id: string, extra: Partial<ItemParaOrdenar> = {}): ItemParaOrdenar => ({
  id,
  caixa: 3,
  proximaRevisao: HOJE,
  ...extra,
});

describe('ordenarPorValor', () => {
  it('põe a faixa mais alta primeiro e o item sem Ponto no meio', () => {
    const itens = [
      item('baixa', { faixa: 'extra' }),
      item('sem'),
      item('alta', { faixa: 'altissima' }),
      item('media', { faixa: 'media' }),
    ];
    const ids = ordenarPorValor(itens, HOJE).map((i) => i.id);
    expect(ids[0]).toBe('alta');
    expect(ids.at(-1)).toBe('baixa');
    // "sem Ponto" é neutro: empata com "média" e o desempate fixo (id) decide.
    expect(ids.indexOf('media')).toBeLessThan(ids.indexOf('baixa'));
    expect(ids.indexOf('sem')).toBeLessThan(ids.indexOf('baixa'));
  });

  it('na mesma faixa, caixa menor e mais espera sobem', () => {
    const itens = [
      item('caixa5', { caixa: 5 }),
      item('caixa1', { caixa: 1 }),
      item('espera', { caixa: 5, proximaRevisao: '2026-10-20' }),
    ];
    expect(ordenarPorValor(itens, HOJE).map((i) => i.id)).toEqual(['caixa1', 'espera', 'caixa5']);
  });

  it('é estável e não perde item: mesma entrada em outra ordem dá a mesma saída', () => {
    const itens = Array.from({ length: 30 }, (_, n) => item(`i${String(n).padStart(2, '0')}`));
    const embaralhado = [...itens].reverse();
    const a = ordenarPorValor(itens, HOJE).map((i) => i.id);
    const b = ordenarPorValor(embaralhado, HOJE).map((i) => i.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(30);
  });

  it('não muda o item nem a data da Revisão', () => {
    const original = item('x', { proximaRevisao: '2026-10-01' });
    const [saida] = ordenarPorValor([original], HOJE);
    expect(saida).toBe(original);
    expect(saida?.proximaRevisao).toBe('2026-10-01');
  });
});

describe('minutos e itens', () => {
  it('30 s por item: 5, 10, 25 e 45 minutos', () => {
    expect([5, 10, 25, 45].map(itensQueCabem)).toEqual([10, 20, 50, 90]);
    expect(minutosDoLote(20)).toBe(10);
    expect(minutosDoLote(1)).toBe(1);
  });

  it('o lote não passa da fila e minutos × itens fecham', () => {
    expect(tamanhoDoLote(10, 36)).toBe(20);
    expect(tamanhoDoLote(45, 12)).toBe(12);
    expect(tamanhoDoLote(10, 0)).toBe(0);
    expect(minutosDoLote(tamanhoDoLote(25, 100))).toBe(25);
  });

  it('com dois dias fora ou mais, o lote vem menor (metade, ao menos 1)', () => {
    expect(tamanhoDoLote(10, 36, 1)).toBe(20);
    expect(tamanhoDoLote(10, 36, 2)).toBe(10);
    expect(tamanhoDoLote(5, 1, 9)).toBe(1);
  });
});

describe('motivoDoItem', () => {
  it('diz faixa, caixa e espera, sem culpa', () => {
    const m = motivoDoItem(
      item('a', { faixa: 'alta', caixa: 1, proximaRevisao: '2026-10-20' }),
      HOJE,
    );
    expect(m).toBe('Ponto de faixa alta · ainda frágil · esperando há 5 dias');
    expect(motivoDoItem(item('b'), HOJE)).toBe('Sem Ponto ligado · caixa 3 · vence hoje');
    expect(m).not.toMatch(/atras|pendente|dívida/i);
  });
});
