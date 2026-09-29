import { repositorioDeTeste } from '../../testes/repositorio';
import { sha256 } from '../util/sha256';
import { AnexoAlterado, gravarAnexo, lerAnexo, prepararAnexo, removerAnexos } from './anexos';

const BYTES = new TextEncoder().encode('[{"trechos":[{"texto":"Art. 1º Texto."}]}]');

describe('anexos (F2, 9.2)', () => {
  it('prepara o hash antes e grava registro e bytes juntos', async () => {
    const { repo } = await repositorioDeTeste();
    const conteudo = await prepararAnexo('fonte.json', 'application/json', BYTES);
    expect(conteudo.hash).toBe(await sha256(BYTES));
    const anexo = await gravarAnexo(repo, conteudo, { origem: 'importacao' });
    expect(anexo).toMatchObject({
      nomeArquivo: 'fonte.json',
      tipoMime: 'application/json',
      tamanho: BYTES.length,
      hash: conteudo.hash,
      origem: 'importacao',
    });
    const lido = await lerAnexo(repo, anexo.id);
    expect(lido?.anexo).toEqual(anexo);
    expect(lido?.bytes).toEqual(BYTES);
  });

  it('dentro de uma transação desfeita, nem o registro nem os bytes ficam', async () => {
    const { repo } = await repositorioDeTeste();
    const conteudo = await prepararAnexo('fonte.json', 'application/json', BYTES);
    await expect(
      repo.transacao(async () => {
        await gravarAnexo(repo, conteudo);
        throw new Error('falha depois do anexo');
      }),
    ).rejects.toThrow('falha depois do anexo');
    expect(await repo.db.tabela('anexos').count()).toBe(0);
    expect(await repo.db.anexosConteudo.count()).toBe(0);
  });

  it('bytes alterados lançam AnexoAlterado; anexo ausente ou de outro usuário volta vazio', async () => {
    const { repo } = await repositorioDeTeste();
    const anexo = await gravarAnexo(
      repo,
      await prepararAnexo('fonte.json', 'application/json', BYTES),
    );
    expect(await lerAnexo(repo.comUsuario(repo.ctx.novoId()), anexo.id)).toBeUndefined();
    await repo.db.anexosConteudo.put({ id: anexo.id, bytes: new TextEncoder().encode('[]') });
    await expect(lerAnexo(repo, anexo.id)).rejects.toBeInstanceOf(AnexoAlterado);
    await repo.db.anexosConteudo.delete(anexo.id);
    expect(await lerAnexo(repo, anexo.id)).toBeUndefined();
    expect(await lerAnexo(repo, repo.ctx.novoId())).toBeUndefined();
  });

  it('remover apaga registro e bytes, com registro no log', async () => {
    const { repo } = await repositorioDeTeste();
    const anexo = await gravarAnexo(
      repo,
      await prepararAnexo('fonte.json', 'application/json', BYTES),
    );
    expect(await removerAnexos(repo, [anexo.id])).toBe(1);
    expect(await repo.db.tabela('anexos').count()).toBe(0);
    expect(await repo.db.anexosConteudo.count()).toBe(0);
    const ultimo = await repo.db.alteracoes.orderBy('seq').last();
    expect(ultimo).toMatchObject({ colecao: 'anexos', registroId: anexo.id, operacao: 'remover' });
  });
});
