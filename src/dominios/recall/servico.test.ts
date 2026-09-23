import type { Evento } from '../../core/eventos/barramento';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  arquivarCartao,
  completarErro,
  contarVencidos,
  criarCartaoDeErro,
  criarCartaoManual,
  editarCartao,
  excluirErro,
  filaDoDia,
  historicoRevisoes,
  listarCartoes,
  listarErros,
  listarFrases,
  maiorFilaProjetada,
  reativarCartao,
  registrarErro,
  revisar,
  suspenderCartao,
  vencemAmanha,
  versoEfetivo,
} from './servico';

const DIA = 86_400_000;

async function preparar() {
  const ctx = await repositorioDeTeste();
  const eventos: Evento[] = [];
  ctx.repo.eventos.assinar('*', (e) => {
    if (!e.nome.startsWith('registro.')) eventos.push(e);
  });
  return { ...ctx, eventos };
}

describe('registrar e completar erro (6.1)', () => {
  it('salva com os 2 obrigatórios, aberto, com causa sugerida e evento', async () => {
    const { repo, eventos } = await preparar();
    const e = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'Errei o prazo de 10 dias',
    });
    expect(e).toMatchObject({ status: 'aberto', causaSugerida: 'literalidade' });
    expect(e.causa).toBeUndefined();
    expect(eventos).toEqual([
      {
        nome: 'erro.registrado',
        payload: { erroId: e.id, pontoId: undefined, sessaoId: undefined },
      },
    ]);
  });

  it('causa escolhida entra no histórico com a sugerida e define a ação recomendada', async () => {
    const { repo } = await preparar();
    const e = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'Confundi furto e roubo' });
    const c = await completarErro(repo, e.id, {
      causa: 'confusao',
      fraseCorreta: 'Roubo exige violência.',
    });
    expect(c.acaoRecomendada).toMatch(/contraste/);
    expect(c.historicoCausa).toEqual([
      { em: '2026-09-23T12:00:00.000Z', sugerida: 'confusao', confirmada: 'confusao' },
    ]);
  });

  it('excluir o erro mantém o cartão', async () => {
    const { repo } = await preparar();
    const e = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'x' });
    const c = await criarCartaoDeErro(repo, e.id);
    await excluirErro(repo, e.id);
    expect(await repo.colecao('cartoes').obter(c.id)).toBeDefined();
  });

  it('lista por recência com filtros e "a completar"', async () => {
    const { repo, relogio } = await preparar();
    const a = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'a' });
    relogio.avancar(1000);
    const b = await registrarErro(repo, { resultado: 'acertou_inseguro', oQueFoi: 'b' });
    relogio.avancar(1000);
    const c = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'c',
      fraseCorreta: 'C.',
      causa: 'lacuna',
    });
    expect((await listarErros(repo)).itens.map((e) => e.id)).toEqual([c.id, b.id, a.id]);
    expect((await listarErros(repo, { resultado: 'errou' })).itens.map((e) => e.id)).toEqual([
      c.id,
      a.id,
    ]);
    expect((await listarErros(repo, { soACompletar: true })).itens.map((e) => e.id)).toEqual([
      b.id,
      a.id,
    ]);
  });

  it('lista passiva só com frases corretas', async () => {
    const { repo } = await preparar();
    await registrarErro(repo, { resultado: 'errou', oQueFoi: 'sem frase' });
    const f = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'com frase',
      fraseCorreta: 'Frase.',
    });
    expect((await listarFrases(repo)).itens.map((e) => e.id)).toEqual([f.id]);
  });
});

describe('cartões (6.4, 6.7)', () => {
  it('de erro: frente = o que foi; verso = frase correta até ser editado; caixa 1; amanhã', async () => {
    const { repo, eventos } = await preparar();
    const e = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'Prazo?',
      fraseCorreta: '5 dias.',
    });
    const c = await criarCartaoDeErro(repo, e.id);
    expect(c).toMatchObject({
      frente: 'Prazo?',
      verso: null,
      caixa: 1,
      proximaRevisao: '2026-09-24',
      estado: 'ativo',
      erroId: e.id,
    });
    expect((await repo.colecao('erros').obter(e.id))?.status).toBe('com_cartao');
    expect(eventos.map((x) => x.nome)).toContain('cartao.criado');

    // Frase correta alterada reflete no verso não editado.
    const e2 = await completarErro(repo, e.id, { fraseCorreta: '10 dias.' });
    expect(versoEfetivo(c, e2)).toBe('10 dias.');
    // Verso editado passa a ser independente.
    const c2 = await editarCartao(repo, c.id, { verso: 'Verso próprio' });
    const e3 = await completarErro(repo, e.id, { fraseCorreta: '15 dias.' });
    expect(versoEfetivo(c2, e3)).toBe('Verso próprio');
  });

  it('suspenso e arquivado saem da fila e voltam sem perder a caixa', async () => {
    const { repo, relogio } = await preparar();
    const c = await criarCartaoManual(repo, { frente: 'f', verso: 'v' });
    relogio.avancar(2 * DIA);
    await revisar(repo, c.id, 'facil');
    relogio.avancar(3 * DIA);
    expect((await filaDoDia(repo)).map((x) => x.id)).toEqual([c.id]);
    await suspenderCartao(repo, c.id, 'agora não');
    expect(await filaDoDia(repo)).toEqual([]);
    expect((await listarCartoes(repo, 'suspenso')).itens.map((x) => x.id)).toEqual([c.id]);
    await reativarCartao(repo, c.id);
    expect((await repo.colecao('cartoes').obter(c.id))?.caixa).toBe(2);
    await arquivarCartao(repo, c.id);
    expect(await filaDoDia(repo)).toEqual([]);
  });
});

describe('fila e revisão (6.5)', () => {
  it('fila: vencidos, mais atrasados primeiro, depois caixa menor', async () => {
    const { repo } = await preparar();
    const cartoes = repo.colecao('cartoes');
    const base = {
      frente: 'f',
      verso: 'v',
      origemTipo: 'manual' as const,
      estado: 'ativo' as const,
    };
    const a = await cartoes.criar({ ...base, caixa: 3, proximaRevisao: '2026-09-20' });
    const b = await cartoes.criar({ ...base, caixa: 1, proximaRevisao: '2026-09-22' });
    const c = await cartoes.criar({ ...base, caixa: 4, proximaRevisao: '2026-09-20' });
    await cartoes.criar({ ...base, caixa: 1, proximaRevisao: '2026-09-24' });
    await cartoes.criar({ ...base, caixa: 1, proximaRevisao: '2026-09-19', estado: 'suspenso' });
    expect((await filaDoDia(repo)).map((x) => x.id)).toEqual([a.id, c.id, b.id]);
    expect(await contarVencidos(repo)).toBe(3);
    expect(await vencemAmanha(repo)).toBe(1);
  });

  it('revisão é append-only e reagenda o cartão na mesma transação', async () => {
    const { repo, relogio, eventos } = await preparar();
    const c = await criarCartaoManual(repo, { frente: 'f', verso: 'v' });
    relogio.avancar(DIA);
    const { cartao, revisao } = await revisar(repo, c.id, 'facil', { duracaoMs: 4200 });
    expect(revisao).toMatchObject({
      resposta: 'facil',
      caixaAntes: 1,
      caixaDepois: 2,
      proximaAntes: '2026-09-24',
      proximaDepois: '2026-09-27',
      atrasoDias: 0,
      duracaoMs: 4200,
      data: '2026-09-24',
    });
    expect(cartao).toMatchObject({ caixa: 2, proximaRevisao: '2026-09-27' });
    expect(eventos.at(-1)?.nome).toBe('cartao.revisado');
    relogio.avancar(3 * DIA);
    await revisar(repo, c.id, 'errei');
    expect((await historicoRevisoes(repo)).itens.map((r) => r.resposta)).toEqual([
      'errei',
      'facil',
    ]);
    expect((await repo.colecao('cartoes').obter(c.id))?.caixa).toBe(1);
  });

  it('não revisa cartão suspenso', async () => {
    const { repo } = await preparar();
    const c = await criarCartaoManual(repo, { frente: 'f', verso: 'v' });
    await suspenderCartao(repo, c.id);
    await expect(revisar(repo, c.id, 'facil')).rejects.toThrow(/não está na fila/);
    expect(await repo.colecao('revisoes').contar()).toBe(0);
  });

  it('"hoje" segue o fuso de Brasília', async () => {
    // 22:30 de 23/09 em Brasília = 01:30 de 24/09 em UTC.
    const { repo } = await repositorioDeTeste({ inicio: '2026-09-24T01:30:00.000Z' });
    const base = {
      frente: 'f',
      verso: 'v',
      origemTipo: 'manual' as const,
      estado: 'ativo' as const,
      caixa: 1,
    };
    await repo.colecao('cartoes').criar({ ...base, proximaRevisao: '2026-09-24' });
    expect(await contarVencidos(repo)).toBe(0);
  });
});

describe('fila projetada (6.9)', () => {
  it('maior fila dos próximos 7 dias, contando vencidos hoje', async () => {
    const { repo } = await preparar();
    const cartoes = repo.colecao('cartoes');
    const base = {
      frente: 'f',
      verso: 'v',
      origemTipo: 'manual' as const,
      estado: 'ativo' as const,
      caixa: 1,
    };
    const lote = [
      ...Array.from({ length: 30 }, () => ({ ...base, proximaRevisao: '2026-09-20' })),
      ...Array.from({ length: 15 }, () => ({ ...base, proximaRevisao: '2026-09-23' })),
      ...Array.from({ length: 20 }, () => ({ ...base, proximaRevisao: '2026-09-26' })),
      ...Array.from({ length: 99 }, () => ({ ...base, proximaRevisao: '2026-10-10' })),
    ];
    for (const c of lote) await cartoes.criar(c);
    expect(await maiorFilaProjetada(repo)).toBe(45);
  });
});
