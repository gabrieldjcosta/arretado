import { iguais, jsonCanonico } from './json-canonico';

describe('jsonCanonico', () => {
  it('ignora ordem de chaves e campos indefinidos', () => {
    expect(jsonCanonico({ b: 1, a: { d: 2, c: undefined, e: [1, { z: 1, y: 2 }] } })).toBe(
      '{"a":{"d":2,"e":[1,{"y":2,"z":1}]},"b":1}',
    );
    expect(iguais({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(iguais({ a: 1 }, { a: 2 })).toBe(false);
  });
});
