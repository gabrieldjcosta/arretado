import { criarResolvedorDeRemissoes } from './remissoes';

const trechos = (texto: string) => [{ texto }];
const ENDERECOS = new Map([
  ['art3', 3],
  ['art84', 84],
  ['art84.incXIX', 85],
  ['art2', 2],
]);
const indice = (e: string) => ENDERECOS.get(e);

describe('remissões que a norma resolve (11.9)', () => {
  it('só as internas cujo endereço existe; a inexistente e a de outra norma ficam texto comum', () => {
    const resolver = criarResolvedorDeRemissoes(indice);
    const texto = 'nos termos do art. 84, XIX; veja o art. 99; e o art. 3º do Código Penal';
    const lista = resolver(trechos(texto), 'art2');
    expect(lista.map((r) => texto.slice(r.inicio, r.fim))).toEqual(['art. 84, XIX']);
    expect(lista[0]?.alvo).toBe(85);
  });

  it('o ancestral mais próximo não vale (seria uma promessa que o texto não fez)', () => {
    const resolver = criarResolvedorDeRemissoes(indice);
    expect(resolver(trechos('veja o art. 84, XX'), 'art2')).toEqual([]);
  });

  it('a citação ao próprio dispositivo fica de fora', () => {
    const resolver = criarResolvedorDeRemissoes(indice);
    expect(resolver(trechos('conforme o art. 3º'), 'art3')).toEqual([]);
  });

  it('guarda por texto: o mesmo objeto na segunda chamada', () => {
    const resolver = criarResolvedorDeRemissoes(indice);
    const t = trechos('veja o art. 3º');
    expect(resolver(t, 'art2')).toBe(resolver(t, 'art2'));
  });
});
