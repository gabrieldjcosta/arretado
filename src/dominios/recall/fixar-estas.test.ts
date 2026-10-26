import { repositorioDeTeste } from '../../testes/repositorio';
import { fixarEstas, type EnunciadoParaFixar } from './fixar-estas';

const itens = (n: number): EnunciadoParaFixar[] =>
  Array.from({ length: n }, (_, i) => ({
    dispositivoId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    versaoId: '22222222-2222-4222-8222-222222222222',
    rotulo: `Súmula Vinculante ${String(i + 1)}`,
    texto: `Enunciado ${String(i + 1)}.`,
  }));

describe('fixarEstas', () => {
  it('cria uma Frase de trecho por enunciado, 5 por dia a partir de amanhã', async () => {
    const { repo } = await repositorioDeTeste();
    const r = await fixarEstas(repo, itens(12));
    expect(r).toEqual({ fixadas: 12, jaFixadas: 0 });
    const frases = await repo.colecao('frases').todosDoUsuario();
    expect(frases).toHaveLength(12);
    expect(frases[0]).toMatchObject({
      texto: 'Súmula Vinculante 1: Enunciado 1.',
      origemTipo: 'trecho',
      estado: 'ativa',
      trecho: { texto: 'Enunciado 1.', inicio: 0, fim: 12 },
    });
    const dias = new Map<string, number>();
    for (const f of frases) dias.set(f.proximaRevisao, (dias.get(f.proximaRevisao) ?? 0) + 1);
    expect([...dias.values()].sort()).toEqual([2, 5, 5]);
  });

  it('não repete o que já foi fixado', async () => {
    const { repo } = await repositorioDeTeste();
    await fixarEstas(repo, itens(3));
    const r = await fixarEstas(repo, itens(5));
    expect(r).toEqual({ fixadas: 2, jaFixadas: 3 });
    expect(await repo.colecao('frases').todosDoUsuario()).toHaveLength(5);
  });
});
