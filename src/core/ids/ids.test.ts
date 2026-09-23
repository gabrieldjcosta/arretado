import { TsLogico } from '../modelo';
import { lerCarimbo, novoId, RelogioLogico } from './index';

const APARELHO = '0199a6c4-3b7e-7c3e-8f00-123456789abc';

describe('novoId', () => {
  it('gera 100 mil ids únicos, válidos e em ordem de criação', () => {
    const ids = Array.from({ length: 100_000 }, novoId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      ids.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id),
      ),
    ).toBe(true);
    expect([...ids].sort()).toEqual(ids);
  });
});

describe('RelogioLogico', () => {
  it('produz carimbos válidos para o modelo', () => {
    const r = new RelogioLogico(APARELHO, () => 1_790_000_000_000);
    expect(TsLogico.safeParse(r.tick()).success).toBe(true);
  });

  it('usa a parte aleatória do id do aparelho', () => {
    const r = new RelogioLogico(APARELHO, () => 1);
    expect(lerCarimbo(r.tick()).aparelho).toBe('56789abc');
  });

  it('é estritamente crescente com relógio parado', () => {
    const r = new RelogioLogico(APARELHO, () => 1_000);
    const carimbos = Array.from({ length: 10_000 }, () => r.tick());
    expect(new Set(carimbos).size).toBe(carimbos.length);
    expect([...carimbos].sort()).toEqual(carimbos);
  });

  it('é crescente mesmo com relógio voltando no tempo', () => {
    let t = 5_000;
    const r = new RelogioLogico(APARELHO, () => t);
    const a = r.tick();
    t = 1_000;
    const b = r.tick();
    expect(b > a).toBe(true);
  });

  it('transborda o contador para o milissegundo seguinte', () => {
    const r = new RelogioLogico(APARELHO, () => 1_000);
    r.observar('0000000001000-999999-00000000');
    const c = lerCarimbo(r.tick());
    expect(c).toMatchObject({ ms: 1_001, contador: 0 });
  });

  it('nunca emite carimbo menor que um observado', () => {
    const r = new RelogioLogico(APARELHO, () => 1_000);
    const remoto = '0000000009000-000005-ffffffff';
    r.observar(remoto);
    expect(r.tick() > remoto).toBe(true);
  });

  it('rejeita aparelho e carimbo inválidos', () => {
    expect(() => new RelogioLogico('x')).toThrow();
    expect(() => lerCarimbo('abc')).toThrow();
  });
});
