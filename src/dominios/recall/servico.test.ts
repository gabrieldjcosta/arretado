import type { Evento } from '../../core/eventos/barramento';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  arquivarCartao,
  completarErro,
  contarVencidos,
  criarCartaoDeDispositivo,
  criarCartaoDeErro,
  criarCartaoManual,
  diasComRevisao,
  editarCartao,
  excluirErro,
  filaDoDia,
  fraseDoErro,
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

async function preparar(opcoes: Parameters<typeof repositorioDeTeste>[0] = {}) {
  const ctx = await repositorioDeTeste(opcoes);
  const eventos: Evento[] = [];
  ctx.repo.eventos.assinar('*', (e) => {
    if (!e.nome.startsWith('registro.')) eventos.push(e);
  });
  return { ...ctx, eventos };
}

describe('registrar e completar erro (6.1)', () => {
  it('salva só com a frase correta (D25): errou, aberto, sem "o que foi", e a Frase junto', async () => {
    const { repo, eventos } = await preparar();
    const e = await registrarErro(repo, { fraseCorreta: '  O prazo é de 10 dias.  ' });
    expect(e).toMatchObject({
      status: 'aberto',
      resultado: 'errou',
      fraseCorreta: 'O prazo é de 10 dias.',
    });
    expect(e.oQueFoi).toBeUndefined();
    expect(e.causaSugerida).toBeUndefined();
    const frase = await fraseDoErro(repo, e.id);
    expect(frase).toMatchObject({
      texto: 'O prazo é de 10 dias.',
      origemTipo: 'erro',
      erroId: e.id,
      estado: 'ativa',
      proximaRevisao: '2026-09-24',
    });
    expect(eventos).toEqual([
      {
        nome: 'erro.registrado',
        payload: { erroId: e.id, pontoId: undefined, sessaoId: undefined },
      },
      { nome: 'frase.criada', payload: { fraseId: frase?.id, erroId: e.id } },
    ]);
  });

  it('recusa frase vazia e não grava nada', async () => {
    const { repo } = await preparar();
    await expect(registrarErro(repo, { fraseCorreta: '   ', oQueFoi: 'x' })).rejects.toThrow(
      /frase correta/,
    );
    expect(await repo.colecao('erros').contar()).toBe(0);
    expect(await repo.colecao('frases').contar()).toBe(0);
  });

  it('com "o que foi", sugere a causa; disciplina e ponto vão para a Frase', async () => {
    const { repo } = await preparar();
    const disciplinaId = (await repo.colecao('disciplinas').criar({ nome: 'Penal' })).id;
    const pontoId = (await repo.colecao('pontos').criar({ titulo: 'Furto', disciplinaId })).id;
    const e = await registrarErro(repo, {
      fraseCorreta: 'Dez dias.',
      oQueFoi: 'Errei o prazo de 10 dias',
      resultado: 'acertou_inseguro',
      disciplinaId,
      pontoId,
    });
    expect(e).toMatchObject({ resultado: 'acertou_inseguro', causaSugerida: 'literalidade' });
    expect(await fraseDoErro(repo, e.id)).toMatchObject({ disciplinaId, pontoId });
  });

  it('completar o erro mantém a Frase igual: texto, disciplina; apagar a frase arquiva', async () => {
    const { repo } = await preparar();
    const disciplinaId = (await repo.colecao('disciplinas').criar({ nome: 'Penal' })).id;
    const e = await registrarErro(repo, { fraseCorreta: 'Antes.' });
    await completarErro(repo, e.id, { fraseCorreta: 'Depois.', disciplinaId });
    expect(await fraseDoErro(repo, e.id)).toMatchObject({ texto: 'Depois.', disciplinaId });
    await completarErro(repo, e.id, { fraseCorreta: '', oQueFoi: 'Pergunta' });
    expect((await repo.colecao('erros').obter(e.id))?.fraseCorreta).toBeUndefined();
    expect(await fraseDoErro(repo, e.id)).toMatchObject({ texto: 'Depois.', estado: 'arquivada' });
    expect((await listarFrases(repo)).itens).toEqual([]);
    await completarErro(repo, e.id, { fraseCorreta: 'De novo.' });
    expect(await fraseDoErro(repo, e.id)).toMatchObject({ texto: 'De novo.', estado: 'ativa' });
    expect(await repo.colecao('frases').contar()).toBe(1);
  });

  it('erro antigo sem frase ganha a Frase ao recebê-la', async () => {
    const { repo } = await preparar();
    const antigo = await repo
      .colecao('erros')
      .criar({ resultado: 'errou', oQueFoi: 'Antigo', status: 'aberto' });
    expect(await fraseDoErro(repo, antigo.id)).toBeUndefined();
    await completarErro(repo, antigo.id, { fraseCorreta: 'Nova.' });
    expect(await fraseDoErro(repo, antigo.id)).toMatchObject({ texto: 'Nova.', estado: 'ativa' });
  });

  it('causa escolhida entra no histórico com a sugerida e define a ação recomendada', async () => {
    const { repo } = await preparar();
    const e = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'Confundi furto e roubo',
      fraseCorreta: 'Furto não tem violência.',
    });
    const c = await completarErro(repo, e.id, {
      causa: 'confusao',
      fraseCorreta: 'Roubo exige violência.',
    });
    expect(c.acaoRecomendada).toMatch(/contraste/);
    expect(c.historicoCausa).toEqual([
      { em: '2026-09-23T12:00:00.000Z', sugerida: 'confusao', confirmada: 'confusao' },
    ]);
  });

  it('excluir o erro mantém o cartão e exclui a Frase dele', async () => {
    const { repo } = await preparar();
    const e = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'x', fraseCorreta: 'F.' });
    const c = await criarCartaoDeErro(repo, e.id);
    await excluirErro(repo, e.id);
    expect(await repo.colecao('cartoes').obter(c.id)).toBeDefined();
    expect(await repo.colecao('frases').contar()).toBe(0);
    expect((await listarFrases(repo)).itens).toEqual([]);
  });

  it('lista por recência com filtros e "a completar"', async () => {
    const { repo, relogio } = await preparar();
    const a = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'a', fraseCorreta: 'A.' });
    relogio.avancar(1000);
    const b = await registrarErro(repo, {
      resultado: 'acertou_inseguro',
      oQueFoi: 'b',
      fraseCorreta: 'B.',
    });
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

  it('lista passiva: Frases ativas por recência, filtráveis por disciplina', async () => {
    const { repo, relogio } = await preparar();
    const disciplinaId = (await repo.colecao('disciplinas').criar({ nome: 'Penal' })).id;
    // Erro antigo sem frase não entra.
    await repo.colecao('erros').criar({ resultado: 'errou', oQueFoi: 'sem', status: 'aberto' });
    const a = await registrarErro(repo, { fraseCorreta: 'Primeira.' });
    relogio.avancar(1000);
    const b = await registrarErro(repo, { fraseCorreta: 'Segunda.', disciplinaId });
    expect((await listarFrases(repo)).itens.map((f) => f.erroId)).toEqual([b.id, a.id]);
    expect((await listarFrases(repo, { disciplinaId })).itens.map((f) => f.texto)).toEqual([
      'Segunda.',
    ]);
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

  it('cartão de dispositivo: origem no dispositivo, caixa 1, primeira revisão amanhã, evento', async () => {
    const { repo, eventos } = await preparar();
    const c = await criarCartaoDeDispositivo(repo, {
      dispositivoId: 'b2f3c1a0-5d4e-4c3b-8a9f-0123456789ab',
      frente: 'O que diz o art. 9º-A, LEP?',
      verso: 'Texto do artigo.',
    });
    expect(c).toMatchObject({
      origemTipo: 'dispositivo',
      origemId: 'b2f3c1a0-5d4e-4c3b-8a9f-0123456789ab',
      verso: 'Texto do artigo.',
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: '2026-09-24',
    });
    expect(eventos.map((e) => e.nome)).toContain('cartao.criado');
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

describe('correções da revisão da etapa 6', () => {
  it('criar cartão duas vezes para o mesmo erro devolve o mesmo cartão', async () => {
    const { repo } = await preparar();
    const e = await registrarErro(repo, { resultado: 'errou', oQueFoi: 'x', fraseCorreta: 'F.' });
    const [a, b] = await Promise.all([
      criarCartaoDeErro(repo, e.id),
      criarCartaoDeErro(repo, e.id),
    ]);
    expect(a.id).toBe(b.id);
    expect(await repo.colecao('cartoes').contar()).toBe(1);
  });

  it('sugestão que deixou de valer é apagada ao editar o texto', async () => {
    const { repo } = await preparar();
    const e = await registrarErro(repo, {
      resultado: 'errou',
      oQueFoi: 'prazo de 15 dias',
      fraseCorreta: 'F.',
    });
    expect(e.causaSugerida).toBe('literalidade');
    const e2 = await completarErro(repo, e.id, { oQueFoi: 'não conhecia o instituto' });
    expect(e2.causaSugerida).toBeUndefined();
    const e3 = await completarErro(repo, e.id, { fraseCorreta: 'F.' });
    expect(e3.causaSugerida).toBeUndefined();
  });
});

describe('dias com revisão nos últimos 7 (fatia 3)', () => {
  async function cartaoVencido(repo: Awaited<ReturnType<typeof preparar>>['repo']) {
    const c = await criarCartaoManual(repo, { frente: 'f', verso: 'v' });
    return c;
  }

  it('nenhum dia sem revisões', async () => {
    const { repo } = await preparar();
    expect(await diasComRevisao(repo)).toEqual(Array(7).fill(false));
  });

  it('um dia: hoje é a última marca; revisões do mesmo dia contam uma vez', async () => {
    const { repo } = await preparar();
    const a = await cartaoVencido(repo);
    const b = await cartaoVencido(repo);
    await revisar(repo, a.id, 'errei');
    await revisar(repo, b.id, 'errei');
    expect(await diasComRevisao(repo)).toEqual([false, false, false, false, false, false, true]);
  });

  it('sete dias seguidos; o oitavo empurra o mais antigo para fora da janela', async () => {
    const { repo, relogio } = await preparar();
    const c = await cartaoVencido(repo);
    for (let i = 0; i < 8; i += 1) {
      // 'errei' mantém o cartão vencendo no dia seguinte.
      await revisar(repo, c.id, 'errei');
      if (i < 7) relogio.avancar(DIA);
    }
    expect(await diasComRevisao(repo)).toEqual(Array(7).fill(true));
    relogio.avancar(2 * DIA);
    expect(await diasComRevisao(repo)).toEqual([true, true, true, true, true, false, false]);
  });

  it('usa a data civil local: 23h em São Paulo conta no próprio dia, não no seguinte (UTC)', async () => {
    const { repo } = await preparar({ inicio: '2026-09-24T02:30:00.000Z' }); // 23h30 de 23/09 em SP
    const c = await cartaoVencido(repo);
    await revisar(repo, c.id, 'errei');
    expect(await diasComRevisao(repo)).toEqual([false, false, false, false, false, false, true]);
    const { repo: outro, relogio } = await preparar({ inicio: '2026-09-24T02:30:00.000Z' });
    const d = await cartaoVencido(outro);
    await revisar(outro, d.id, 'errei');
    relogio.avancar(2 * 3_600_000); // 01h30 de 24/09 em SP: o dia 23 é a penúltima marca
    expect(await diasComRevisao(outro)).toEqual([false, false, false, false, false, true, false]);
  });
});
