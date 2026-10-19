// Subidas de esquema do banco local, sem perda: v1 (F0/F1) → v2 (`leituras`, F2, 9.1) → v3
// (`vetado` em `Dispositivo.status`, F2, 8.10) → v4 (`vinculosDisciplina`, acervo, Peça 3) → v5
// (`pendenciasReleitura`, Peça 6a) → v6 (`frases` e `revisoesFrase`, Frases 1) → v7 (`tarefasDeEstudo`, campos novos de
// Sessão e Preferências, F3 P0).
import Dexie from 'dexie';
import { camposMinimos } from '../modelo/fabrica';
import {
  colecoesNaVersao,
  NOMES_COLECOES,
  Preferencias,
  Sessao,
  TarefaDeEstudo,
  Ciclo,
  versaoDeOrigem,
} from '../modelo';
import { sha256 } from '../pacote/bytes';
import { jsonCanonico } from '../util/json-canonico';
import { apagarBanco, esquemaDaVersao, VERSAO_ESQUEMA } from './banco';
import { CHAVE_MIGRACAO_FRASES, migrarFrasesDosErros } from './migracao-frases';
import { Repositorio } from './repositorio';

/** Esquema v1 publicado (F0/F1, até a 8.5): SHA-256 do JSON canônico de `esquemaDaVersao(1)`. */
const HASH_ESQUEMA_V1 = 'b6084efc768d6a4212bae4015560771e726373a9721a408232ebda34d55de0b9';
/** Esquema v2 publicado (F2, da 9.1 à 8.9): SHA-256 do JSON canônico de `esquemaDaVersao(2)`. */
const HASH_ESQUEMA_V2 = 'a503315efcd469f4d9db7ef0e6e0a35bf87d8d4db072f96cc5b7668be368b9a6';

/** Esquema v3 publicado (F2, 8.10 até a Peça 2 do acervo): igual ao v2. */
const HASH_ESQUEMA_V3 = HASH_ESQUEMA_V2;

const hashDoEsquema = async (versao: number) =>
  sha256(new TextEncoder().encode(jsonCanonico(esquemaDaVersao(versao))));

/** A tabela como estava, fora a marca de que a migração das Frases (v6) já rodou. */
async function tabelaSemMarca(repo: Repositorio, tabela: string) {
  const linhas = (await repo.db.table(tabela).toArray()) as { chave?: string }[];
  return tabela === 'meta' ? linhas.filter((l) => l.chave !== CHAVE_MIGRACAO_FRASES) : linhas;
}

const nomeBanco = () => `migracao-${Math.random().toString(36).slice(2)}`;

/** Banco como o app da versão indicada o deixou: identidade, um registro por coleção, log e anexo. */
async function bancoAntigo(nome: string, versao: number) {
  const v1 = new Dexie(nome);
  for (let v = 1; v <= versao; v++) v1.version(v).stores(esquemaDaVersao(v));
  await v1.open();
  const usuarioId = '0199a6c4-0000-7000-8000-0000000000a1';
  const aparelhoId = '0199a6c4-0000-7000-8000-0000000000a2';
  const comuns = {
    usuarioId,
    criadoEm: '2026-09-23T12:00:00.000Z',
    atualizadoEm: '2026-09-23T12:00:00.000Z',
    tsLogico: '1790000000000-000000-0a1b2c3d',
    origem: 'manual',
    excluidoEm: null,
  };
  let n = 0;
  for (const nome of colecoesNaVersao(versao)) {
    n += 1;
    const id =
      nome === 'usuarios'
        ? usuarioId
        : nome === 'aparelhos'
          ? aparelhoId
          : `0199a6c4-0000-7000-8000-${String(n).padStart(12, '0')}`;
    await v1.table(nome).put({ ...comuns, id, ...camposMinimos(nome, usuarioId) });
  }
  await v1.table('meta').put({ chave: 'identidade', valor: { usuarioId, aparelhoId } });
  await v1.table('alteracoes').put({
    ts: comuns.tsLogico,
    aparelhoId,
    usuarioId,
    colecao: 'erros',
    registroId: usuarioId,
    operacao: 'gravar',
    dados: {},
  });
  await v1.table('anexosConteudo').put({ id: usuarioId, bytes: new Uint8Array([1, 2, 3]) });
  const antes: Record<string, unknown[]> = {};
  for (const t of v1.tables) antes[t.name] = await t.toArray();
  v1.close();
  return { antes, usuarioId, aparelhoId };
}

describe('subida de esquema v1 → v2 (9.1)', () => {
  it('o esquema v1 não muda: alterar coleção antiga pede versão nova', async () => {
    // Hash do esquema v1 publicado (F0/F1). Se mudou, não edite a v1: declare a versão seguinte.
    expect(await hashDoEsquema(1)).toBe(HASH_ESQUEMA_V1);
  });

  it('só `leituras` nasce na v2', () => {
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 2)).toEqual(['leituras']);
    expect(colecoesNaVersao(1)).not.toContain('leituras');
  });

  it('abre o banco v1 na versão atual sem perder registro, log, anexo nem identidade', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId, aparelhoId } = await bancoAntigo(nome, 1);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    expect(repo.ctx.usuarioId).toBe(usuarioId);
    expect(repo.ctx.aparelhoId).toBe(aparelhoId);
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await tabelaSemMarca(repo, tabela)).toEqual(registros);
    }
    // A coleção nova existe vazia e aceita gravação.
    expect(await repo.db.tabela('leituras').count()).toBe(0);
    const normaId = (antes.normas?.[0] as { id: string }).id;
    const l = await repo.colecao('leituras').criar({ normaId, lidoAteId: normaId });
    const [achada] = await repo
      .colecao('leituras')
      .listarPagina({
        indice: '[usuarioId+normaId]',
        de: [usuarioId, normaId],
        ate: [usuarioId, normaId],
        limite: 1,
      })
      .then((p) => p.itens);
    expect(achada?.id).toBe(l.id);
    repo.fechar();
    await apagarBanco(nome);
  });

  it('avisa a aba aberta quando outra sobe o esquema ou apaga o banco', async () => {
    const nome = nomeBanco();
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    const motivos: string[] = [];
    repo.db.aoFecharPorOutraAba((m) => motivos.push(m));
    const futura = new Dexie(nome);
    futura.version(VERSAO_ESQUEMA + 1).stores(esquemaDaVersao(VERSAO_ESQUEMA));
    await futura.open();
    expect(motivos).toEqual(['versao']);
    expect(repo.db.isOpen()).toBe(false);
    futura.close();

    const outra = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    outra.db.aoFecharPorOutraAba((m) => motivos.push(m));
    await apagarBanco(outra.db.name);
    expect(motivos).toEqual(['versao', 'apagado']);
  });
});

describe('subida de esquema v2 → v3 (8.10): `vetado` no status, sem índice nem coleção nova', () => {
  it('o esquema v2 não muda, e o v3 declara os mesmos índices', async () => {
    // Se mudou, não edite a v2 publicada: declare a versão seguinte.
    expect(await hashDoEsquema(2)).toBe(HASH_ESQUEMA_V2);
    expect(esquemaDaVersao(3)).toEqual(esquemaDaVersao(2));
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 3)).toEqual([]);
  });

  it('abre o banco v2 como v3 sem perder nada; o vetado gravado antes continua vigente com "(VETADO)"', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId, aparelhoId } = await bancoAntigo(nome, 2);
    // Como a gravação anterior à 8.10 deixava o dispositivo vetado.
    const dispositivo = antes.dispositivos?.[0] as { id: string; status: string };
    const texto = antes.textosDispositivo?.[0] as { id: string };
    const v2 = new Dexie(nome);
    v2.version(2).stores(esquemaDaVersao(2));
    await v2.table('textosDispositivo').update(texto.id, {
      dispositivoId: dispositivo.id,
      trechos: [{ texto: '(VETADO)' }],
    });
    for (const t of v2.tables) antes[t.name] = await t.toArray();
    v2.close();

    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    expect([repo.ctx.usuarioId, repo.ctx.aparelhoId]).toEqual([usuarioId, aparelhoId]);
    // Nenhum registro transformado: a subida não migra o vetado gravado antes.
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await tabelaSemMarca(repo, tabela)).toEqual(registros);
    }
    expect((await repo.colecao('dispositivos').obter(dispositivo.id))?.status).toBe('vigente');
    expect((await repo.colecao('leituras').todosDoUsuario()).length).toBe(1);
    // O status novo grava e relê.
    const normaId = (antes.normas?.[0] as { id: string }).id;
    const vetado = await repo.colecao('dispositivos').criar({
      normaId,
      endereco: 'art2',
      categoria: 'normativo',
      tipo: 'artigo',
      ordem: 2,
      status: 'vetado',
      confianca: 'alta',
    });
    expect((await repo.colecao('dispositivos').obter(vetado.id))?.status).toBe('vetado');
    repo.fechar();
    await apagarBanco(nome);
  });
});

describe('subida de esquema v3 → v4 (acervo, Peça 3): `vinculosDisciplina`', () => {
  it('o esquema v3 não muda; só `vinculosDisciplina` nasce na v4', async () => {
    expect(await hashDoEsquema(3)).toBe(HASH_ESQUEMA_V3);
    expect(VERSAO_ESQUEMA).toBeGreaterThanOrEqual(4);
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 4)).toEqual(['vinculosDisciplina']);
    expect(colecoesNaVersao(3)).not.toContain('vinculosDisciplina');
  });

  it('abre o banco v3 como v4 sem perder nada e aceita o vínculo novo', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId, aparelhoId } = await bancoAntigo(nome, 3);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    expect([repo.ctx.usuarioId, repo.ctx.aparelhoId]).toEqual([usuarioId, aparelhoId]);
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await tabelaSemMarca(repo, tabela)).toEqual(registros);
    }
    expect(await repo.db.tabela('vinculosDisciplina').count()).toBe(0);
    const normaId = (antes.normas?.[0] as { id: string }).id;
    const v = await repo
      .colecao('vinculosDisciplina')
      .criar({ normaId, sugestao: 'Direito Penal' });
    expect((await repo.colecao('vinculosDisciplina').obter(v.id))?.normaId).toBe(normaId);
    repo.fechar();
    await apagarBanco(nome);
  });
});

describe('subida de esquema v4 → v5 (acervo, Peça 6a): `pendenciasReleitura`', () => {
  it('o esquema v4 não muda; só `pendenciasReleitura` nasce na v5', () => {
    expect(VERSAO_ESQUEMA).toBeGreaterThanOrEqual(5);
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 5)).toEqual(['pendenciasReleitura']);
    expect(colecoesNaVersao(4)).not.toContain('pendenciasReleitura');
    expect(colecoesNaVersao(4)).toContain('vinculosDisciplina');
  });

  it('abre o banco v4 como v5 sem perder nada e aceita a pendência nova', async () => {
    const nome = nomeBanco();
    const { antes } = await bancoAntigo(nome, 4);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await tabelaSemMarca(repo, tabela)).toEqual(registros);
    }
    expect(await repo.db.tabela('pendenciasReleitura').count()).toBe(0);
    repo.fechar();
    await apagarBanco(nome);
  });
});

describe('subida de esquema v5 → v6 (Frases 1): `frases` e `revisoesFrase`', () => {
  it('só `frases` e `revisoesFrase` nascem na v6; as coleções antigas mantêm os índices', () => {
    expect(VERSAO_ESQUEMA).toBeGreaterThanOrEqual(6);
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 6)).toEqual([
      'frases',
      'revisoesFrase',
    ]);
    const v5 = esquemaDaVersao(5);
    const v6 = esquemaDaVersao(6);
    for (const [tabela, indices] of Object.entries(v5)) expect(v6[tabela]).toBe(indices);
  });

  it('abre o banco v5 como v6: cada erro com frase correta ganha a sua Frase, uma vez só', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId } = await bancoAntigo(nome, 5);
    // Erros como o app v5 gravava: com frase, sem frase, descartado e excluído.
    const v5 = new Dexie(nome);
    for (let v = 1; v <= 5; v++) v5.version(v).stores(esquemaDaVersao(v));
    const comuns = (antes.erros?.[0] ?? {}) as Record<string, unknown>;
    const disciplinaId = (antes.disciplinas?.[0] as { id: string }).id;
    const erro = (n: number, extra: Record<string, unknown>) => ({
      ...comuns,
      id: `0199a6c4-0000-7000-8000-0000000009${String(n).padStart(2, '0')}`,
      criadoEm: `2026-09-2${String(n)}T12:00:00.000Z`,
      ...extra,
    });
    await v5
      .table('erros')
      .bulkPut([
        erro(4, { fraseCorreta: 'Segunda.', disciplinaId }),
        erro(3, { fraseCorreta: 'Primeira.' }),
        erro(5, { fraseCorreta: 'Descartada.', status: 'descartado' }),
        erro(6, { fraseCorreta: 'Excluída.', excluidoEm: '2026-09-27T12:00:00.000Z' }),
        erro(7, { fraseCorreta: '   ' }),
      ]);
    const errosAntes = await v5.table('erros').toArray();
    const logAntes = await v5.table('alteracoes').count();
    v5.close();

    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    expect(await repo.db.table('erros').toArray()).toEqual(errosAntes);
    const frases = await repo.colecao('frases').todosDoUsuario();
    expect(
      frases
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((f) => [f.texto, f.erroId, f.estado, f.disciplinaId, f.origem, f.origemTipo]),
    ).toEqual([
      ['Primeira.', erro(3, {}).id, 'ativa', undefined, 'sistema', 'erro'],
      ['Segunda.', erro(4, {}).id, 'ativa', disciplinaId, 'sistema', 'erro'],
      ['Descartada.', erro(5, {}).id, 'arquivada', undefined, 'sistema', 'erro'],
    ]);
    expect(frases.every((f) => f.usuarioId === usuarioId)).toBe(true);
    // Cada Frase criada está no log (base da sincronização e do desfazer).
    expect(await repo.db.alteracoes.count()).toBe(logAntes + 3);
    expect((await repo.db.meta.get(CHAVE_MIGRACAO_FRASES))?.valor).toBe(true);
    repo.fechar();

    // Reabrir não roda de novo; rodar à mão também não duplica.
    const outra = await Repositorio.abrir({ nomeBanco: nome });
    expect(await outra.colecao('frases').contar()).toBe(3);
    expect(await migrarFrasesDosErros(outra)).toBe(0);
    expect(await outra.colecao('frases').contar()).toBe(3);
    outra.fechar();
    await apagarBanco(nome);
  });
});

describe('subida de esquema v6 → v7 (F3, P0): `tarefasDeEstudo` e campos opcionais', () => {
  it('só `tarefasDeEstudo` nasce na v7; as coleções antigas mantêm os índices', () => {
    expect(VERSAO_ESQUEMA).toBeGreaterThanOrEqual(7);
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 7)).toEqual(['tarefasDeEstudo']);
    expect(colecoesNaVersao(6)).not.toContain('tarefasDeEstudo');
    const v6 = esquemaDaVersao(6);
    const v7 = esquemaDaVersao(7);
    for (const [tabela, indices] of Object.entries(v6)) expect(v7[tabela]).toBe(indices);
    expect(Object.keys(v7).filter((t) => !(t in v6))).toEqual(['tarefasDeEstudo']);
  });

  it('abre o banco v6 como v7 sem perder nada, tabela a tabela; Sessão e Preferências antigas seguem válidas', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId, aparelhoId } = await bancoAntigo(nome, 6);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    expect([repo.ctx.usuarioId, repo.ctx.aparelhoId]).toEqual([usuarioId, aparelhoId]);
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await tabelaSemMarca(repo, tabela)).toEqual(registros);
    }
    // Registros gravados na v6 passam no esquema novo (campos novos são todos opcionais).
    const sessao = (await repo.colecao('sessoes').todosDoUsuario())[0];
    const prefs = (await repo.colecao('preferencias').todosDoUsuario())[0];
    expect(Sessao.safeParse(sessao).success).toBe(true);
    expect(Preferencias.safeParse(prefs).success).toBe(true);
    // A coleção nova existe vazia e aceita gravação; o log registra.
    expect(await repo.db.tabela('tarefasDeEstudo').count()).toBe(0);
    const logAntes = await repo.db.alteracoes.count();
    const tarefa = await repo
      .colecao('tarefasDeEstudo')
      .criar(camposMinimos('tarefasDeEstudo', usuarioId));
    expect(TarefaDeEstudo.safeParse(tarefa).success).toBe(true);
    expect(await repo.db.alteracoes.count()).toBe(logAntes + 1);
    repo.fechar();
    await apagarBanco(nome);
  });

  it('grava Sessão e Preferências com os campos novos da F3', async () => {
    const nome = nomeBanco();
    const { usuarioId } = await bancoAntigo(nome, 6);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    const em = '2026-10-13T12:00:00.000Z';
    const sessao = (await repo.colecao('sessoes').todosDoUsuario())[0];
    if (!sessao) throw new Error('sessão esperada');
    const nova = await repo.colecao('sessoes').atualizar(sessao.id, {
      alvo: { tipo: 'leitura', rotulo: 'LEP' },
      fronteira: 'até o art. 15',
      proximoPasso: 'Ler os arts. 16 a 20',
      estacionamento: [{ texto: 'ver prazo do art. 112', em }],
      origemDaAcao: { tipo: 'leitura_salva', razao: 'Você parou aqui.' },
      temporizadorMin: 25,
    });
    expect(Sessao.safeParse(nova).success).toBe(true);
    const prefs = (await repo.colecao('preferencias').todosDoUsuario())[0];
    if (!prefs) throw new Error('preferências esperadas');
    const novas = await repo.colecao('preferencias').atualizar(prefs.id, {
      perfilDeEstudo: 'guiado',
      perfilAnterior: 'calmo',
      modoSoEstudo: true,
      temporizadorPadraoMin: 25,
    });
    expect(Preferencias.safeParse(novas).success).toBe(true);
    expect(usuarioId).toBe(novas.usuarioId);
    repo.fechar();
    await apagarBanco(nome);
  });
});

describe('subida de esquema v8 → v9 (ciclos): `ciclos` e campos opcionais da Sessão', () => {
  it('só `ciclos` nasce na v9; as coleções antigas mantêm os índices', () => {
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 9)).toEqual(['ciclos']);
    expect(colecoesNaVersao(8)).not.toContain('ciclos');
    const v8 = esquemaDaVersao(8);
    const v9 = esquemaDaVersao(9);
    for (const [tabela, indices] of Object.entries(v8)) expect(v9[tabela]).toBe(indices);
    expect(Object.keys(v9).filter((t) => !(t in v8))).toEqual(['ciclos']);
  });

  it('abre o banco v8 como v9 sem perder nada; Sessão antiga segue válida e aceita cicloId', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId } = await bancoAntigo(nome, 8);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(VERSAO_ESQUEMA);
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await tabelaSemMarca(repo, tabela)).toEqual(registros);
    }
    expect(await repo.db.tabela('ciclos').count()).toBe(0);
    const ciclo = await repo.colecao('ciclos').criar(camposMinimos('ciclos', usuarioId));
    expect(Ciclo.safeParse(ciclo).success).toBe(true);
    const sessao = (await repo.colecao('sessoes').todosDoUsuario())[0];
    if (!sessao) throw new Error('sessão esperada');
    expect(Sessao.safeParse(sessao).success).toBe(true);
    const nova = await repo
      .colecao('sessoes')
      .atualizar(sessao.id, { cicloId: ciclo.id, blocoOrdem: 0 });
    expect(Sessao.safeParse(nova).success).toBe(true);
    repo.fechar();
    await apagarBanco(nome);
  });
});
