// Migração do uso local para a conta (F4-A, A4; plano f4a-contas.md §5). Repositório real no
// fake-indexeddb e banco sintético com todas as coleções da v8 (fixtures/banco-sintetico.ts).
import Dexie from 'dexie';
import { colecoesNaVersao, ENTIDADES, NOMES_COLECOES, type NomeColecao } from '../modelo';
import {
  BancoArretado,
  lerUltimoBackup,
  nomeBancoDaConta,
  reconstruirDoLog,
  RegistroDeContas,
  Repositorio,
  VERSAO_ESQUEMA,
  type Alteracao,
} from '../persistencia';
import type { PacoteGerado } from './exportar';
import { criarBancoSintetico, type BancoSintetico } from './fixtures/banco-sintetico';
import { lerPacote } from './ler';
import {
  apagarCopiaAnterior,
  copiaAnterior,
  estadoDaMigracao,
  InterrupcaoSimulada,
  migrarParaConta,
  preverMigracao,
  type EtapaMigracao,
  type OpcoesMigracao,
} from './migrar-para-conta';

const UID = '0b7c2f3e-5a1d-4c6e-9f80-123456789abc';
const OUTRO_UID = '7d2e9c41-0f3b-4a8d-b6e5-fedcba987654';
const AGORA = new Date('2026-10-14T15:30:00.000Z');

/** Coleções que vão para o banco da conta (as só locais ficam na cópia anterior). */
const COPIADAS = NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo !== null);
const SO_LOCAIS = NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo === null);

let n = 0;
function nomeUnico(prefixo: string): string {
  n += 1;
  return `${prefixo}-${String(n)}-${Math.random().toString(36).slice(2)}`;
}

async function origemSintetica(): Promise<BancoSintetico> {
  return criarBancoSintetico(nomeUnico('origem'));
}

function registroDeTeste(): RegistroDeContas {
  return new RegistroDeContas(nomeUnico('registro'));
}

/** Conteúdo inteiro de um banco, tabela a tabela (meta, log com `seq` e binários incluídos). */
async function fotografia(nomeBanco: string): Promise<string> {
  const db = new BancoArretado(nomeBanco);
  await db.open();
  try {
    const tabelas: Record<string, unknown[]> = {};
    for (const t of [...db.tables].sort((a, b) => (a.name < b.name ? -1 : 1))) {
      tabelas[t.name] = await t.toArray();
    }
    return JSON.stringify({ versao: db.verno, tabelas }, (_k, v: unknown) =>
      v instanceof Uint8Array ? Array.from(v) : v,
    );
  } finally {
    db.close();
  }
}

async function existe(nomeBanco: string): Promise<boolean> {
  return Dexie.exists(nomeBanco);
}

function opcoes(registro: RegistroDeContas, extra: Partial<OpcoesMigracao> = {}) {
  const backups: PacoteGerado[] = [];
  const etapas: EtapaMigracao[] = [];
  const o: OpcoesMigracao = {
    uid: UID,
    registro,
    agora: AGORA,
    baixarBackup: (p) => {
      backups.push(p);
      return Promise.resolve();
    },
    aoAvancar: (e) => etapas.push(e),
    ...extra,
  };
  return { o, backups, etapas };
}

function porId<T extends { id: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** O que o banco da conta deve conter: o registro da origem com o dono trocado e nada mais. */
function comDono(r: Record<string, unknown>, uid: string): Record<string, unknown> {
  return { ...r, usuarioId: uid };
}

function logEsperado(log: Alteracao[], de: string, uid: string): Alteracao[] {
  const copiadas = new Set<string>(COPIADAS);
  return log
    .filter((a) => a.usuarioId === de && copiadas.has(a.colecao))
    .map((a) => ({
      ...a,
      usuarioId: uid,
      ...(a.dados && 'usuarioId' in a.dados ? { dados: { ...a.dados, usuarioId: uid } } : {}),
    }));
}

async function abrirConta(uid = UID): Promise<Repositorio> {
  return Repositorio.abrir({ nomeBanco: nomeBancoDaConta(uid) });
}

const abertos: Repositorio[] = [];
afterEach(() => {
  for (const r of abertos.splice(0)) r.fechar();
});

async function prepararOrigem(): Promise<BancoSintetico> {
  const b = await origemSintetica();
  abertos.push(b.repo);
  return b;
}

async function limparConta(uid = UID): Promise<void> {
  await Dexie.delete(nomeBancoDaConta(uid));
}

beforeEach(async () => {
  await limparConta(UID);
  await limparConta(OUTRO_UID);
});

describe('banco sintético (fixture)', () => {
  it('cobre todas as coleções da v8, com exclusão lógica, lote de adesão e só locais', async () => {
    const { repo, contagens, ids } = await prepararOrigem();
    expect(VERSAO_ESQUEMA).toBe(8);
    for (const nome of colecoesNaVersao(8)) expect(contagens[nome], nome).toBeGreaterThan(0);
    expect(
      (await repo.colecao('tags').obter(ids.tagExcluida, { incluirExcluidos: true }))?.excluidoEm,
    ).not.toBeNull();
    const log = await repo.db.alteracoes.toArray();
    expect(log.some((a) => a.operacao === 'atualizar')).toBe(true);
    expect(log.some((a) => a.operacao === 'remover')).toBe(true);
    // Lote de adesão: os 5 dispositivos e os 5 textos no mesmo instante, origem `importacao`.
    const dispositivos = await repo.colecao('dispositivos').todosDoUsuario();
    expect(dispositivos).toHaveLength(5);
    expect(dispositivos.every((d) => d.origem === 'importacao')).toBe(true);
    expect(await repo.db.anexosConteudo.get(ids.anexo)).toBeDefined();
    expect(await repo.db.snapshotsConteudo.get(ids.snapshot)).toBeDefined();
  });

  it('é determinístico: mesma semente, mesmo banco', async () => {
    const a = await prepararOrigem();
    const b = await prepararOrigem();
    a.repo.fechar();
    b.repo.fechar();
    const fa = await fotografia(a.repo.db.name);
    const fb = await fotografia(b.repo.db.name);
    expect(fa).toBe(fb);
  });
});

describe('preverMigracao', () => {
  it('conta coleções, registros e bytes do que será copiado, sem escrever nada', async () => {
    const { repo, contagens } = await prepararOrigem();
    const antes = await fotografia(repo.db.name);
    const bancosAntes = await Dexie.getDatabaseNames();

    const previa = await preverMigracao(repo);

    const esperado: Partial<Record<NomeColecao, number>> = {};
    for (const nome of COPIADAS) if (contagens[nome] > 0) esperado[nome] = contagens[nome];
    expect(previa.porColecao).toEqual(esperado);
    expect(previa.colecoes).toBe(Object.keys(esperado).length);
    expect(previa.registros).toBe(Object.values(esperado).reduce((s, x) => s + x, 0));
    expect(previa.bytes).toBeGreaterThan(4); // inclui os 4 bytes do anexo
    for (const nome of SO_LOCAIS) expect(previa.porColecao[nome]).toBeUndefined();

    expect(await fotografia(repo.db.name)).toBe(antes);
    expect(await Dexie.getDatabaseNames()).toEqual(bancosAntes);
  });
});

describe('migrarParaConta: sucesso', () => {
  it('copia tudo para arretado-c-<uid> com usuarioId = uid, aparelhoId e relógio preservados', async () => {
    const { repo: origem, contagens } = await prepararOrigem();
    const registro = registroDeTeste();
    const antes = await fotografia(origem.db.name);
    const usuarioLocal = origem.ctx.usuarioId;
    const logOrigem = await origem.db.alteracoes.toArray();
    const contaAntesDoBackup: boolean[] = [];
    const { o, backups, etapas } = opcoes(registro, {
      baixarBackup: async (p) => {
        contaAntesDoBackup.push(await existe(nomeBancoDaConta(UID)));
        backups.push(p);
      },
    });

    const r = await migrarParaConta(origem, o);

    expect(r.tipo).toBe('concluida');
    if (r.tipo !== 'concluida') return;
    expect(r.uid).toBe(UID);
    expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(etapas).toEqual(['backup', 'copia', 'verificacao', 'ativacao']);

    // Backup: pacote integral, com log e anexos, da identidade local, antes de qualquer cópia.
    expect(backups).toHaveLength(1);
    expect(contaAntesDoBackup).toEqual([false]);
    const lido = await lerPacote(backups[0]?.bytes ?? new Uint8Array());
    expect(lido.manifesto.escopo).toEqual({ tipo: 'integral' });
    expect(lido.manifesto.incluiLog).toBe(true);
    expect(lido.manifesto.incluiAnexos).toBe(true);
    expect(lido.manifesto.usuarioId).toBe(usuarioLocal);

    // Contagens por coleção iguais às da origem.
    const esperado: Partial<Record<NomeColecao, number>> = {};
    for (const nome of COPIADAS) if (contagens[nome] > 0) esperado[nome] = contagens[nome];
    expect(r.contagens).toEqual(esperado);

    const conta = await abrirConta();
    abertos.push(conta);
    expect(conta.ctx.usuarioId).toBe(UID);
    expect(conta.ctx.aparelhoId).toBe(origem.ctx.aparelhoId);

    // Registros: os mesmos, campo a campo (ids, tsLogico, carimbos, excluídos), só o dono trocado.
    for (const nome of COPIADAS) {
      const daOrigem = porId(await origem.colecao(nome).todosDoUsuario());
      const daConta = porId(await conta.db.tabela(nome).toArray());
      expect(daConta, nome).toEqual(daOrigem.map((x) => comDono(x, UID)));
      expect(daConta.every((x) => x.usuarioId === UID)).toBe(true);
      expect(daConta.map((x) => x.tsLogico)).toEqual(daOrigem.map((x) => x.tsLogico));
    }
    for (const nome of SO_LOCAIS) expect(await conta.db.tabela(nome).count(), nome).toBe(0);
    expect(await conta.db.tabela('tags').where('usuarioId').equals(usuarioLocal).count()).toBe(0);

    // Log: mesmas entradas, na mesma ordem, com ts e aparelhoId de origem; só o dono trocado.
    const logConta = await conta.db.alteracoes.toArray();
    expect(logConta).toEqual(logEsperado(logOrigem, usuarioLocal, UID));
    expect(logConta.every((a) => a.usuarioId === UID)).toBe(true);
    expect(logConta.every((a) => a.aparelhoId === origem.ctx.aparelhoId)).toBe(true);

    // O log reconstrói exatamente o estado do banco novo.
    const estado = reconstruirDoLog(logConta);
    for (const nome of COPIADAS) {
      const reconstruido = porId([...(estado.get(nome)?.values() ?? [])] as { id: string }[]);
      expect(reconstruido, nome).toEqual(porId(await conta.db.tabela(nome).toArray()));
    }

    // Binário dos anexos.
    expect(await conta.db.anexosConteudo.toArray()).toEqual(
      await origem.db.anexosConteudo.toArray(),
    );

    // O backup da migração vale como último backup da conta (a origem não é tocada).
    expect(await lerUltimoBackup(conta)).toBe(AGORA.toISOString());

    // Relógio: a próxima escrita no banco da conta vem depois de tudo e é deste aparelho.
    const maior =
      logOrigem
        .map((a) => a.ts)
        .sort()
        .at(-1) ?? '';
    const nova = await conta.colecao('tags').criar({ nome: 'Depois da conta' });
    expect(nova.tsLogico > maior).toBe(true);
    expect(nova.tsLogico.slice(-8)).toBe(origem.ctx.aparelhoId.replace(/-/g, '').slice(-8));

    // Conta ativada, migração concluída, cópia anterior marcada; a origem fica intacta.
    expect((await registro.contaAtiva())?.uid).toBe(UID);
    expect(await estadoDaMigracao(UID, registro)).toBe('concluida');
    expect(await copiaAnterior(registro)).toEqual({
      nomeBanco: origem.db.name,
      uid: UID,
      migradoEm: AGORA.toISOString(),
    });
    expect(await existe(origem.db.name)).toBe(true);
    expect(await fotografia(origem.db.name)).toBe(antes);
  });

  it('o hash não depende do uid: a mesma origem dá o mesmo hash em contas diferentes', async () => {
    const a = await prepararOrigem();
    const b = await prepararOrigem();
    const ra = await migrarParaConta(a.repo, opcoes(registroDeTeste()).o);
    const rb = await migrarParaConta(b.repo, opcoes(registroDeTeste(), { uid: OUTRO_UID }).o);
    expect(ra.tipo).toBe('concluida');
    expect(rb.tipo).toBe('concluida');
    if (ra.tipo !== 'concluida' || rb.tipo !== 'concluida') return;
    expect(ra.hash).toBe(rb.hash);
    expect(rb.uid).toBe(OUTRO_UID);
  });
});

describe('migrarParaConta: falhas', () => {
  it('backup que falha: nada começa, nenhum banco novo', async () => {
    const { repo: origem } = await prepararOrigem();
    const registro = registroDeTeste();
    const antes = await fotografia(origem.db.name);
    const { o, etapas } = opcoes(registro, {
      baixarBackup: () => Promise.reject(new Error('download cancelado')),
    });

    const r = await migrarParaConta(origem, o);

    expect(r).toMatchObject({ tipo: 'falhou', etapa: 'backup' });
    expect(etapas).toEqual(['backup']);
    expect(await existe(nomeBancoDaConta(UID))).toBe(false);
    expect(await estadoDaMigracao(UID, registro)).toBe('nenhuma');
    expect(await registro.contaAtiva()).toBeNull();
    expect(await copiaAnterior(registro)).toBeNull();
    expect(await fotografia(origem.db.name)).toBe(antes);
  });

  it('verificação que falha: apaga o banco novo, origem intacta, conta não ativada', async () => {
    const { repo: origem } = await prepararOrigem();
    // Registro gravado fora do log: o log da cópia não reconstrói o estado.
    const [tag] = await origem.colecao('tags').todosDoUsuario();
    if (!tag) throw new Error('fixture sem tag');
    await origem.db.tabela('tags').put({ ...tag, id: '5f0c1d2e-3a4b-4c5d-8e6f-0a1b2c3d4e5f' });
    const registro = registroDeTeste();
    const antes = await fotografia(origem.db.name);

    const r = await migrarParaConta(origem, opcoes(registro).o);

    expect(r).toMatchObject({ tipo: 'falhou', etapa: 'verificacao' });
    if (r.tipo === 'falhou') expect(r.motivo.length).toBeGreaterThan(0);
    expect(await existe(nomeBancoDaConta(UID))).toBe(false);
    expect(await estadoDaMigracao(UID, registro)).toBe('nenhuma');
    expect(await registro.contaAtiva()).toBeNull();
    expect(await copiaAnterior(registro)).toBeNull();
    expect(await fotografia(origem.db.name)).toBe(antes);
  });

  it('conta que já tem dados neste aparelho: nada é apagado nem copiado', async () => {
    const { repo: origem } = await prepararOrigem();
    const registro = registroDeTeste();
    const conta = await Repositorio.abrir({ nomeBanco: nomeBancoDaConta(UID), usuarioId: UID });
    await conta.colecao('tags').criar({ nome: 'Estudo já feito na conta' });
    conta.fechar();
    const contaAntes = await fotografia(nomeBancoDaConta(UID));
    const antes = await fotografia(origem.db.name);

    const r = await migrarParaConta(origem, opcoes(registro).o);

    expect(r.tipo).toBe('falhou');
    expect(await fotografia(nomeBancoDaConta(UID))).toBe(contaAntes);
    expect(await fotografia(origem.db.name)).toBe(antes);
    expect(await registro.contaAtiva()).toBeNull();
    expect(await copiaAnterior(registro)).toBeNull();
  });
});

describe('migrarParaConta: interrupções', () => {
  it.each<EtapaMigracao>(['copia', 'verificacao', 'ativacao'])(
    'interrompida em %s: origem igual, em-andamento, conta não ativada; a próxima vez refaz do zero',
    async (etapa) => {
      const { repo: origem, contagens } = await prepararOrigem();
      const registro = registroDeTeste();
      const antes = await fotografia(origem.db.name);
      const logOrigem = await origem.db.alteracoes.toArray();

      await expect(
        migrarParaConta(origem, opcoes(registro, { interromperEm: etapa }).o),
      ).rejects.toBeInstanceOf(InterrupcaoSimulada);

      expect(await fotografia(origem.db.name)).toBe(antes);
      expect(await estadoDaMigracao(UID, registro)).toBe('em-andamento');
      expect(await registro.contaAtiva()).toBeNull();
      expect(await copiaAnterior(registro)).toBeNull();

      // Resto de uma tentativa anterior no banco da conta não pode sobreviver ao recomeço.
      if (await existe(nomeBancoDaConta(UID))) {
        const sobra = await abrirConta();
        await sobra.colecao('tags').criar({ nome: 'Sobra da tentativa interrompida' });
        sobra.fechar();
      }

      const r = await migrarParaConta(origem, opcoes(registro).o);

      expect(r.tipo).toBe('concluida');
      if (r.tipo !== 'concluida') return;
      const esperado: Partial<Record<NomeColecao, number>> = {};
      for (const nome of COPIADAS) if (contagens[nome] > 0) esperado[nome] = contagens[nome];
      expect(r.contagens).toEqual(esperado);
      const conta = await abrirConta();
      abertos.push(conta);
      for (const nome of COPIADAS) {
        expect(await conta.db.tabela(nome).count(), nome).toBe(contagens[nome]);
      }
      expect(await conta.db.alteracoes.toArray()).toEqual(
        logEsperado(logOrigem, origem.ctx.usuarioId, UID),
      );
      expect(await estadoDaMigracao(UID, registro)).toBe('concluida');
      expect((await registro.contaAtiva())?.uid).toBe(UID);
      expect(await fotografia(origem.db.name)).toBe(antes);
    },
  );

  it('interrompida e depois usada como conta: o estudo feito nela não é apagado', async () => {
    const { repo: origem } = await prepararOrigem();
    const registro = registroDeTeste();
    await expect(
      migrarParaConta(origem, opcoes(registro, { interromperEm: 'verificacao' }).o),
    ).rejects.toBeInstanceOf(InterrupcaoSimulada);
    // A pessoa entrou na conta por outro caminho e estudou nela.
    await registro.ativar(UID);
    const conta = await abrirConta();
    await conta.colecao('tags').criar({ nome: 'Estudo feito na conta' });
    conta.fechar();
    const contaAntes = await fotografia(nomeBancoDaConta(UID));

    const r = await migrarParaConta(origem, opcoes(registro).o);

    expect(r.tipo).toBe('falhou');
    expect(await fotografia(nomeBancoDaConta(UID))).toBe(contaAntes);
  });
});

describe('migrarParaConta: repetição', () => {
  it('rodar de novo depois de concluída não duplica nem regrava nada', async () => {
    const { repo: origem } = await prepararOrigem();
    const registro = registroDeTeste();
    const primeira = await migrarParaConta(origem, opcoes(registro).o);
    expect(primeira.tipo).toBe('concluida');
    const contaAntes = await fotografia(nomeBancoDaConta(UID));
    const origemAntes = await fotografia(origem.db.name);
    const { o, backups } = opcoes(registro);

    const segunda = await migrarParaConta(origem, o);

    expect(segunda).toEqual(primeira);
    expect(backups).toHaveLength(0);
    expect(await fotografia(nomeBancoDaConta(UID))).toBe(contaAntes);
    expect(await fotografia(origem.db.name)).toBe(origemAntes);
    expect(await estadoDaMigracao(UID, registro)).toBe('concluida');
  });
});

describe('cópia anterior', () => {
  it('apagarCopiaAnterior remove só a origem marcada; o banco da conta e os outros ficam', async () => {
    const { repo: origem } = await prepararOrigem();
    const outro = await prepararOrigem();
    const registro = registroDeTeste();
    expect(await copiaAnterior(registro)).toBeNull();
    await apagarCopiaAnterior(registro); // sem cópia: nada a fazer
    expect((await migrarParaConta(origem, opcoes(registro).o)).tipo).toBe('concluida');
    const contaAntes = await fotografia(nomeBancoDaConta(UID));

    await apagarCopiaAnterior(registro);

    expect(await existe(origem.db.name)).toBe(false);
    expect(await existe(outro.repo.db.name)).toBe(true);
    expect(await fotografia(nomeBancoDaConta(UID))).toBe(contaAntes);
    expect(await copiaAnterior(registro)).toBeNull();
    expect((await registro.contaAtiva())?.uid).toBe(UID);
    expect(await estadoDaMigracao(UID, registro)).toBe('concluida');
  });
});
