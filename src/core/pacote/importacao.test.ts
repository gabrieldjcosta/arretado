import { Repositorio, apagarBanco } from '../persistencia';
import { alterarPreferencias } from '../preferencias';
import { exportarPacote } from './exportar';
import { lerPacote } from './ler';
import { aplicar, ImportacaoInvalida, planejar, type ModoEscrita } from './importar';
import { desfazerImportacao } from './snapshots';
import { importarParaEspaco, mesclarEspaco, planejarMesclagem, removerEspaco } from './espacos';

const ERRO = {
  resultado: 'errou' as const,
  oQueFoi: 'Prazo do art. 112',
  status: 'aberto' as const,
};

let n = 0;
function nomeBanco() {
  n += 1;
  return `imp-${String(n)}-${Math.random().toString(36).slice(2)}`;
}

/** Relógio compartilhado e controlável entre aparelhos simulados. */
function relogio(inicio = '2026-09-23T12:00:00.000Z') {
  let t = new Date(inicio).getTime();
  return {
    agora: () => new Date(t),
    avancar: (ms = 1000) => {
      t += ms;
    },
  };
}

async function abrir(r = relogio(), nome = nomeBanco()) {
  return { repo: await Repositorio.abrir({ nomeBanco: nome, agora: r.agora }), nome, r };
}

async function comDados(r = relogio()) {
  const a = await abrir(r);
  const erros = a.repo.colecao('erros');
  const e1 = await erros.criar({ ...ERRO, fraseCorreta: 'Um sexto.' });
  r.avancar();
  const e2 = await erros.criar({ ...ERRO, oQueFoi: 'Confundi furto e roubo' });
  await a.repo.colecao('cartoes').criar({
    frente: 'Prazo?',
    verso: null,
    origemTipo: 'erro',
    erroId: e1.id,
    estado: 'ativo',
    caixa: 1,
    proximaRevisao: '2026-09-24',
  });
  return { ...a, e1, e2 };
}

async function hashDe(repo: Repositorio) {
  return (await exportarPacote(repo)).manifesto.hashConjunto;
}

async function importar(repo: Repositorio, bytes: Uint8Array, modo: ModoEscrita) {
  const pacote = await lerPacote(bytes);
  const previa = await planejar(repo, pacote, { modo });
  const resultado = await aplicar(repo, pacote, previa);
  return { pacote, previa, ...resultado };
}

/** Segundo aparelho do mesmo usuário (restaurou o pacote de A). */
async function segundoAparelho(bytesDeA: Uint8Array, r = relogio()) {
  const b = await abrir(r);
  const { repo } = await importar(b.repo, bytesDeA, 6);
  return repo;
}

describe('simulação (modo 1) e prévia (3.4)', () => {
  it.each([2, 3, 4, 5, 6] as const)('planejar o modo %i não escreve nada', async (modo) => {
    const { repo } = await comDados();
    const { bytes } = await exportarPacote(repo);
    const outro = await comDados();
    const alvo = modo === 6 ? outro.repo : repo;
    const antesLog = await alvo.db.alteracoes.count();
    const antes = await hashDe(alvo);
    const previa = await planejar(alvo, await lerPacote(bytes), { modo });
    expect(previa.modo).toBe(modo);
    expect(await alvo.db.alteracoes.count()).toBe(antesLog);
    expect(await hashDe(alvo)).toBe(antes);
  });

  it('recusa pacote de outra identidade fora dos modos 6 e 7', async () => {
    const a = await comDados();
    const b = await comDados();
    const pacote = await lerPacote((await exportarPacote(a.repo)).bytes);
    for (const modo of [2, 3, 4, 5] as const) {
      await expect(planejar(b.repo, pacote, { modo })).rejects.toBeInstanceOf(ImportacaoInvalida);
    }
  });

  it('restaurar integral exige pacote integral', async () => {
    const a = await comDados();
    const parcial = await exportarPacote(a.repo, {
      escopo: { tipo: 'modulos', modulos: ['recall'] },
    });
    await expect(planejar(a.repo, await lerPacote(parcial.bytes), { modo: 6 })).rejects.toThrow(
      /integral/,
    );
  });
});

describe('restauração integral (3.6)', () => {
  it('exportar → apagar tudo → restaurar → exportar dá hash idêntico', async () => {
    const r = relogio();
    const a = await comDados(r);
    const original = await exportarPacote(a.repo);
    a.repo.fechar();
    await apagarBanco(a.nome);

    const reaberto = await abrir(r, a.nome);
    expect(reaberto.repo.ctx.usuarioId).not.toBe(a.repo.ctx.usuarioId);
    const { previa, repo, identidadeMudou } = await importar(reaberto.repo, original.bytes, 6);
    expect(previa.substituiIdentidade).toBe(true);
    expect(identidadeMudou).toBe(true);
    expect(repo.ctx.usuarioId).toBe(a.repo.ctx.usuarioId);
    expect(await hashDe(repo)).toBe(original.manifesto.hashConjunto);

    // A identidade adotada persiste ao reabrir.
    repo.fechar();
    const depois = await abrir(r, a.nome);
    expect(depois.repo.ctx.usuarioId).toBe(a.repo.ctx.usuarioId);
    expect(await hashDe(depois.repo)).toBe(original.manifesto.hashConjunto);
  });

  it('volta exatamente ao pacote, apagando o que surgiu depois', async () => {
    const a = await comDados();
    const { bytes, manifesto } = await exportarPacote(a.repo);
    await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'novo depois do backup' });
    await a.repo.colecao('erros').atualizar(a.e1.id, { causa: 'leitura' });
    const { previa } = await importar(a.repo, bytes, 6);
    expect(previa.porColecao.erros).toMatchObject({ atualizar: 1, excluir: 1 });
    expect(await hashDe(a.repo)).toBe(manifesto.hashConjunto);
  });
});

describe('modos 2, 3 e 4 (3.5)', () => {
  it('modo 2 cria só os novos', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    r.avancar();
    const novo = await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'Só em A' });
    await a.repo.colecao('erros').atualizar(a.e1.id, { causa: 'lacuna' });
    const { previa } = await importar(b, (await exportarPacote(a.repo)).bytes, 2);
    expect(previa.porColecao.erros).toMatchObject({ criar: 1, atualizar: 0 });
    expect(await b.colecao('erros').obter(novo.id)).toBeDefined();
    expect((await b.colecao('erros').obter(a.e1.id))?.causa).toBeUndefined();
  });

  it('modo 3 atualiza só identificados mais recentes e nunca cria', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    r.avancar();
    await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'Só em A' });
    await a.repo.colecao('erros').atualizar(a.e1.id, { causa: 'lacuna' });
    const { previa } = await importar(b, (await exportarPacote(a.repo)).bytes, 3);
    expect(previa.porColecao.erros).toMatchObject({ criar: 0, atualizar: 1 });
    expect((await b.colecao('erros').obter(a.e1.id))?.causa).toBe('lacuna');
  });

  it('modo 4: mesma autoria vence o mais recente; autorias diferentes viram conflito', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    r.avancar();
    // e1 alterado só em A (mesma autoria da cópia de B) → atualiza.
    await a.repo.colecao('erros').atualizar(a.e1.id, { causa: 'lacuna' });
    // e2 alterado nos dois lados → conflito.
    await a.repo.colecao('erros').atualizar(a.e2.id, { causa: 'confusao' });
    await b.colecao('erros').atualizar(a.e2.id, { causa: 'leitura' });

    const pacote = await lerPacote((await exportarPacote(a.repo)).bytes);
    const previa = await planejar(b, pacote, { modo: 4 });
    expect(previa.porColecao.erros).toMatchObject({ atualizar: 1, conflitos: 1 });
    expect(previa.conflitos[0]?.id).toBe(a.e2.id);

    // Sem escolha, fica o local.
    await aplicar(b, pacote, previa);
    expect((await b.colecao('erros').obter(a.e1.id))?.causa).toBe('lacuna');
    expect((await b.colecao('erros').obter(a.e2.id))?.causa).toBe('leitura');

    // Escolhendo o pacote.
    const previa2 = await planejar(b, pacote, { modo: 4 });
    const chave = previa2.conflitos[0]?.chave ?? '';
    await aplicar(b, pacote, previa2, new Map([[chave, 'pacote']]));
    expect((await b.colecao('erros').obter(a.e2.id))?.causa).toBe('confusao');
  });

  it('avisa provável duplicata sem fundir', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'Idêntico' });
    await b.colecao('erros').criar({ ...ERRO, oQueFoi: 'Idêntico' });
    const { previa } = await importar(b, (await exportarPacote(a.repo)).bytes, 2);
    expect(previa.porColecao.erros?.duplicatasProvaveis).toBe(1);
    expect(previa.avisos.join(' ')).toMatch(/duplicata/);
    expect(await b.colecao('erros').contar({ filtro: (e) => e.oQueFoi === 'Idêntico' })).toBe(2);
  });
});

describe('modo 5 (3.6)', () => {
  it('substitui só o módulo escolhido, com exclusão lógica do que não está no pacote', async () => {
    const a = await comDados();
    const { bytes } = await exportarPacote(a.repo);
    const extra = await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'Depois do pacote' });
    await alterarPreferencias(a.repo, { tema: 'escuro' });
    const pacote = await lerPacote(bytes);
    const previa = await planejar(a.repo, pacote, { modo: 5, modulos: ['recall'] });
    expect(previa.modulos).toEqual(['recall']);
    expect(previa.totalExclusoes).toBe(1);
    await aplicar(a.repo, pacote, previa);
    expect(await a.repo.colecao('erros').obter(extra.id)).toBeUndefined();
    expect(await a.repo.colecao('erros').obter(extra.id, { incluirExcluidos: true })).toBeDefined();
    const prefs = await a.repo.colecao('preferencias').todosDoUsuario();
    expect(prefs[0]?.tema).toBe('escuro');
  });
});

describe('idempotência (3.5, 3.6)', () => {
  it.each([2, 3, 4, 5, 6] as const)(
    'repetir o mesmo pacote no modo %i não altera nada',
    async (modo) => {
      const r = relogio();
      const a = await comDados(r);
      const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
      r.avancar();
      await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'novo' });
      await a.repo.colecao('erros').atualizar(a.e1.id, { causa: 'lacuna' });
      const { bytes } = await exportarPacote(a.repo);
      await importar(b, bytes, modo);
      const depoisDaPrimeira = await hashDe(b);
      const { previa } = await importar(b, bytes, modo);
      expect(previa.escreve).toBe(false);
      expect(await hashDe(b)).toBe(depoisDaPrimeira);
    },
  );
});

describe('snapshot, log e rollback (3.8)', () => {
  it('toda importação que escreve gera snapshot e log; desfazer volta ao estado anterior', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'vindo de A' });
    const antes = await hashDe(b);
    const { log } = await importar(b, (await exportarPacote(a.repo)).bytes, 2);
    expect(log).toMatchObject({ modo: 2, resultado: 'concluida' });
    expect(log.snapshotId).toBeDefined();
    expect(log.contagens.erros?.criados).toBe(1);
    expect(await hashDe(b)).not.toBe(antes);

    const { repo } = await desfazerImportacao(b, log.id);
    expect(await hashDe(repo)).toBe(antes);
    expect((await repo.colecao('logsImportacao').obter(log.id))?.resultado).toBe('desfeita');
    await expect(desfazerImportacao(repo, log.id)).rejects.toBeInstanceOf(ImportacaoInvalida);
  });

  it('desfaz restauração integral de outra identidade, voltando à identidade anterior', async () => {
    const a = await comDados();
    const b = await comDados();
    const idOriginal = b.repo.ctx.usuarioId;
    const antes = await hashDe(b.repo);
    const { repo, log } = await importar(b.repo, (await exportarPacote(a.repo)).bytes, 6);
    expect(repo.ctx.usuarioId).toBe(a.repo.ctx.usuarioId);
    const desfeito = await desfazerImportacao(repo, log.id);
    expect(desfeito.repo.ctx.usuarioId).toBe(idOriginal);
    expect(await hashDe(desfeito.repo)).toBe(antes);
  });

  it('mantém no máximo a retenção configurada (mínimo 5)', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    for (let i = 0; i < 7; i++) {
      r.avancar();
      await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: `lote ${String(i)}` });
      await importar(b, (await exportarPacote(a.repo)).bytes, 2);
    }
    expect(await b.colecao('snapshots').contar()).toBe(5);
    expect(await b.db.snapshotsConteudo.count()).toBe(5);
    expect(await b.colecao('logsImportacao').contar()).toBe(8);
  });
});

describe('espaço separado (3.7)', () => {
  it('importa sem tocar nos dados atuais, mescla sem trazer a identidade e remove', async () => {
    const outro = await comDados();
    const { bytes } = await exportarPacote(outro.repo);
    const eu = await comDados();
    const antes = await hashDe(eu.repo);

    const { espaco, log } = await importarParaEspaco(
      eu.repo,
      await lerPacote(bytes),
      'Acervo antigo',
    );
    expect(log.modo).toBe(7);
    expect(await hashDe(eu.repo)).toBe(antes);
    expect(await eu.repo.colecao('espacos').obter(espaco.id)).toBeDefined();

    const { pacote, previa } = await planejarMesclagem(eu.repo, espaco.id);
    expect(previa.porColecao.erros?.criar).toBe(2);
    expect(previa.porColecao.usuarios).toBeUndefined();
    await mesclarEspaco(eu.repo, pacote, previa);
    expect(await eu.repo.colecao('erros').contar()).toBe(4);
    expect(await eu.repo.colecao('usuarios').contar()).toBe(1);

    await removerEspaco(eu.repo, espaco.id);
    expect(await eu.repo.colecao('espacos').obter(espaco.id)).toBeUndefined();
    await expect(planejarMesclagem(eu.repo, espaco.id)).rejects.toBeInstanceOf(ImportacaoInvalida);
  });
});
