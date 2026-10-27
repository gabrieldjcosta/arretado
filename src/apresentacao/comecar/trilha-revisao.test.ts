import type {
  CarreiraDoCatalogo,
  EditalDoCatalogo,
  FonteDoCatalogo,
} from '../../dominios/catalogo';
import { desfazerImportacao } from '../../core/pacote';
import { repositorioDeTeste } from '../../testes/repositorio';
import { montarTrilha, trilhaOferecida } from './trilha-do-edital';

const edital: EditalDoCatalogo = {
  id: 'novo',
  orgao: 'NOVO',
  uf: null,
  banca: null,
  ano: 2026,
  cargo: null,
  fase: null,
  situacao: 'completo',
  fonteUrl: 'https://x.org',
  rotulo: 'baseado no edital NOVO de 2026',
  disciplinas: [
    {
      nomeNoEdital: 'Civil',
      ordem: 1,
      itens: ['Pessoas', 'Bens'].map((assunto) => ({
        numero: null,
        assunto,
        faixa: null,
        obsFaixa: null,
        recorrencia: null,
        fonteUrl: 'https://x.org',
      })),
    },
  ],
};
const carreira: CarreiraDoCatalogo = {
  versao: 1,
  carreira: 'X',
  slug: 'x',
  editais: [edital],
  disciplinas: [],
};
const fonte: FonteDoCatalogo = {
  listar: () => Promise.reject(new Error('n')),
  obter: () => Promise.resolve(carreira),
};

describe('revisão #325', () => {
  it('montar duas vezes não duplica Pontos (nem grava log vazio)', async () => {
    const { repo } = await repositorioDeTeste();
    const o = await trilhaOferecida(repo, fonte, 'x');
    if (!o) throw new Error('sem oferta');
    await montarTrilha(repo, o);
    await montarTrilha(repo, o);
    expect(await repo.colecao('pontos').todosDoUsuario()).toHaveLength(2);
    expect(await repo.colecao('logsImportacao').todosDoUsuario()).toHaveLength(1);
  });

  it('desfazer a Trilha devolve a oferta', async () => {
    const { repo } = await repositorioDeTeste();
    const o = await trilhaOferecida(repo, fonte, 'x');
    if (!o) throw new Error('sem oferta');
    await montarTrilha(repo, o);
    const [log] = await repo.colecao('logsImportacao').todosDoUsuario();
    await desfazerImportacao(repo, log!.id);
    expect(await trilhaOferecida(repo, fonte, 'x')).not.toBeNull();
  });

  it('Pontos só excluídos (lixeira) ainda calam a oferta?', async () => {
    const { repo } = await repositorioDeTeste();
    const o = await trilhaOferecida(repo, fonte, 'x');
    if (!o) throw new Error('sem oferta');
    await montarTrilha(repo, o);
    for (const p of await repo.colecao('pontos').todosDoUsuario())
      await repo.colecao('pontos').excluir(p.id);
    expect(await trilhaOferecida(repo, fonte, 'x')).not.toBeNull();
  });

  it('falha na gravação não deixa nada pela metade', async () => {
    const { repo } = await repositorioDeTeste();
    const o = await trilhaOferecida(repo, fonte, 'x');
    if (!o) throw new Error('sem oferta');
    const real = repo.transacao.bind(repo);
    let primeira = true;
    repo.transacao = (async (f: () => Promise<unknown>) =>
      real(async () => {
        const r = await f();
        if (primeira) {
          primeira = false;
          throw new Error('cai');
        }
        return r;
      })) as typeof repo.transacao;
    await expect(montarTrilha(repo, o)).rejects.toThrow('cai');
    expect(await repo.colecao('pontos').todosDoUsuario()).toHaveLength(0);
    await montarTrilha(repo, o);
    expect(await repo.colecao('pontos').todosDoUsuario()).toHaveLength(2);
  });
});

describe('dados do usuário', () => {
  it('disciplina própria sem Pontos: a Trilha reaproveita o nome ou duplica?', async () => {
    const { repo } = await repositorioDeTeste();
    const minha = await repo.colecao('disciplinas').criar({ nome: 'Civil', ordem: 0 });
    const o = await trilhaOferecida(repo, fonte, 'x');
    if (!o) throw new Error('sem oferta');
    await montarTrilha(repo, o);
    const ds = (await repo.colecao('disciplinas').todosDoUsuario()).filter((d) => !d.excluidoEm);
    expect(ds.map((d) => d.nome)).toEqual(['Civil']);
    expect((await repo.colecao('disciplinas').obter(minha.id))?.nome).toBe('Civil');
  });
});
