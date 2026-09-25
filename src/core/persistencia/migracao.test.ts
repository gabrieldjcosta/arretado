// Subida de esquema do banco local (F2, 9.1): v1 (F0/F1) → v2 (`leituras`), sem perda.
import Dexie from 'dexie';
import { camposMinimos } from '../modelo/fabrica';
import { colecoesNaVersao, NOMES_COLECOES, versaoDeOrigem } from '../modelo';
import { sha256 } from '../pacote/bytes';
import { jsonCanonico } from '../util/json-canonico';
import { apagarBanco, esquemaDaVersao, VERSAO_ESQUEMA } from './banco';
import { Repositorio } from './repositorio';

/** Esquema v1 publicado (F0/F1, até a 8.5): SHA-256 do JSON canônico de `esquemaDaVersao(1)`. */
const HASH_ESQUEMA_V1 = 'b6084efc768d6a4212bae4015560771e726373a9721a408232ebda34d55de0b9';

const nomeBanco = () => `migracao-${Math.random().toString(36).slice(2)}`;

/** Banco como o app v1 o deixou: identidade, um registro por coleção, log e anexo. */
async function bancoV1(nome: string) {
  const v1 = new Dexie(nome);
  v1.version(1).stores(esquemaDaVersao(1));
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
  for (const nome of colecoesNaVersao(1)) {
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
    expect(await sha256(new TextEncoder().encode(jsonCanonico(esquemaDaVersao(1))))).toBe(
      HASH_ESQUEMA_V1,
    );
  });

  it('só `leituras` nasce na v2', () => {
    expect(VERSAO_ESQUEMA).toBe(2);
    expect(NOMES_COLECOES.filter((n) => versaoDeOrigem(n) === 2)).toEqual(['leituras']);
    expect(colecoesNaVersao(1)).not.toContain('leituras');
  });

  it('abre o banco v1 como v2 sem perder registro, log, anexo nem identidade', async () => {
    const nome = nomeBanco();
    const { antes, usuarioId, aparelhoId } = await bancoV1(nome);
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    expect(repo.db.verno).toBe(2);
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
