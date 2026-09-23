import { Barramento, type Evento } from '../eventos/barramento';
import { ENTIDADES } from '../modelo';
import { repositorioDeTeste } from '../../testes/repositorio';
import { BancoArretado, VERSAO_ESQUEMA } from './banco';
import { ErroDeValidacao } from './colecao';
import { reconstruirDoLog } from './log';
import { Repositorio } from './repositorio';

const ERRO = {
  resultado: 'errou' as const,
  oQueFoi: 'Prazo do art. 112',
  status: 'aberto' as const,
};

describe('banco local (1.3)', () => {
  it('declara todas as coleções do modelo com a versão do esquema', async () => {
    const { repo } = await repositorioDeTeste();
    const nomes = repo.db.tables.map((t) => t.name);
    for (const n of Object.keys(ENTIDADES)) expect(nomes).toContain(n);
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
  });

  it('abrir duas vezes mantém a identidade e não duplica nada', async () => {
    const nomeBanco = `reabrir-${Math.random()}`;
    const a = await Repositorio.abrir({ nomeBanco });
    const contagem = await a.db.alteracoes.count();
    a.fechar();
    const b = await Repositorio.abrir({ nomeBanco });
    expect(b.ctx.usuarioId).toBe(a.ctx.usuarioId);
    expect(b.ctx.aparelhoId).toBe(a.ctx.aparelhoId);
    expect(await b.db.tabela('usuarios').count()).toBe(1);
    expect(await b.db.tabela('aparelhos').count()).toBe(1);
    expect(await b.db.tabela('preferencias').count()).toBe(1);
    expect(await b.db.alteracoes.count()).toBe(contagem);
  });

  it('consulta por índice composto', async () => {
    const { repo } = await repositorioDeTeste();
    const cartoes = repo.colecao('cartoes');
    const base = { frente: 'f', verso: null, origemTipo: 'manual' as const, caixa: 1 };
    await cartoes.criar({ ...base, estado: 'ativo', proximaRevisao: '2026-09-20' });
    await cartoes.criar({ ...base, estado: 'ativo', proximaRevisao: '2026-09-30' });
    await cartoes.criar({ ...base, estado: 'suspenso', proximaRevisao: '2026-09-20' });
    const u = repo.ctx.usuarioId;
    const vencidos = await cartoes.listarPagina({
      indice: '[usuarioId+estado+proximaRevisao]',
      de: [u, 'ativo', ''],
      ate: [u, 'ativo', '2026-09-23'],
      limite: 50,
    });
    expect(vencidos.itens.map((c) => c.proximaRevisao)).toEqual(['2026-09-20']);
  });
});

describe('coleções (1.4)', () => {
  it('cria com campos comuns preenchidos pelo sistema', async () => {
    const { repo } = await repositorioDeTeste();
    const e = await repo.colecao('erros').criar(ERRO);
    expect(e).toMatchObject({
      ...ERRO,
      usuarioId: repo.ctx.usuarioId,
      origem: 'manual',
      excluidoEm: null,
      criadoEm: '2026-09-23T12:00:00.000Z',
    });
    expect(await repo.colecao('erros').obter(e.id)).toEqual(e);
  });

  it('rejeita registro inválido sem gravar nem registrar no log', async () => {
    const { repo } = await repositorioDeTeste();
    const antes = await repo.db.alteracoes.count();
    await expect(repo.colecao('erros').criar({ ...ERRO, oQueFoi: '' })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    expect(await repo.db.tabela('erros').count()).toBe(0);
    expect(await repo.db.alteracoes.count()).toBe(antes);
  });

  it('atualiza, remove campo opcional e protege campos comuns', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const erros = repo.colecao('erros');
    const e = await erros.criar({ ...ERRO, fraseCorreta: 'Frase' });
    relogio.avancar(1000);
    const a = await erros.atualizar(e.id, { causa: 'literalidade', fraseCorreta: undefined });
    expect(a.causa).toBe('literalidade');
    expect('fraseCorreta' in a).toBe(false);
    expect(a.atualizadoEm).toBe('2026-09-23T12:00:01.000Z');
    expect(a.tsLogico > e.tsLogico).toBe(true);
    await expect(erros.atualizar(e.id, { usuarioId: 'x' } as never)).rejects.toThrow(/controlado/);
  });

  it('exclusão lógica esconde e restaurar devolve', async () => {
    const { repo } = await repositorioDeTeste();
    const erros = repo.colecao('erros');
    const e = await erros.criar(ERRO);
    await erros.excluir(e.id);
    expect(await erros.obter(e.id)).toBeUndefined();
    expect((await erros.obter(e.id, { incluirExcluidos: true }))?.excluidoEm).not.toBeNull();
    expect((await erros.listarPagina({ limite: 10 })).itens).toHaveLength(0);
    await expect(erros.atualizar(e.id, { causa: 'lacuna' })).rejects.toThrow(/excluído/);
    await erros.restaurar(e.id);
    expect(await erros.obter(e.id)).toBeDefined();
  });

  it('coleção append-only não aceita atualização nem exclusão', async () => {
    const { repo } = await repositorioDeTeste();
    const r = await repo.colecao('revisoes').criar({
      cartaoId: repo.ctx.novoId(),
      em: '2026-09-24T12:00:00.000Z',
      data: '2026-09-24',
      resposta: 'facil',
      caixaAntes: 1,
      caixaDepois: 2,
      proximaAntes: '2026-09-24',
      proximaDepois: '2026-09-27',
      atrasoDias: 0,
    });
    await expect(repo.colecao('revisoes').atualizar(r.id, { atrasoDias: 1 })).rejects.toThrow(
      /append-only/,
    );
    await expect(repo.colecao('revisoes').excluir(r.id)).rejects.toThrow(/append-only/);
  });

  it('não cria id repetido', async () => {
    const { repo } = await repositorioDeTeste();
    const e = await repo.colecao('erros').criar(ERRO);
    await expect(repo.colecao('erros').criar(ERRO, { id: e.id })).rejects.toThrow(/já existe/);
  });

  it('pagina por cursor sem repetir nem pular, nos dois sentidos', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const erros = repo.colecao('erros');
    const criados: string[] = [];
    for (let i = 0; i < 25; i++) {
      // Metade com o mesmo instante, para exercitar empate de chave no índice.
      if (i % 2 === 0) relogio.avancar(1000);
      criados.push((await erros.criar({ ...ERRO, oQueFoi: `e${String(i)}` })).id);
    }
    for (const ordem of ['asc', 'desc'] as const) {
      const vistos: string[] = [];
      let cursor: string | null = null;
      do {
        const p = await erros.listarPagina({
          indice: '[usuarioId+criadoEm]',
          ordem,
          limite: 7,
          cursor,
        });
        vistos.push(...p.itens.map((e) => e.id));
        cursor = p.proximoCursor;
      } while (cursor);
      expect(vistos).toHaveLength(25);
      expect(new Set(vistos)).toEqual(new Set(criados));
    }
  });

  it('limita o tamanho da página e recusa índice não declarado', async () => {
    const { repo } = await repositorioDeTeste();
    const p = await repo.colecao('erros').listarPagina({ limite: 10_000 });
    expect(p.itens).toEqual([]);
    await expect(
      repo.colecao('erros').listarPagina({ indice: 'oQueFoi', limite: 10 }),
    ).rejects.toThrow(/não declarado/);
  });

  it('isola registros de outro usuário no mesmo banco', async () => {
    const { repo } = await repositorioDeTeste();
    const outro = await repo.colecao('erros').criar(ERRO);
    await repo.db.tabela('erros').update(outro.id, { usuarioId: repo.ctx.novoId() });
    expect(await repo.colecao('erros').obter(outro.id)).toBeUndefined();
    expect((await repo.colecao('erros').listarPagina({ limite: 10 })).itens).toHaveLength(0);
    await expect(repo.colecao('erros').atualizar(outro.id, { causa: 'lacuna' })).rejects.toThrow();
  });
});

describe('log de alterações (1.5)', () => {
  it('toda escrita gera entrada e o estado é reconstruível do log', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const erros = repo.colecao('erros');
    const a = await erros.criar(ERRO);
    const b = await erros.criar({ ...ERRO, fraseCorreta: 'x' });
    relogio.avancar(5);
    await erros.atualizar(a.id, { causa: 'leitura' });
    await erros.atualizar(b.id, { fraseCorreta: undefined });
    await erros.excluir(b.id);

    const log = await repo.db.alteracoes.orderBy('seq').toArray();
    expect(log.map((l) => l.ts)).toEqual([...log.map((l) => l.ts)].sort());
    const estado = reconstruirDoLog(log);
    for (const nome of ['usuarios', 'aparelhos', 'preferencias', 'erros'] as const) {
      const atuais = await repo.db.tabela(nome).toArray();
      const doLog = [...(estado.get(nome)?.values() ?? [])];
      expect(doLog).toEqual(expect.arrayContaining(atuais));
      expect(doLog).toHaveLength(atuais.length);
    }
  });

  it('transação desfeita não deixa registro nem log', async () => {
    const { repo } = await repositorioDeTeste();
    const antes = await repo.db.alteracoes.count();
    await expect(
      repo.transacao(async () => {
        await repo.colecao('erros').criar(ERRO);
        throw new Error('falha no meio');
      }),
    ).rejects.toThrow('falha no meio');
    expect(await repo.db.tabela('erros').count()).toBe(0);
    expect(await repo.db.alteracoes.count()).toBe(antes);
  });

  it('o relógio continua de onde parou ao reabrir, mesmo com relógio atrasado', async () => {
    const nomeBanco = `relogio-${Math.random()}`;
    const a = await Repositorio.abrir({ nomeBanco, agora: () => new Date('2026-09-23T12:00:00Z') });
    const e = await a.colecao('erros').criar(ERRO);
    a.fechar();
    const b = await Repositorio.abrir({ nomeBanco, agora: () => new Date('2020-01-01T00:00:00Z') });
    const e2 = await b.colecao('erros').criar(ERRO);
    expect(e2.tsLogico > e.tsLogico).toBe(true);
  });
});

describe('eventos (1.6)', () => {
  it('entrega só após a confirmação e em ordem', async () => {
    const eventos = new Barramento();
    const { repo } = await repositorioDeTeste({ eventos });
    const recebidos: Evento[] = [];
    eventos.assinar('*', (e) => {
      recebidos.push(e);
    });
    let duranteTransacao = -1;
    await repo.transacao(async () => {
      const e = await repo.colecao('erros').criar(ERRO);
      await repo.colecao('erros').atualizar(e.id, { causa: 'lacuna' });
      duranteTransacao = recebidos.length;
    });
    expect(duranteTransacao).toBe(0);
    expect(recebidos.map((e) => e.nome)).toEqual(['registro.criado', 'registro.atualizado']);
  });

  it('transação desfeita não emite', async () => {
    const eventos = new Barramento();
    const { repo } = await repositorioDeTeste({ eventos });
    const recebidos: Evento[] = [];
    eventos.assinar('*', (e) => {
      recebidos.push(e);
    });
    await repo
      .transacao(async () => {
        await repo.colecao('erros').criar(ERRO);
        throw new Error('x');
      })
      .catch(() => undefined);
    await new Promise((r) => setTimeout(r, 10));
    expect(recebidos).toEqual([]);
  });

  it('assinante que falha não quebra a escrita nem os demais', async () => {
    const falhas: unknown[] = [];
    const eventos = new Barramento((e) => falhas.push(e));
    const { repo } = await repositorioDeTeste({ eventos });
    const ok: string[] = [];
    eventos.assinar('registro.criado', () => {
      throw new Error('quebrado');
    });
    eventos.assinar('registro.criado', async () => {
      await Promise.resolve();
      throw new Error('quebrado assíncrono');
    });
    eventos.assinar('registro.criado', (e) => {
      ok.push(String(e.payload.id));
    });
    const e = await repo.colecao('erros').criar(ERRO);
    await new Promise((r) => setTimeout(r, 10));
    expect(ok).toEqual([e.id]);
    expect(falhas).toHaveLength(2);
    expect(await repo.colecao('erros').obter(e.id)).toBeDefined();
  });

  it('eventos emitidos durante a entrega vão para o fim da fila', () => {
    const b = new Barramento();
    const ordem: string[] = [];
    b.assinar('a', () => {
      ordem.push('a');
      b.emitir('c');
    });
    b.assinar('b', () => {
      ordem.push('b');
    });
    b.assinar('c', () => {
      ordem.push('c');
    });
    b.assinar('a', () => {
      b.emitir('b');
    });
    b.emitir('a');
    expect(ordem).toEqual(['a', 'c', 'b']);
  });

  it('cancelar assinatura', () => {
    const b = new Barramento();
    const f = vi.fn();
    const cancelar = b.assinar('x', f);
    cancelar();
    b.emitir('x');
    expect(f).not.toHaveBeenCalled();
  });
});

describe('BancoArretado', () => {
  it('usa o nome principal por padrão', () => {
    expect(new BancoArretado().name).toBe('arretado');
  });
});
