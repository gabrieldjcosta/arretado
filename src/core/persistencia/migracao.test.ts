// Subidas de esquema do banco local, sem perda: v1 (F0/F1) → v2 (`leituras`, F2, 9.1) → v3
// (`vetado` em `Dispositivo.status`, F2, 8.10) → v4 (`vinculosDisciplina`, acervo, Peça 3).
import Dexie from 'dexie';
import { camposMinimos } from '../modelo/fabrica';
import { colecoesNaVersao, NOMES_COLECOES, versaoDeOrigem } from '../modelo';
import { sha256 } from '../pacote/bytes';
import { jsonCanonico } from '../util/json-canonico';
import { apagarBanco, esquemaDaVersao, VERSAO_ESQUEMA } from './banco';
import { Repositorio } from './repositorio';

/** Esquema v1 publicado (F0/F1, até a 8.5): SHA-256 do JSON canônico de `esquemaDaVersao(1)`. */
const HASH_ESQUEMA_V1 = 'b6084efc768d6a4212bae4015560771e726373a9721a408232ebda34d55de0b9';
/** Esquema v2 publicado (F2, da 9.1 à 8.9): SHA-256 do JSON canônico de `esquemaDaVersao(2)`. */
const HASH_ESQUEMA_V2 = 'a503315efcd469f4d9db7ef0e6e0a35bf87d8d4db072f96cc5b7668be368b9a6';

/** Esquema v3 publicado (F2, 8.10 até a Peça 2 do acervo): igual ao v2. */
const HASH_ESQUEMA_V3 = HASH_ESQUEMA_V2;

const hashDoEsquema = async (versao: number) =>
  sha256(new TextEncoder().encode(jsonCanonico(esquemaDaVersao(versao))));

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
      expect(await repo.db.table(tabela).toArray()).toEqual(registros);
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
      expect(await repo.db.table(tabela).toArray()).toEqual(registros);
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
    expect(VERSAO_ESQUEMA).toBe(4);
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 4)).toEqual(['vinculosDisciplina']);
    expect(colecoesNaVersao(3)).not.toContain('vinculosDisciplina');
  });

  it('abre o banco v3 como v4 sem perder nada e aceita o vínculo novo', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId, aparelhoId } = await bancoAntigo(nome, 3);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(4);
    expect([repo.ctx.usuarioId, repo.ctx.aparelhoId]).toEqual([usuarioId, aparelhoId]);
    for (const [tabela, registros] of Object.entries(antes)) {
      expect(await repo.db.table(tabela).toArray()).toEqual(registros);
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
