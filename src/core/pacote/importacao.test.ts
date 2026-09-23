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

    // Todo arquivo de dados idêntico; aparelhos = os do pacote + este Aparelho, preservado.
    const conferir = async (alvo: Repositorio) => {
      const { manifesto } = await exportarPacote(alvo);
      for (const [caminho, info] of Object.entries(original.manifesto.arquivos)) {
        if (caminho === 'dados/aparelhos.json') continue;
        expect(manifesto.arquivos[caminho], caminho).toEqual(info);
      }
      const aparelhos = await alvo.colecao('aparelhos').todosDoUsuario();
      expect(aparelhos.map((x) => x.id).sort()).toEqual(
        [a.repo.ctx.aparelhoId, reaberto.repo.ctx.aparelhoId].sort(),
      );
      expect(alvo.ctx.aparelhoId).toBe(reaberto.repo.ctx.aparelhoId);
    };
    await conferir(repo);

    // A identidade adotada persiste ao reabrir.
    repo.fechar();
    const depois = await abrir(r, a.nome);
    expect(depois.repo.ctx.usuarioId).toBe(a.repo.ctx.usuarioId);
    await conferir(depois.repo);
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

describe('correções da revisão da etapa 3', () => {
  it('prévia defasada é recusada ao aplicar', async () => {
    const a = await comDados();
    const { bytes } = await exportarPacote(a.repo);
    const pacote = await lerPacote(bytes);
    const previa = await planejar(a.repo, pacote, { modo: 6 });
    await a.repo.colecao('erros').atualizar(a.e1.id, { causa: 'lacuna' });
    await expect(aplicar(a.repo, pacote, previa)).rejects.toThrow(/prévia de novo/);
    expect((await a.repo.colecao('erros').obter(a.e1.id))?.causa).toBe('lacuna');
  });

  it('modo 5 em "sistema" não exclui o Aparelho atual', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    const pacote = await lerPacote((await exportarPacote(a.repo)).bytes);
    await aplicar(b, pacote, await planejar(b, pacote, { modo: 5, modulos: ['sistema'] }));
    expect(await b.colecao('aparelhos').obter(b.ctx.aparelhoId)).toBeDefined();
  });

  it('rollback guarda o estado anterior e pode ser desfeito', async () => {
    const r = relogio();
    const a = await comDados(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    await a.repo.colecao('erros').criar({ ...ERRO, oQueFoi: 'de A' });
    const { log } = await importar(b, (await exportarPacote(a.repo)).bytes, 2);
    const depoisDaImportacao = await hashDe(b);
    const { log: logRollback, repo } = await desfazerImportacao(b, log.id);
    expect(logRollback.snapshotId).toBeDefined();
    const snap = await repo.colecao('snapshots').obter(logRollback.snapshotId ?? '');
    expect(snap?.motivo).toBe('rollback');
    const refeito = await desfazerImportacao(repo, logRollback.id);
    expect(await hashDe(refeito.repo)).toBe(depoisDaImportacao);
  });

  it('espaço separado aceita pacote parcial', async () => {
    const outro = await comDados();
    const parcial = await exportarPacote(outro.repo, {
      escopo: { tipo: 'modulos', modulos: ['recall'] },
    });
    const eu = await comDados();
    const { espaco } = await importarParaEspaco(eu.repo, await lerPacote(parcial.bytes), 'Parcial');
    const { previa } = await planejarMesclagem(eu.repo, espaco.id);
    expect(previa.porColecao.erros?.criar).toBe(2);
  });
});

describe('anexos no pacote', () => {
  async function comAnexo(r = relogio()) {
    const a = await comDados(r);
    const bytes = new TextEncoder().encode('imagem da questão');
    const hash = await (await import('./bytes')).sha256(bytes);
    const anexo = await a.repo.colecao('anexos').criar({
      nomeArquivo: 'q.png',
      tipoMime: 'image/png',
      tamanho: bytes.length,
      hash,
    });
    await a.repo.db.anexosConteudo.put({ id: anexo.id, bytes });
    return { ...a, anexo, conteudoAnexo: bytes };
  }

  it('viaja com o pacote e é restaurado', async () => {
    const a = await comAnexo();
    const { bytes } = await exportarPacote(a.repo, { incluirAnexos: true });
    const b = await abrir();
    const { repo } = await importar(b.repo, bytes, 6);
    expect((await repo.db.anexosConteudo.get(a.anexo.id))?.bytes).toEqual(a.conteudoAnexo);
  });

  it('não grava binário de anexo fora dos módulos escolhidos', async () => {
    const r = relogio();
    const a = await comAnexo(r);
    const b = await segundoAparelho((await exportarPacote(a.repo)).bytes, r);
    await b.db.anexosConteudo.clear();
    const pacote = await lerPacote((await exportarPacote(a.repo, { incluirAnexos: true })).bytes);
    await aplicar(b, pacote, await planejar(b, pacote, { modo: 5, modulos: ['recall'] }));
    expect(await b.db.anexosConteudo.count()).toBe(0);
  });

  it('recusa anexo sem registro ou com conteúdo trocado', async () => {
    const { unzipSync, zipSync, strToU8 } = await import('fflate');
    const { hashDoConjunto } = await import('./exportar');
    const { sha256, deBytes } = await import('./bytes');
    const a = await comAnexo();
    const { bytes } = await exportarPacote(a.repo, { incluirAnexos: true });
    const arquivos: Record<string, Uint8Array> = unzipSync(bytes);
    const m = JSON.parse(deBytes(arquivos['manifesto.json']!)) as {
      arquivos: Record<string, { sha256: string; bytes: number }>;
      hashConjunto: string;
    };
    const trocado = strToU8('outra imagem');
    arquivos[`anexos/${a.anexo.id}`] = trocado;
    m.arquivos[`anexos/${a.anexo.id}`] = { sha256: await sha256(trocado), bytes: trocado.length };
    m.hashConjunto = await hashDoConjunto(m.arquivos);
    arquivos['manifesto.json'] = strToU8(JSON.stringify(m));
    await expect(lerPacote(zipSync(arquivos))).rejects.toMatchObject({
      motivo: 'arquivo_alterado',
    });
  });
});

describe('zip bomb', () => {
  it('recusa conteúdo descompactado acima do limite antes de descompactar', async () => {
    const a = await comDados();
    const { bytes } = await exportarPacote(a.repo);
    await expect(lerPacote(bytes, { limiteDescompactado: 1_000 })).rejects.toMatchObject({
      motivo: 'arquivo_alterado',
    });
  });
});

describe('apagar tudo', () => {
  it('apaga o banco e os espaços; reabrir cria identidade nova', async () => {
    const { apagarTudo } = await import('./apagar');
    const a = await comDados();
    const outro = await comDados();
    const { espaco } = await importarParaEspaco(
      a.repo,
      await lerPacote((await exportarPacote(outro.repo)).bytes),
      'x',
    );
    await apagarTudo(a.repo);
    const reaberto = await abrir(relogio(), a.nome);
    expect(reaberto.repo.ctx.usuarioId).not.toBe(a.repo.ctx.usuarioId);
    expect(await reaberto.repo.colecao('erros').contar()).toBe(0);
    const espacoReaberto = await Repositorio.abrir({ nomeBanco: espaco.nomeBanco });
    expect(await espacoReaberto.colecao('erros').contar()).toBe(0);
  });
});
