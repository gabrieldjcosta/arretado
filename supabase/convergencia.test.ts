// @vitest-environment node
// Convergência da sincronização (F4-B, B3): aparelhos de verdade (Dexie no fake-indexeddb) falando
// com o SQL real das migrações em PGlite. Prova o que o plano §11 promete: aparelho novo recebe tudo
// e não reenvia; edição cruzada gera Conflito e NUNCA perde dado; a escolha da pessoa converge.
import { camposMinimos } from '../src/core/modelo/fabrica';
import { aderirAoItem, reidratadorDoAcervo } from '../src/dominios/acervo/adesao';
import type { ItemDoAcervo } from '../src/dominios/acervo/esquemas';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';
import { Repositorio, VERSAO_ESQUEMA, type Alteracao } from '../src/core/persistencia';
import {
  CHAVE_PARADA_POR_VERSAO,
  lerSeqRecebido,
  contarConflitos,
  contarPendentes,
  lerQuarentenaDeRecebidos,
  listarConflitos,
  receberNovidades,
  resolverConflito,
  rodadaDeSincronizacao,
  ResolucaoPendenteDeEnvio,
  type Escolha,
} from '../src/core/sincronizacao';
import { criarBancoRemoto, type BancoRemoto } from './servidor-pglite';

let remoto: BancoRemoto;
let contadorDeUsuarios = 0;
let contadorDeBancos = 0;

beforeAll(async () => {
  remoto = await criarBancoRemoto();
}, 60_000);

/** Relógio compartilhado e crescente: a ordem das chamadas é a ordem do tempo, sem depender do CPU. */
const tempo = { ms: Date.parse('2026-10-25T12:00:00.000Z') };
const agora = () => {
  tempo.ms += 7;
  return new Date(tempo.ms);
};

async function novoUsuario(): Promise<string> {
  contadorDeUsuarios += 1;
  const uid = `0199a6c4-0000-7000-8000-${String(contadorDeUsuarios).padStart(12, '0')}`;
  await remoto.criarUsuario(uid);
  return uid;
}

async function aparelho(uid: string, fonte?: FonteEmMemoria) {
  contadorDeBancos += 1;
  const repo = await Repositorio.abrir({
    nomeBanco: `conv-${String(contadorDeBancos)}-${Math.random().toString(36).slice(2)}`,
    usuarioId: uid,
    agora,
  });
  const servidor = remoto.servidorDe(uid);
  const ctx = {
    usuarioId: uid,
    aparelhoId: repo.ctx.aparelhoId,
    versaoEsquema: VERSAO_ESQUEMA,
    ...(fonte
      ? { prepararReidratacao: (log: readonly Alteracao[]) => reidratadorDoAcervo(fonte, log) }
      : {}),
  };
  return { repo, servidor, ctx, rodada: () => rodadaDeSincronizacao(repo, servidor, ctx) };
}
type Aparelho = Awaited<ReturnType<typeof aparelho>>;

const criarErro = (a: Aparelho, texto = 'inicial') =>
  a.repo.colecao('erros').criar({ ...camposMinimos('erros', a.ctx.usuarioId), oQueFoi: texto });

const lerErro = (a: Aparelho, id: string) =>
  a.repo.colecao('erros').obter(id, { incluirExcluidos: true });

async function noServidor(uid: string, id: string): Promise<Record<string, unknown> | undefined> {
  const r = await remoto.db.query<{ dados: Record<string, unknown> }>(
    'select dados from arretado.registros where usuario_id = $1 and id = $2',
    [uid, id],
  );
  return r.rows[0]?.dados;
}

describe('aparelho novo', () => {
  it('recebe o que a conta já tem, igual, e não reenvia nada do que recebeu', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const e = await criarErro(A, 'primeiro');
    await A.rodada();

    const B = await aparelho(uid);
    await B.rodada();
    expect(await lerErro(B, e.id)).toEqual(await lerErro(A, e.id));
    // O que B recebeu não volta ao servidor; só os registros próprios dele (Aparelho, Preferências) subiram.
    expect(await contarPendentes(B.repo.db, uid, B.ctx.aparelhoId)).toBe(0);
    const doErro = await remoto.db.query(
      'select count(*)::int as n from arretado.alteracoes where usuario_id = $1 and registro_id = $2',
      [uid, e.id],
    );
    expect((doErro.rows[0] as { n: number }).n).toBe(1);
  });

  it('o cursor fica no fim do log: uma segunda rodada não aplica nada', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    await criarErro(A);
    await A.rodada();
    const B = await aparelho(uid);
    await B.rodada();
    const r = await B.rodada();
    expect(r.recebido.aplicadas).toBe(0);
    expect(r.envio.enviadas).toBe(0);
  });

  it('a recarga é retomável: cair no meio das páginas não repete nem perde registro', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) ids.push((await criarErro(A, `e${String(i)}`)).id);
    await A.rodada();
    const B = await aparelho(uid);
    // Uma página de 500 não parte 6 registros: força a queda depois de baixar o instantâneo.
    B.servidor.falhas.push(null); // instantaneoInicio cai
    await expect(B.rodada()).rejects.toThrow();
    await B.rodada();
    for (const id of ids) expect(await lerErro(B, id)).toEqual(await lerErro(A, id));
  });
});

describe('edição em cadeia (sem Conflito)', () => {
  it('a edição de um aparelho chega no outro, e a resposta dele também', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    const e = await criarErro(A, 'v1');
    await A.rodada();
    await B.rodada();

    await A.repo.colecao('erros').atualizar(e.id, { justificativa: 'de A' });
    await A.rodada();
    await B.rodada();
    expect((await lerErro(B, e.id))?.justificativa).toBe('de A');

    await B.repo.colecao('erros').atualizar(e.id, { oQueFoi: 'v2 de B' });
    await B.rodada();
    await A.rodada();
    expect(await lerErro(A, e.id)).toEqual(await lerErro(B, e.id));
    expect(await contarConflitos(A.repo.db)).toBe(0);
    expect(await contarConflitos(B.repo.db)).toBe(0);
    expect(await noServidor(uid, e.id)).toEqual({ ...(await lerErro(A, e.id)) });
  });

  it('exclusão lógica também viaja', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    const e = await criarErro(A);
    await A.rodada();
    await B.rodada();
    await A.repo.colecao('erros').excluir(e.id);
    await A.rodada();
    await B.rodada();
    expect((await lerErro(B, e.id))?.excluidoEm).not.toBeNull();
    expect(await contarConflitos(B.repo.db)).toBe(0);
  });
});

describe('Conflito', () => {
  async function conflitoDeTextos() {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    const e = await criarErro(A, 'base');
    await A.rodada();
    await B.rodada();
    // Os dois editam sem ver um ao outro, no mesmo campo e em campos diferentes.
    await A.repo.colecao('erros').atualizar(e.id, { oQueFoi: 'A', justificativa: 'só A' });
    await B.repo.colecao('erros').atualizar(e.id, { oQueFoi: 'B', respostaDada: 'só B' });
    await A.rodada(); // A chega primeiro ao servidor
    const rB = await B.rodada();
    return { uid, A, B, e, rB };
  }

  it('edição cruzada: o registro de quem chegou depois NÃO é sobrescrito e abre um Conflito', async () => {
    const { uid, B, e, rB } = await conflitoDeTextos();
    expect(rB.recebido.conflitos).toBeGreaterThan(0);
    const abertos = await listarConflitos(B.repo.db);
    expect(abertos).toHaveLength(1);
    const [c] = abertos;
    expect(c?.registroId).toBe(e.id);
    expect(c?.minha?.oQueFoi).toBe('B');
    expect(c?.deles?.oQueFoi).toBe('A');
    // Nada se perdeu: B guarda a sua; o servidor guarda a de A.
    expect((await lerErro(B, e.id))?.oQueFoi).toBe('B');
    expect((await noServidor(uid, e.id))?.oQueFoi).toBe('A');
  });

  it('puxar de novo não duplica o Conflito', async () => {
    const { B } = await conflitoDeTextos();
    await B.rodada();
    await B.rodada();
    expect(await contarConflitos(B.repo.db)).toBe(1);
  });

  it('"ficar com a daqui" vence nos dois aparelhos e fecha o Conflito', async () => {
    const { uid, A, B, e } = await conflitoDeTextos();
    const [c] = await listarConflitos(B.repo.db);
    await resolverConflito(B.repo, B.ctx, c?.id ?? '', { tipo: 'daqui' });
    expect(await contarConflitos(B.repo.db)).toBe(0);
    await B.rodada();
    await A.rodada();
    expect((await lerErro(A, e.id))?.oQueFoi).toBe('B');
    expect(await lerErro(A, e.id)).toEqual(await lerErro(B, e.id));
    expect((await noServidor(uid, e.id))?.oQueFoi).toBe('B');
    expect(await contarConflitos(A.repo.db)).toBe(0);
  });

  it('"ficar com a de lá" adota a versão do servidor e não reenvia nada', async () => {
    const { uid, A, B, e } = await conflitoDeTextos();
    const [c] = await listarConflitos(B.repo.db);
    await resolverConflito(B.repo, B.ctx, c?.id ?? '', { tipo: 'de-la' });
    expect((await lerErro(B, e.id))?.oQueFoi).toBe('A');
    expect(await contarPendentes(B.repo.db, uid, B.ctx.aparelhoId)).toBe(0);
    await B.rodada();
    await A.rodada();
    expect(await lerErro(A, e.id)).toEqual(await lerErro(B, e.id));
    expect(await contarConflitos(B.repo.db)).toBe(0);
  });

  it('"campo a campo" junta o que a pessoa escolheu de cada lado', async () => {
    const { uid, A, B, e } = await conflitoDeTextos();
    const [c] = await listarConflitos(B.repo.db);
    // Do lado daqui só `respostaDada`; o resto (oQueFoi, justificativa) fica como no servidor.
    await resolverConflito(B.repo, B.ctx, c?.id ?? '', { tipo: 'campos', daqui: ['respostaDada'] });
    await B.rodada();
    await A.rodada();
    const final = await lerErro(A, e.id);
    expect(final?.oQueFoi).toBe('A');
    expect(final?.justificativa).toBe('só A');
    expect(final?.respostaDada).toBe('só B');
    expect(final).toEqual(await lerErro(B, e.id));
    expect((await noServidor(uid, e.id))?.respostaDada).toBe('só B');
  });

  it('só resolve depois de enviar o que ainda está pendente no registro', async () => {
    const { B, e } = await conflitoDeTextos();
    const [c] = await listarConflitos(B.repo.db);
    await B.repo.colecao('erros').atualizar(e.id, { causaSugerida: undefined, oQueFoi: 'B2' });
    await expect(
      resolverConflito(B.repo, B.ctx, c?.id ?? '', { tipo: 'daqui' }),
    ).rejects.toBeInstanceOf(ResolucaoPendenteDeEnvio);
    expect(await contarConflitos(B.repo.db)).toBe(1);
  });

  it('removido num aparelho e editado no outro: Conflito, sem perder a edição', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    const e = await criarErro(A, 'base');
    await A.rodada();
    await B.rodada();
    await A.repo.colecao('erros').removerFisico([e.id]);
    await B.repo.colecao('erros').atualizar(e.id, { justificativa: 'B ainda quer' });
    await A.rodada();
    await B.rodada();
    const [c] = await listarConflitos(B.repo.db);
    expect(c?.deles).toBeNull();
    expect((await lerErro(B, e.id))?.justificativa).toBe('B ainda quer');
    // B mantém: o registro volta para o servidor e para A.
    await resolverConflito(B.repo, B.ctx, c?.id ?? '', { tipo: 'daqui' });
    await B.rodada();
    await A.rodada();
    expect((await lerErro(A, e.id))?.justificativa).toBe('B ainda quer');
    expect((await noServidor(uid, e.id))?.justificativa).toBe('B ainda quer');
  });

  it('versões equivalentes (só os carimbos diferem) não viram Conflito', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    const e = await criarErro(A, 'base');
    await A.rodada();
    await B.rodada();
    await A.repo.colecao('erros').atualizar(e.id, { justificativa: 'igual' });
    await B.repo.colecao('erros').atualizar(e.id, { justificativa: 'igual' });
    await A.rodada();
    await B.rodada();
    expect(await contarConflitos(B.repo.db)).toBe(0);
    expect(await lerErro(B, e.id)).toEqual(await lerErro(A, e.id));
  });
});

describe('aparelho novo durante edições', () => {
  it('uma edição que chega durante a descida entra pelo log, sem perda nem Conflito', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const e = await criarErro(A, 'v1');
    await A.rodada();
    const B = await aparelho(uid);
    // Depois de B ler o ponto de corte, A edita e envia: a edição está acima do corte.
    const original = B.servidor.puxarRegistros.bind(B.servidor);
    let editou = false;
    B.servidor.puxarRegistros = async (...args) => {
      const r = await original(...args);
      if (!editou) {
        editou = true;
        await A.repo.colecao('erros').atualizar(e.id, { justificativa: 'durante a descida' });
        await A.rodada();
      }
      return r;
    };
    await B.rodada();
    await B.rodada();
    expect((await lerErro(B, e.id))?.justificativa).toBe('durante a descida');
    expect(await contarConflitos(B.repo.db)).toBe(0);
  });
});

describe('política do que sincroniza', () => {
  it('Usuário (consentimentos) nunca sobe nem entra; aparência fica em cada aparelho', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    await A.rodada();
    await B.rodada();
    const colecoes = await remoto.db.query<{ colecao: string }>(
      'select distinct colecao from arretado.alteracoes where usuario_id = $1',
      [uid],
    );
    expect(colecoes.rows.map((r) => r.colecao)).not.toContain('usuarios');

    // Tema é do aparelho; uma meta (módulos desabilitados) viaja.
    const prefA = (await A.repo.colecao('preferencias').listarPagina({ limite: 1 })).itens[0];
    await A.repo.colecao('preferencias').atualizar(prefA?.id ?? '', { tema: 'escuro' });
    await A.repo.colecao('preferencias').atualizar(prefA?.id ?? '', {
      modulosDesabilitados: ['x'],
    });
    await A.rodada();
    await B.rodada();
    const copia = await B.repo.colecao('preferencias').obter(prefA?.id ?? '');
    expect(copia?.modulosDesabilitados).toEqual(['x']);
    expect(copia?.tema).not.toBe('escuro');
    const naNuvem = await noServidor(uid, prefA?.id ?? '');
    expect(naNuvem?.modulosDesabilitados).toEqual(['x']);
  });
});

describe('o que vem de fora nunca entra sem passar pelo esquema', () => {
  it('registro inválido vai para a quarentena, o cursor segue e o resto é aplicado', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    const bom = await criarErro(A, 'bom');
    await A.rodada();
    await B.rodada();
    // Entrada que o servidor aceita (é só jsonb) mas o esquema do app recusa.
    const ruim = '0199a6c4-0000-7000-8000-0000000fffff';
    await A.servidor.enviarLote(A.ctx.aparelhoId, VERSAO_ESQUEMA, [
      {
        ts: '1790000000001-000001-0000000a',
        colecao: 'erros',
        registro_id: ruim,
        operacao: 'gravar',
        dados: { id: ruim, usuarioId: uid, campoQueNaoExiste: 1 },
        base_ts: null,
      },
    ]);
    const outro = await criarErro(A, 'depois do ruim');
    await A.rodada();
    const r = await B.rodada();
    expect(r.recebido.quarentena).toBe(1);
    expect(await lerErro(B, bom.id)).toBeTruthy();
    expect(await lerErro(B, outro.id)).toBeTruthy();
    expect(await lerErro(B, ruim)).toBeUndefined();
    expect((await lerQuarentenaDeRecebidos(B.repo)).map((x) => x.registroId)).toEqual([ruim]);
  });

  it('coleção desconhecida é recusada e vai para a quarentena', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    await A.rodada();
    await B.rodada();
    const a = '0199a6c4-0000-7000-8000-0000000aaaaa';
    await A.servidor.enviarLote(A.ctx.aparelhoId, VERSAO_ESQUEMA, [
      {
        ts: '1790000000002-000001-0000000a',
        colecao: 'colecaoInventada',
        registro_id: a,
        operacao: 'gravar',
        dados: { id: a, usuarioId: uid },
        base_ts: null,
      },
    ]);
    const r = await B.rodada();
    expect(r.recebido.quarentena).toBe(1);
    expect((await lerQuarentenaDeRecebidos(B.repo))[0]?.motivo).toMatch(/desconhecida/);
  });

  it('entrada de um app mais novo para a recepção sem perder nada; atualizar retoma', async () => {
    const uid = await novoUsuario();
    const A = await aparelho(uid);
    const B = await aparelho(uid);
    await A.rodada();
    await B.rodada();
    const antes = await lerSeqRecebido(B.repo);
    const e = await criarErro(A, 'de um app mais novo');
    // O envio carrega a versão do esquema de quem enviou: simula um app da versão seguinte.
    await A.servidor.enviarLote(A.ctx.aparelhoId, VERSAO_ESQUEMA + 1, [
      {
        ts: e.tsLogico,
        colecao: 'erros',
        registro_id: e.id,
        operacao: 'gravar',
        dados: { ...e },
        base_ts: null,
      },
    ]);
    const parou = await receberNovidades(B.repo, B.servidor, B.ctx);
    expect(parou.paradaPorVersao).toBe(true);
    expect(await lerErro(B, e.id)).toBeUndefined();
    expect(await lerSeqRecebido(B.repo)).toBe(antes);
    expect((await B.repo.db.meta.get(CHAVE_PARADA_POR_VERSAO))?.valor).toMatchObject({
      versao: VERSAO_ESQUEMA + 1,
    });

    // O app atualizado (versão maior) retoma de onde parou, sem perder a entrada.
    const atualizado = await receberNovidades(B.repo, B.servidor, {
      ...B.ctx,
      versaoEsquema: VERSAO_ESQUEMA + 1,
    });
    expect(atualizado.paradaPorVersao).toBe(false);
    expect(await lerErro(B, e.id)).toEqual(e);
    expect((await B.repo.db.meta.get(CHAVE_PARADA_POR_VERSAO))?.valor).toBeUndefined();
  });
});

function itemDoAcervo(id: string, artigos: number): ItemDoAcervo {
  return {
    id,
    versao: 1,
    norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal', ementa: 'Ementa.' },
    nos: Array.from({ length: artigos }, (_, k) => ({
      endereco: `art${String(k + 1)}`,
      categoria: 'normativo' as const,
      tipo: 'artigo' as const,
      rotulo: `Art. ${String(k + 1)}`,
      status: 'vigente' as const,
      confianca: 'alta' as const,
      trechos: [{ texto: `Texto ${String(k + 1)}.` }],
    })),
  };
}

describe('item do acervo (adesão por referência)', () => {
  it('o outro aparelho refaz a árvore pela fonte; editar um dispositivo sobe inteiro e converge', async () => {
    const fonte = await FonteEmMemoria.criar([{ item: itemDoAcervo('lei-x', 4) }]);
    const [entrada] = (await fonte.listar()).itens;
    const uid = await novoUsuario();
    const A = await aparelho(uid, fonte);
    const B = await aparelho(uid, fonte);
    expect(entrada).toBeDefined();
    if (!entrada) return;
    const r = await aderirAoItem(A.repo, fonte, entrada);
    expect(r.estado).not.toBe('ja_adicionada');
    await A.rodada();
    await B.rodada();

    const dispA = await A.repo.colecao('dispositivos').todosDoUsuario();
    const dispB = await B.repo.colecao('dispositivos').todosDoUsuario();
    expect(dispB.length).toBe(dispA.length);
    expect(dispB.map((d) => d.id).sort()).toEqual(dispA.map((d) => d.id).sort());
    expect(await B.repo.colecao('textosDispositivo').contar()).toBe(
      await A.repo.colecao('textosDispositivo').contar(),
    );

    // O servidor não tem linha dos dispositivos da adesão: a 1ª edição sobe o registro inteiro.
    const alvo = dispA.find((d) => d.rotulo === 'Art. 2');
    expect(alvo).toBeDefined();
    await A.repo.colecao('dispositivos').atualizar(alvo?.id ?? '', { confianca: 'a_confirmar' });
    const rA = await A.rodada();
    expect(rA.envio.divergentes).toHaveLength(0);
    await B.rodada();
    expect((await B.repo.colecao('dispositivos').obter(alvo?.id ?? ''))?.confianca).toBe(
      'a_confirmar',
    );
    expect(await contarConflitos(B.repo.db)).toBe(0);

    // E a edição seguinte já encadeia nessa.
    await B.repo.colecao('dispositivos').atualizar(alvo?.id ?? '', { confianca: 'media' });
    const rB = await B.rodada();
    expect(rB.envio.divergentes).toHaveLength(0);
    await A.rodada();
    expect((await A.repo.colecao('dispositivos').obter(alvo?.id ?? ''))?.confianca).toBe('media');
    expect(await contarConflitos(A.repo.db)).toBe(0);
  });

  it('sem a fonte do acervo a adesão espera na quarentena e entra quando a fonte volta', async () => {
    const fonte = await FonteEmMemoria.criar([{ item: itemDoAcervo('lei-y', 3) }]);
    const [entrada] = (await fonte.listar()).itens;
    if (!entrada) throw new Error('índice vazio');
    const uid = await novoUsuario();
    const A = await aparelho(uid, fonte);
    await aderirAoItem(A.repo, fonte, entrada);
    await A.rodada();

    const fora = await FonteEmMemoria.criar([{ item: itemDoAcervo('lei-y', 3) }]);
    fora.falhas.add('lei-y');
    const B = await aparelho(uid, fora);
    const primeira = await B.rodada();
    expect(primeira.recebido.quarentena).toBe(1);
    expect(await B.repo.colecao('dispositivos').contar()).toBe(0);

    fora.falhas.clear();
    await B.rodada();
    expect(await B.repo.colecao('dispositivos').contar()).toBe(
      await A.repo.colecao('dispositivos').contar(),
    );
    expect(await lerQuarentenaDeRecebidos(B.repo)).toHaveLength(0);
  });
});

// Propriedade: para sequências aleatórias de edições, envios e puxadas em 3 aparelhos (semente fixa,
// falha reprodutível), depois de resolver os Conflitos e estabilizar, todos terminam iguais ao
// servidor, e enquanto um Conflito está aberto o registro local é exatamente o que a pessoa tinha.
function gerador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('propriedade: convergência com edição concorrente', () => {
  it.each([1, 2, 3, 4, 5, 6])(
    'semente %i',
    async (semente) => {
      const sorteio = gerador(semente);
      const sorteie = (n: number) => Math.floor(sorteio() * n);
      const uid = await novoUsuario();
      const aparelhos = [await aparelho(uid), await aparelho(uid), await aparelho(uid)];
      const ids: string[] = [];

      for (let passo = 0; passo < 70; passo++) {
        const a = aparelhos[sorteie(aparelhos.length)];
        if (!a) continue;
        const acao = sorteio();
        const conhecidos = (await a.repo.colecao('erros').todosDoUsuario()).filter(
          (r) => r.excluidoEm === null,
        );
        if (acao < 0.3 || conhecidos.length === 0) {
          ids.push((await criarErro(a, `s${String(semente)}p${String(passo)}`)).id);
        } else if (acao < 0.65) {
          const alvo = conhecidos[sorteie(conhecidos.length)];
          if (alvo) {
            await a.repo.colecao('erros').atualizar(alvo.id, {
              [sorteio() < 0.5 ? 'oQueFoi' : 'justificativa']: `p${String(passo)}`,
            });
          }
        } else if (acao < 0.75) {
          const alvo = conhecidos[sorteie(conhecidos.length)];
          if (alvo) await a.repo.colecao('erros').excluir(alvo.id);
        } else {
          await a.rodada();
        }
        // Com um Conflito aberto, o registro local nunca é trocado pela versão de lá.
        for (const c of await listarConflitos(a.repo.db)) {
          if (c.minha) {
            const agoraLocal = await a.repo.db.tabela(c.colecao).get(c.registroId);
            expect(agoraLocal).toBeTruthy();
          }
        }
      }

      // Estabiliza: rodadas e resoluções (escolha sorteada) até ninguém ter o que fazer.
      const escolhas: Escolha[] = [
        { tipo: 'daqui' },
        { tipo: 'de-la' },
        { tipo: 'campos', daqui: ['oQueFoi'] },
      ];
      let calmo = false;
      for (let volta = 0; volta < 25 && !calmo; volta++) {
        let mexeu = false;
        for (const a of aparelhos) {
          const r = await a.rodada();
          if (r.envio.enviadas > 0 || r.recebido.aplicadas > 0 || r.recebido.conflitos > 0)
            mexeu = true;
          for (const c of await listarConflitos(a.repo.db)) {
            await resolverConflito(
              a.repo,
              a.ctx,
              c.id,
              escolhas[sorteie(escolhas.length)] ?? escolhas[0]!,
            );
            mexeu = true;
          }
        }
        calmo = !mexeu;
      }
      expect(calmo).toBe(true);

      // Nenhuma edição que o servidor recusou sumiu sem Conflito: cada divergente tem o seu.
      const recusadas = await remoto.db.query<{ aparelho_id: string; registro_id: string }>(
        'select aparelho_id, registro_id from arretado.alteracoes where usuario_id = $1 and divergente',
        [uid],
      );
      for (const r of recusadas.rows) {
        const dono = aparelhos.find((x) => x.ctx.aparelhoId === r.aparelho_id);
        const todos = await dono?.repo.db.conflitos
          .where('[colecao+registroId]')
          .equals(['erros', r.registro_id])
          .count();
        expect(todos).toBeGreaterThan(0);
      }

      const doServidor = await remoto.db.query<{ id: string; dados: Record<string, unknown> }>(
        "select id, dados from arretado.registros where usuario_id = $1 and colecao = 'erros' order by id",
        [uid],
      );
      for (const a of aparelhos) {
        const locais = (await a.repo.colecao('erros').todosDoUsuario()).sort((x, y) =>
          x.id.localeCompare(y.id),
        );
        expect(locais.map((r) => r.id)).toEqual(doServidor.rows.map((r) => r.id));
        for (const [i, r] of locais.entries()) expect(r).toEqual(doServidor.rows[i]?.dados);
        expect(await contarConflitos(a.repo.db)).toBe(0);
        expect(await contarPendentes(a.repo.db, uid, a.ctx.aparelhoId)).toBe(0);
      }
    },
    120_000,
  );
});
