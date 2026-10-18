// Log de lote por referência (F4-A, pacote AL): ids e carimbos derivados e a falta da fonte.
import { Id, TsLogico } from '../modelo';
import { reconstruirDoLog } from './log';
import {
  carimboDoLote,
  FonteDoLoteAusente,
  idDoLote,
  OPERACAO_ADESAO,
  type ReferenciaDeAcervo,
} from './lote-acervo';
import type { Alteracao } from './banco';

const BASE = '0199f0a2-1b2c-7d3e-8f40-0123456789ab';

describe('ids do lote', () => {
  it('são UUIDs válidos, únicos, em ordem e reprodutíveis pela base', () => {
    const ids = Array.from({ length: 5000 }, (_, k) => idDoLote(BASE, k));
    expect(ids.every((id) => Id.safeParse(id).success)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
    expect(idDoLote(BASE, 42)).toBe(ids[42]);
    expect(idDoLote('0199f0a2-1b2c-7d3e-8f40-0123456789ac', 0)).not.toBe(ids[0]);
  });

  it('não colidem com ids sequenciais de teste', () => {
    const base = '00000000-0000-7000-8000-000000000005';
    const seq = new Set(
      Array.from({ length: 1000 }, (_, n) => `00000000-0000-7000-8000-${n.toString(16).padStart(12, '0')}`),
    );
    for (let k = 0; k < 1000; k++) expect(seq.has(idDoLote(base, k))).toBe(false);
  });
});

describe('carimbos do lote', () => {
  it('crescem a partir da base e transbordam o contador para o milissegundo seguinte', () => {
    expect(carimboDoLote('0000000001000-000005-abcdef01', 0)).toBe('0000000001000-000005-abcdef01');
    expect(carimboDoLote('0000000001000-000005-abcdef01', 3)).toBe('0000000001000-000008-abcdef01');
    expect(carimboDoLote('0000000001000-999998-abcdef01', 3)).toBe('0000000001001-000001-abcdef01');
    const lista = Array.from({ length: 2000 }, (_, k) => carimboDoLote('0000000001000-999000-abcdef01', k));
    expect(lista.every((c) => TsLogico.safeParse(c).success)).toBe(true);
    expect([...lista].sort()).toEqual(lista);
    expect(new Set(lista).size).toBe(lista.length);
  });
});

describe('reconstruir sem a fonte', () => {
  const ref: ReferenciaDeAcervo = {
    itemId: 'lei-x',
    versao: 3,
    hash: 'a'.repeat(64),
    normaId: '0199f0a2-1b2c-7d3e-8f40-000000000001',
    versaoId: '0199f0a2-1b2c-7d3e-8f40-000000000002',
    base: BASE,
    tsBase: '0000000001000-000000-abcdef01',
    instante: '2026-10-17T12:00:00.000Z',
    quantidade: 2,
  };
  const entrada: Alteracao = {
    seq: 1,
    ts: carimboDoLote(ref.tsBase, 3),
    aparelhoId: '0199f0a2-1b2c-7d3e-8f40-0000000000aa',
    usuarioId: '0199f0a2-1b2c-7d3e-8f40-0000000000bb',
    colecao: 'dispositivos',
    registroId: ref.normaId,
    operacao: OPERACAO_ADESAO,
    dados: { ...ref },
  };

  it('referência sem reidratador é Problema explícito, nunca estado inventado', () => {
    expect(() => reconstruirDoLog([entrada])).toThrow(FonteDoLoteAusente);
    try {
      reconstruirDoLog([entrada]);
    } catch (e) {
      expect(e).toMatchObject({ itemId: 'lei-x', versao: 3, hash: 'a'.repeat(64) });
    }
  });

  it('reidratador que não acha o item também falha, sem gravar meio estado', () => {
    expect(() => reconstruirDoLog([entrada], () => undefined)).toThrow(FonteDoLoteAusente);
  });

  it('conteúdo com quantidade diferente da referência é recusado', () => {
    expect(() =>
      reconstruirDoLog([entrada], () => ({ dispositivos: [], textos: [] })),
    ).toThrow(/não confere/);
  });
});
