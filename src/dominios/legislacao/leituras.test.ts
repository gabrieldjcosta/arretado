import { repositorioDeTeste } from '../../testes/repositorio';
import { gravarPosicao, leiturasPorNorma, marcarLidoAte, obterLeitura } from './leituras';

const id = () => crypto.randomUUID();

describe('leituras: posição e "lido até" por norma (9.7)', () => {
  it('a primeira posição cria a leitura; as seguintes alteram a mesma, sem mexer no "lido até"', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const normaId = id();
    const [a, b, c] = [id(), id(), id()];
    expect(await obterLeitura(repo, normaId)).toBeUndefined();

    await gravarPosicao(repo, normaId, a);
    expect(await obterLeitura(repo, normaId)).toMatchObject({
      normaId,
      posicaoId: a,
      ultimaLeituraEm: '2026-09-23T12:00:00.000Z',
    });
    expect((await obterLeitura(repo, normaId))?.lidoAteId).toBeUndefined();

    relogio.avancar(60_000);
    await marcarLidoAte(repo, normaId, b);
    relogio.avancar(60_000);
    await gravarPosicao(repo, normaId, c);
    expect(await obterLeitura(repo, normaId)).toMatchObject({
      posicaoId: c,
      lidoAteId: b,
      ultimaLeituraEm: '2026-09-23T12:02:00.000Z',
    });
    // O "lido até" retrocede por ação do usuário, e a posição fica onde estava.
    await marcarLidoAte(repo, normaId, a);
    expect(await obterLeitura(repo, normaId)).toMatchObject({ posicaoId: c, lidoAteId: a });
    expect(await repo.colecao('leituras').contar()).toBe(1);
  });

  it('duas gravações ao mesmo tempo (duas abas) não criam duas leituras', async () => {
    const { repo } = await repositorioDeTeste();
    const normaId = id();
    const [a, b] = [id(), id()];
    await Promise.all([gravarPosicao(repo, normaId, a), marcarLidoAte(repo, normaId, b)]);
    expect(await repo.colecao('leituras').contar()).toBe(1);
    expect(await obterLeitura(repo, normaId)).toMatchObject({ posicaoId: a, lidoAteId: b });
  });

  it('com duas leituras da mesma norma (backup mesclado), vale a usada por último', async () => {
    const { repo, relogio } = await repositorioDeTeste({ inicio: '2026-09-29T12:00:00.000Z' });
    const [lep, eca, antiga, nova, doEca, outra] = [id(), id(), id(), id(), id(), id()];
    await repo.colecao('leituras').criar({
      normaId: lep,
      posicaoId: nova,
      ultimaLeituraEm: '2026-09-25T10:00:00.000Z',
    });
    await repo.colecao('leituras').criar({
      normaId: lep,
      posicaoId: antiga,
      ultimaLeituraEm: '2026-09-24T10:00:00.000Z',
    });
    relogio.avancar(1000);
    await gravarPosicao(repo, eca, doEca);

    expect((await obterLeitura(repo, lep))?.posicaoId).toBe(nova);
    const porNorma = await leiturasPorNorma(repo);
    expect([...porNorma.keys()].sort()).toEqual([lep, eca].sort());
    expect(porNorma.get(lep)?.posicaoId).toBe(nova);
    expect(porNorma.get(eca)?.posicaoId).toBe(doEca);

    // A gravação seguinte vai para a mais recente; a outra fica como está.
    await gravarPosicao(repo, lep, outra);
    expect((await obterLeitura(repo, lep))?.posicaoId).toBe(outra);
    const todas = await repo.colecao('leituras').todosDoUsuario();
    expect(todas.map((l) => l.posicaoId).sort()).toEqual([antiga, outra, doEca].sort());
    expect(await repo.colecao('leituras').contar()).toBe(3);
  });
});
