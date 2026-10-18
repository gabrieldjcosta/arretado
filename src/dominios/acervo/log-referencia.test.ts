// Log de lote por referência (F4-A, pacote AL; plano f4a-contas.md §9): a adesão grava uma entrada
// `acervo-adesao` (item, versão, hash) no lugar de uma por registro; reconstruir e desfazer
// reidratam pela fonte do acervo. Banco real no fake-indexeddb.
import { NOMES_COLECOES, type NomeColecao } from '../../core/modelo';
import { migrarParaConta } from '../../core/pacote/migrar-para-conta';
import {
  desfazerAlteracao,
  FonteDoLoteAusente,
  OPERACAO_ADESAO,
  reconstruirDoLog,
  registrosDoLote,
  BancoArretado,
  RegistroDeContas,
  Repositorio,
  type Alteracao,
  type Estado,
  type Reidratador,
} from '../../core/persistencia';
import { aderirAoItem, reidratadorDoAcervo } from './adesao';
import type { ItemDoAcervo } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';
import { mudarDisciplinas } from './vinculos';
import antigo from './fixtures/log-antigo.json';

const nomeBanco = () => `log-ref-${Math.random().toString(36).slice(2)}`;

/** Item com `artigos` artigos sob um título, alguns com campos opcionais. */
function itemCom(id: string, artigos: number, versao = 1, sufixo = ''): ItemDoAcervo {
  return {
    id,
    versao,
    norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal', ementa: 'Ementa.' },
    nos: [
      {
        endereco: 'tit1',
        categoria: 'estrutural',
        tipo: 'titulo',
        rotulo: 'TÍTULO I',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: 'Disposições gerais' }],
      },
      ...Array.from({ length: artigos }, (_, k) => ({
        endereco: `art${String(k + 1)}`,
        categoria: 'normativo' as const,
        tipo: 'artigo' as const,
        rotulo: `Art. ${String(k + 1)}`,
        status: 'vigente' as const,
        confianca: 'alta' as const,
        pai: 'tit1',
        trechos: [{ texto: `Texto ${String(k + 1)}${sufixo}.` }, { texto: ' fim', enfase: true }],
        ...(k % 3 === 0
          ? {
              notasVigencia: [
                { texto: 'Redação dada pela Lei nº 1, de 2020', lei: 'Lei nº 1', ano: 2020 },
              ],
            }
          : {}),
        ...(k % 4 === 1 ? { procedencia: { rotulo: 'DOU', data: '2020-01-02' } } : {}),
        ...(k % 5 === 2 ? { renumeradoDe: `art${String(k + 50)}` } : {}),
      })),
    ],
  };
}

const ITENS = [itemCom('lei-a', 4), itemCom('lei-b', 9), itemCom('lei-c', 1)];

async function montar(itens: readonly ItemDoAcervo[] = ITENS) {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const fonte = await FonteEmMemoria.criar(
    itens.map((item) => ({ item, vinculos: [{ disciplina: 'Direito Penal' }] })),
  );
  const indice = await fonte.listar();
  return { repo, fonte, indice };
}

async function log(repo: Repositorio): Promise<Alteracao[]> {
  return repo.db.alteracoes.orderBy('seq').toArray();
}

/** Estado das tabelas, coleção a coleção, em ordem de id (só coleções com registro). */
async function tabelas(repo: Repositorio): Promise<Map<NomeColecao, unknown[]>> {
  const m = new Map<NomeColecao, unknown[]>();
  for (const nome of NOMES_COLECOES) {
    const lista = await repo.db.tabela(nome).toArray();
    if (lista.length > 0) m.set(nome, ordenar(lista));
  }
  return m;
}

function ordenar<T>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    const x = (a as { id: string }).id;
    const y = (b as { id: string }).id;
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

function comoMapa(estado: Estado): Map<NomeColecao, unknown[]> {
  const m = new Map<NomeColecao, unknown[]>();
  for (const [nome, regs] of estado) if (regs.size > 0) m.set(nome, ordenar([...regs.values()]));
  return m;
}

/** O log que o app gravava antes do AL: cada referência vira as entradas `gravar` por registro. */
function comoLogAntigo(alteracoes: readonly Alteracao[], reidratar: Reidratador): Alteracao[] {
  return alteracoes.flatMap((a) => {
    if (a.operacao !== OPERACAO_ADESAO) return [a];
    const { dispositivos, textos } = registrosDoLote(a, reidratar);
    const gravar = (colecao: NomeColecao, r: { id: string; tsLogico: string }): Alteracao => ({
      ts: r.tsLogico,
      aparelhoId: a.aparelhoId,
      usuarioId: a.usuarioId,
      colecao,
      registroId: r.id,
      operacao: 'gravar',
      dados: { ...r },
    });
    return [
      ...dispositivos.map((r) => gravar('dispositivos', r)),
      ...textos.map((r) => gravar('textosDispositivo', r)),
    ];
  });
}

/** Gerador pseudoaleatório reprodutível (mulberry32). */
function aleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function usoAleatorio(
  repo: Repositorio,
  fonte: FonteEmMemoria,
  indice: Awaited<ReturnType<FonteEmMemoria['listar']>>,
  semente: number,
): Promise<void> {
  const rnd = aleatorio(semente);
  const escolher = <T>(lista: readonly T[]): T | undefined =>
    lista[Math.floor(rnd() * lista.length)];
  for (let passo = 0; passo < 14; passo++) {
    const op = Math.floor(rnd() * 7);
    const ativos = (await repo.colecao('dispositivos').todosDoUsuario()).filter(
      (d) => d.excluidoEm === null,
    );
    const textos = await repo.colecao('textosDispositivo').todosDoUsuario();
    const normas = await repo.colecao('normas').todosDoUsuario();
    const d = escolher(ativos);
    const t = escolher(textos);
    const norma = escolher(normas);
    if (op === 0 || (op <= 5 && ativos.length === 0)) {
      const entrada = escolher(indice.itens);
      if (entrada) await aderirAoItem(repo, fonte, entrada);
    } else if (op === 1 && d) {
      await repo.colecao('dispositivos').atualizar(d.id, { rotulo: `R${String(passo)}` });
    } else if (op === 2 && d) {
      await repo.colecao('dispositivos').atualizar(d.id, { rotulo: undefined });
    } else if (op === 3 && t) {
      await repo.colecao('textosDispositivo').atualizar(t.id, {
        trechos: [{ texto: `Mudado ${String(passo)}` }],
        notasVigencia: undefined,
      });
    } else if (op === 4 && d) {
      await repo.colecao('dispositivos').excluir(d.id);
    } else if (op === 5 && norma) {
      await mudarDisciplinas(repo, norma.id, rnd() < 0.5 ? ['Direito Civil'] : ['Outros']);
    } else {
      await repo.colecao('erros').criar({ resultado: 'errou', oQueFoi: 'Prazo', status: 'aberto' });
    }
  }
}

describe('adesão grava o lote por referência', () => {
  it('uma entrada acervo-adesao (itemId, versão, hash) no lugar de uma por registro', async () => {
    const { repo, fonte, indice } = await montar();
    const entrada = indice.itens[1];
    if (!entrada) throw new Error('sem entrada');
    const antes = (await log(repo)).length;
    const r = await aderirAoItem(repo, fonte, entrada);
    if (r.estado !== 'adicionada') throw new Error('não adicionou');
    const novas = (await log(repo)).slice(antes);
    const refs = novas.filter((a) => a.operacao === OPERACAO_ADESAO);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.dados).toMatchObject({
      itemId: 'lei-b',
      versao: 1,
      hash: entrada.hash,
      normaId: r.normaId,
      versaoId: r.versaoId,
      quantidade: 10,
    });
    // Nenhum registro da árvore copiado no log.
    expect(
      novas.filter(
        (a) =>
          a.operacao === 'gravar' &&
          (a.colecao === 'dispositivos' || a.colecao === 'textosDispositivo'),
      ),
    ).toHaveLength(0);
    // Os registros estão nas tabelas, como antes.
    expect(await repo.colecao('dispositivos').contar()).toBe(10);
    expect(await repo.colecao('textosDispositivo').contar()).toBe(10);
    // O carimbo da entrada é o último do lote: o relógio reaberto nunca emite um menor.
    const maiorTs = (await repo.db.tabela('textosDispositivo').toArray())
      .map((x) => x.tsLogico)
      .sort()
      .at(-1);
    expect(refs[0]?.ts).toBe(maiorTs);
    repo.fechar();
  });

  it('a entrada não carrega o texto do item (conteúdo do acervo não vai no log)', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[1]!);
    const texto = JSON.stringify(await log(repo));
    expect(texto).not.toContain('Texto 3.');
    repo.fechar();
  });
});

describe('propriedade: estado reconstruído = estado gravado, log antigo x novo', () => {
  for (const semente of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]) {
    it(`semente ${String(semente)}`, async () => {
      const { repo, fonte, indice } = await montar();
      await usoAleatorio(repo, fonte, indice, semente);
      const alteracoes = await log(repo);
      const reidratar = await reidratadorDoAcervo(fonte, alteracoes);
      const gravado = await tabelas(repo);
      const doNovo = comoMapa(reconstruirDoLog(alteracoes, reidratar));
      const doAntigo = comoMapa(reconstruirDoLog(comoLogAntigo(alteracoes, reidratar)));
      expect(doNovo).toEqual(gravado);
      expect(doAntigo).toEqual(doNovo);
      if (alteracoes.some((a) => a.operacao === OPERACAO_ADESAO)) {
        expect(alteracoes.length).toBeLessThan(comoLogAntigo(alteracoes, reidratar).length);
      }
      repo.fechar();
    });
  }
});

describe('entradas antigas', () => {
  it('o log gravado antes do AL reconstrói sem fonte nenhuma', () => {
    const estado = comoMapa(reconstruirDoLog(antigo.log as Alteracao[]));
    const esperado = new Map(
      Object.entries(antigo.tabelas).map(([k, v]) => [k as NomeColecao, ordenar(v as unknown[])]),
    );
    expect(estado).toEqual(esperado);
  });

  it('não são reescritas: adesão nova sobre log antigo; o todo reconstrói', async () => {
    // O banco de antes: registros, log (com seq) e identidade do app anterior, como estavam.
    const nome = nomeBanco();
    const usuarioId = antigo.tabelas.usuarios[0]!.id;
    const aparelhoId = antigo.tabelas.aparelhos[0]!.id;
    const db = new BancoArretado(nome);
    await db.open();
    await db.transaction('rw', db.tables, async () => {
      for (const [colecao, lista] of Object.entries(antigo.tabelas)) {
        await db.tabela(colecao as NomeColecao).bulkAdd(lista as never[]);
      }
      await db.alteracoes.bulkAdd(antigo.log as Alteracao[]);
      await db.meta.put({ chave: 'identidade', valor: { usuarioId, aparelhoId } });
    });
    db.close();
    const repo = await Repositorio.abrir({ nomeBanco: nome });
    const fonte = await FonteEmMemoria.criar([{ item: itemCom('lei-nova', 3) }]);
    await aderirAoItem(repo, fonte, (await fonte.listar()).itens[0]!);
    const depois = await log(repo);
    expect(depois.slice(0, antigo.log.length)).toEqual(antigo.log);
    const reidratar = await reidratadorDoAcervo(fonte, depois);
    const doLog = comoMapa(reconstruirDoLog(depois, reidratar));
    expect(doLog).toEqual(await tabelas(repo));
    expect(depois.filter((x) => x.operacao === OPERACAO_ADESAO)).toHaveLength(1);
    repo.fechar();
  });
});

describe('edição posterior', () => {
  it('é entrada normal, com o estado de partida vindo da referência', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const art2 = (await repo.colecao('dispositivos').todosDoUsuario()).find(
      (d) => d.endereco === 'art2',
    )!;
    await repo.colecao('dispositivos').atualizar(art2.id, { rotulo: 'Art. 2º-A' });
    const alteracoes = await log(repo);
    const ultima = alteracoes.at(-1)!;
    expect(ultima).toMatchObject({
      operacao: 'atualizar',
      colecao: 'dispositivos',
      registroId: art2.id,
    });
    expect(ultima.dados).not.toHaveProperty('endereco');
    const estado = reconstruirDoLog(alteracoes, await reidratadorDoAcervo(fonte, alteracoes));
    expect(estado.get('dispositivos')?.get(art2.id)).toMatchObject({
      endereco: 'art2',
      rotulo: 'Art. 2º-A',
    });
    repo.fechar();
  });
});

describe('desfazer', () => {
  it('desfazer a adesão tira exatamente os registros do lote', async () => {
    const { repo, fonte, indice } = await montar();
    const r = await aderirAoItem(repo, fonte, indice.itens[0]!);
    if (r.estado !== 'adicionada') throw new Error('não adicionou');
    const alteracoes = await log(repo);
    const ref = alteracoes.find((a) => a.operacao === OPERACAO_ADESAO)!;
    const reidratar = await reidratadorDoAcervo(fonte, alteracoes);
    const antes = desfazerAlteracao(alteracoes, ref.seq!, reidratar);
    const ids = new Set([
      ...(await repo.colecao('dispositivos').todosDoUsuario()).map((d) => d.id),
      ...(await repo.colecao('textosDispositivo').todosDoUsuario()).map((t) => t.id),
    ]);
    const afetados = [
      ...(antes.get('dispositivos')?.entries() ?? []),
      ...(antes.get('textosDispositivo')?.entries() ?? []),
    ];
    expect(new Set(afetados.map(([id]) => id))).toEqual(ids);
    expect(afetados.every(([, registro]) => registro === null)).toBe(true);
    repo.fechar();
  });

  it('desfazer uma edição volta ao registro reidratado da fonte', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const original = (await repo.colecao('textosDispositivo').todosDoUsuario())[2]!;
    await repo
      .colecao('textosDispositivo')
      .atualizar(original.id, { trechos: [{ texto: 'Outro' }] });
    const alteracoes = await log(repo);
    const edicao = alteracoes.at(-1)!;
    const antes = desfazerAlteracao(
      alteracoes,
      edicao.seq!,
      await reidratadorDoAcervo(fonte, alteracoes),
    );
    expect(antes.get('textosDispositivo')?.get(original.id)).toEqual(original);
    repo.fechar();
  });

  it('sem a fonte, desfazer a edição é Problema explícito', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const t = (await repo.colecao('textosDispositivo').todosDoUsuario())[0]!;
    await repo.colecao('textosDispositivo').atualizar(t.id, { trechos: [{ texto: 'Outro' }] });
    const alteracoes = await log(repo);
    const vazia = await FonteEmMemoria.criar([]);
    const reidratar = await reidratadorDoAcervo(vazia, alteracoes);
    expect(() => desfazerAlteracao(alteracoes, alteracoes.at(-1)!.seq!, reidratar)).toThrow(
      FonteDoLoteAusente,
    );
    repo.fechar();
  });
});

describe('fonte ausente ou trocada', () => {
  it('item fora da fonte vira Problema explícito', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const alteracoes = await log(repo);
    const vazia = await FonteEmMemoria.criar([]);
    const reidratar = await reidratadorDoAcervo(vazia, alteracoes);
    expect(() => reconstruirDoLog(alteracoes, reidratar)).toThrow(FonteDoLoteAusente);
    repo.fechar();
  });

  it('versão nova publicada sem guardar a antiga: nunca usa o conteúdo novo no lugar', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const alteracoes = await log(repo);
    const sohNova = await FonteEmMemoria.criar([{ item: itemCom('lei-a', 4, 2, ' novo') }]);
    const reidratar = await reidratadorDoAcervo(sohNova, alteracoes);
    expect(() => reconstruirDoLog(alteracoes, reidratar)).toThrow(FonteDoLoteAusente);
    repo.fechar();
  });

  it('versão nova publicada guardando a antiga por hash: reidrata a antiga', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const alteracoes = await log(repo);
    const comHistorico = await FonteEmMemoria.criar([{ item: itemCom('lei-a', 4, 2, ' novo') }], {
      historico: [itemCom('lei-a', 4)],
    });
    const reidratar = await reidratadorDoAcervo(comHistorico, alteracoes);
    expect(comoMapa(reconstruirDoLog(alteracoes, reidratar))).toEqual(await tabelas(repo));
    repo.fechar();
  });

  it('conteúdo adulterado (hash não bate) não é aceito', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const alteracoes = await log(repo);
    fonte.adulterar('lei-a', itemCom('lei-a', 4, 1, ' adulterado'));
    const reidratar = await reidratadorDoAcervo(fonte, alteracoes);
    expect(() => reconstruirDoLog(alteracoes, reidratar)).toThrow(FonteDoLoteAusente);
    repo.fechar();
  });
});

describe('migração para a conta com lote por referência', () => {
  async function origemComAdesao() {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[1]!);
    await repo
      .colecao('dispositivos')
      .atualizar((await repo.colecao('dispositivos').todosDoUsuario())[3]!.id, {
        rotulo: 'Editado',
      });
    return { repo, fonte };
  }

  it('copia o log como está e verifica reidratando pela fonte', async () => {
    const { repo, fonte } = await origemComAdesao();
    const registro = new RegistroDeContas(`reg-${Math.random().toString(36).slice(2)}`);
    const r = await migrarParaConta(repo, {
      uid: crypto.randomUUID(),
      registro,
      baixarBackup: () => Promise.resolve(),
      prepararReidratacao: (alteracoes) => reidratadorDoAcervo(fonte, alteracoes),
    });
    expect(r.tipo).toBe('concluida');
    repo.fechar();
  });

  it('sem a fonte, a migração falha com Problema explícito e a origem fica intacta', async () => {
    const { repo } = await origemComAdesao();
    const antes = await log(repo);
    const registro = new RegistroDeContas(`reg-${Math.random().toString(36).slice(2)}`);
    const vazia = await FonteEmMemoria.criar([]);
    const r = await migrarParaConta(repo, {
      uid: crypto.randomUUID(),
      registro,
      baixarBackup: () => Promise.resolve(),
      prepararReidratacao: (alteracoes) => reidratadorDoAcervo(vazia, alteracoes),
    });
    expect(r).toMatchObject({ tipo: 'falhou' });
    if (r.tipo === 'falhou') expect(r.motivo).toMatch(/acervo/);
    expect(await log(repo)).toEqual(antes);
    repo.fechar();
  });
});
