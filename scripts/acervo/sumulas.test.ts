import { describe, expect, it } from 'vitest';
import { ItemDaCuradoria } from './curadoria';
import { construirItemSumulas, nosDeSumulas, FonteDeSumulas } from './sumulas';
import { aderirAoItem } from '../../src/dominios/acervo/adesao';
import { FonteEmMemoria } from '../../src/dominios/acervo/fonte-em-memoria';
import { hashDoItem } from '../../src/dominios/acervo/hash';
import { Repositorio } from '../../src/core/persistencia';

// Conteúdo inventado só para o teste: não é enunciado de tribunal.
const FONTE = {
  tribunal: 'Tribunal de Teste',
  sumulas: [
    {
      numero: 10,
      enunciado: 'Enunciado dez de teste.',
      origem: 'DJ 01/02/2000',
      link: 'https://exemplo.gov.br/s10',
    },
    { numero: 2, enunciado: 'Enunciado dois de teste.', situacao: 'cancelada' },
    { numero: 3, enunciado: 'Enunciado três de teste.', situacao: 'superada' },
  ],
};

const cur = ItemDaCuradoria.parse({
  id: 'sumulas-teste',
  titulo: 'Súmulas do Tribunal de Teste',
  grupo: 'Súmulas',
  especie: 'sumulas',
  fonte: { adaptador: 'sumulas', arquivo: 'teste.json' },
});

describe('adaptador de súmulas', () => {
  it('ordena por número, mapeia a situação e guarda origem e link', () => {
    const nos = nosDeSumulas(FonteDeSumulas.parse(FONTE));
    expect(nos.map((n) => n.endereco)).toEqual(['s2', 's3', 's10']);
    expect(nos.map((n) => n.status)).toEqual(['revogado', 'eficacia_cessada', 'vigente']);
    expect(nos[0]).toMatchObject({ rotulo: 'Súmula 2', tipo: 'sumula', categoria: 'normativo' });
    expect(nos[0]?.notasVigencia).toEqual([{ texto: 'Súmula cancelada.' }]);
    expect(nos[2]?.notasVigencia).toEqual([
      { texto: 'DJ 01/02/2000', link: 'https://exemplo.gov.br/s10' },
    ]);
  });

  it('vinculante usa sv<n> e o rótulo longo', () => {
    const nos = nosDeSumulas(
      FonteDeSumulas.parse({ ...FONTE, vinculante: true, sumulas: [FONTE.sumulas[0]] }),
    );
    expect(nos[0]).toMatchObject({ endereco: 'sv10', rotulo: 'Súmula Vinculante 10' });
  });

  it('gera o mesmo item e o mesmo hash duas vezes', async () => {
    const a = construirItemSumulas(cur, JSON.stringify(FONTE), '2026-10-10', undefined);
    const b = construirItemSumulas(cur, JSON.stringify(FONTE), '2026-10-10', undefined);
    expect(a.bloqueios).toEqual([]);
    expect(a.item?.norma.especie).toBe('sumulas');
    expect(await hashDoItem(a.item!)).toBe(await hashDoItem(b.item!));
  });

  it('bloqueia número repetido, JSON inválido e enunciado vazio', () => {
    const dup = { ...FONTE, sumulas: [FONTE.sumulas[0], FONTE.sumulas[0]] };
    expect(
      construirItemSumulas(cur, JSON.stringify(dup), '2026-10-10', undefined).bloqueios[0],
    ).toMatch(/repetida: 10/);
    expect(construirItemSumulas(cur, '{', '2026-10-10', undefined).bloqueios[0]).toMatch(
      /inválida/,
    );
    const vazio = { ...FONTE, sumulas: [{ numero: 1, enunciado: '  ' }] };
    expect(
      construirItemSumulas(cur, JSON.stringify(vazio), '2026-10-10', undefined).item,
    ).toBeUndefined();
  });

  it('o item gerado é aderido pelo app como coleção de súmulas', async () => {
    const { item } = construirItemSumulas(cur, JSON.stringify(FONTE), '2026-10-10', undefined);
    const repo = await Repositorio.abrir({
      nomeBanco: `sumulas-${Math.random().toString(36).slice(2)}`,
    });
    const fonte = await FonteEmMemoria.criar([{ item: item! }]);
    const indice = await fonte.listar();
    const r = await aderirAoItem(repo, fonte, indice.itens[0]!);
    expect(r.estado).toBe('adicionada');
    const normas = await repo.colecao('normas').todosDoUsuario();
    expect(normas[0]?.especie).toBe('sumulas');
    const disp = await repo.colecao('dispositivos').todosDoUsuario();
    expect(disp.map((d) => d.tipo)).toEqual(['sumula', 'sumula', 'sumula']);
  });
});
