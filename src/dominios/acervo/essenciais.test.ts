import { repositorioDeTeste } from '../../testes/repositorio';
import { ESSENCIAIS, puxarEssenciais } from './essenciais';
import type { ItemDoAcervo } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';

const item = (id: string): ItemDoAcervo => ({
  id,
  versao: 1,
  norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
  nos: [
    {
      endereco: 'art1',
      categoria: 'normativo',
      tipo: 'artigo',
      rotulo: 'Art. 1º',
      status: 'vigente',
      confianca: 'alta',
      trechos: [{ texto: 'Texto.' }],
    },
  ],
});

describe('normas essenciais', () => {
  it('lista as sete do pedido, sem repetir', () => {
    expect(new Set(ESSENCIAIS).size).toBe(7);
  });

  it('adiciona as que faltam, não repete e não traz de volta a que a pessoa tirou', async () => {
    const { repo } = await repositorioDeTeste();
    const fonte = await FonteEmMemoria.criar([{ item: item('a') }, { item: item('b') }]);
    const ids = ['a', 'b'];
    expect(await puxarEssenciais(repo, fonte, { ids })).toEqual({ adicionadas: 2, pendentes: 0 });
    expect(await puxarEssenciais(repo, fonte, { ids })).toEqual({ adicionadas: 0, pendentes: 0 });

    const normas = await repo.colecao('normas').todosDoUsuario();
    const a = normas.find((n) => n.origemAcervo?.id === 'a');
    if (!a) throw new Error('norma a não entrou');
    await repo.colecao('normas').excluir(a.id);
    expect(await puxarEssenciais(repo, fonte, { ids })).toEqual({ adicionadas: 0, pendentes: 0 });
  });

  it('conta como pendente o que falhou, para tentar de novo depois', async () => {
    const { repo } = await repositorioDeTeste();
    const fonte = await FonteEmMemoria.criar([{ item: item('a') }]);
    const r = await puxarEssenciais(repo, fonte, { ids: ['a', 'fora-do-indice'] });
    expect(r).toEqual({ adicionadas: 1, pendentes: 1 });
  });
});
