import { Repositorio } from '../../core/persistencia';
import { aderirAoItem, aderirEmLote, AdesaoRecusada, nomeComparavel } from './adesao';
import { IndiceDoAcervo, type ItemDoAcervo } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';
import { FonteEstatica } from './fonte-estatica';
import { FonteIndisponivel } from './fonte';
import { hashDoItem } from './hash';

const nomeBanco = () => `acervo-${Math.random().toString(36).slice(2)}`;

function item(id: string, versao = 1): ItemDoAcervo {
  return {
    id,
    versao,
    norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
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
      {
        endereco: 'art1',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 1º',
        status: 'vigente',
        confianca: 'alta',
        pai: 'tit1',
        trechos: [{ texto: 'Texto do artigo.' }],
      },
    ],
  };
}

async function montar() {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const fonte = await FonteEmMemoria.criar([
    { item: item('lei-a'), vinculos: [{ disciplina: 'Direito  Penal', subtitulo: 'Parte geral' }] },
    { item: item('lei-b'), vinculos: [{ disciplina: 'Sem Casamento' }] },
    { item: item('lei-c') },
  ]);
  return { repo, fonte, indice: await fonte.listar() };
}

describe('hash do item', () => {
  it('é reprodutível e sensível ao conteúdo', async () => {
    expect(await hashDoItem(item('x'))).toBe(await hashDoItem(item('x')));
    expect(await hashDoItem(item('x'))).not.toBe(await hashDoItem(item('y')));
  });
});

describe('FonteEstatica', () => {
  it('lê o índice e o item, e recusa o que foge do esquema', async () => {
    const mem = await FonteEmMemoria.criar([{ item: item('lei-a') }]);
    const indice = await mem.listar();
    const corpo = new Map<string, unknown>([
      ['/acervo/indice.json', indice],
      ['/acervo/lei-a.json', item('lei-a')],
      ['/acervo/ruim.json', { id: 'ruim' }],
    ]);
    const buscar = ((url: string) => {
      const v = corpo.get(url);
      return Promise.resolve(
        v === undefined ? new Response('', { status: 404 }) : Response.json(v),
      );
    }) as typeof fetch;
    const f = new FonteEstatica('/acervo/', buscar);
    expect((await f.listar()).itens).toHaveLength(1);
    expect((await f.obter('lei-a')).nos).toHaveLength(2);
    await expect(f.obter('ruim')).rejects.toMatchObject({ motivo: 'formato_invalido' });
    await expect(f.obter('nada')).rejects.toMatchObject({ motivo: 'nao_encontrado' });
    await expect(f.obter('../x')).rejects.toBeInstanceOf(FonteIndisponivel);
    const semRede = new FonteEstatica('/acervo', () => Promise.reject(new Error('off')));
    await expect(semRede.listar()).rejects.toMatchObject({ motivo: 'sem_rede' });
  });

  it('o esquema do índice recusa campo desconhecido', () => {
    expect(IndiceDoAcervo.safeParse({ formato: 'x' }).success).toBe(false);
  });
});

describe('adesão ao acervo', () => {
  it('grava norma, versão vigente, árvore e textos; guarda a versão aderida', async () => {
    const { repo, fonte, indice } = await montar();
    const r = await aderirAoItem(repo, fonte, indice.itens[0]!);
    expect(r.estado).toBe('adicionada');
    const normas = await repo.colecao('normas').todosDoUsuario();
    expect(normas).toHaveLength(1);
    expect(normas[0]).toMatchObject({
      escopo: 'catalogo',
      tituloCurto: 'LEI-A',
      origemAcervo: { id: 'lei-a', versao: 1, hash: indice.itens[0]!.hash },
    });
    const versoes = await repo.colecao('versoesNorma').todosDoUsuario();
    expect(versoes[0]).toMatchObject({ status: 'vigente', origemEntrada: 'arquivo' });
    expect(normas[0]!.versaoVigenteId).toBe(versoes[0]!.id);
    const dispositivos = await repo.colecao('dispositivos').todosDoUsuario();
    const art = dispositivos.find((d) => d.endereco === 'art1')!;
    const tit = dispositivos.find((d) => d.endereco === 'tit1')!;
    expect(art.paiId).toBe(tit.id);
    expect(tit.ordem).toBeLessThan(art.ordem);
    expect(await repo.colecao('textosDispositivo').todosDoUsuario()).toHaveLength(2);
    repo.fechar();
  });

  it('é idempotente: adicionar de novo não duplica', async () => {
    const { repo, fonte, indice } = await montar();
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    const pedidos = fonte.pedidos.length;
    const de_novo = await aderirAoItem(repo, fonte, indice.itens[0]!);
    expect(de_novo).toMatchObject({ estado: 'ja_adicionada', versaoAderida: 1 });
    expect(fonte.pedidos).toHaveLength(pedidos);
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(1);
    expect(await repo.colecao('dispositivos').todosDoUsuario()).toHaveLength(2);
    repo.fechar();
  });

  it('duas adesões simultâneas do mesmo item terminam com uma norma só', async () => {
    const { repo, fonte, indice } = await montar();
    await Promise.allSettled([
      aderirAoItem(repo, fonte, indice.itens[0]!),
      aderirAoItem(repo, fonte, indice.itens[0]!),
    ]);
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(1);
    repo.fechar();
  });

  it('recusa conteúdo cujo hash não bate com o índice e não grava nada', async () => {
    const { repo, fonte, indice } = await montar();
    fonte.adulterar('lei-a', item('lei-a'));
    const adulterado = item('lei-a');
    adulterado.nos[1]!.trechos = [{ texto: 'Texto trocado.' }];
    fonte.adulterar('lei-a', adulterado);
    await expect(aderirAoItem(repo, fonte, indice.itens[0]!)).rejects.toMatchObject({
      motivo: 'hash',
    });
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(0);
    repo.fechar();
  });

  it('recusa versão diferente da do índice e item trocado', async () => {
    const { repo, fonte, indice } = await montar();
    fonte.adulterar('lei-a', item('lei-a', 2));
    await expect(aderirAoItem(repo, fonte, indice.itens[0]!)).rejects.toMatchObject({
      motivo: 'versao',
    });
    fonte.adulterar('lei-a', item('lei-b'));
    await expect(aderirAoItem(repo, fonte, indice.itens[0]!)).rejects.toBeInstanceOf(
      AdesaoRecusada,
    );
    repo.fechar();
  });

  it('recusa árvore com pai depois do filho ou endereço repetido', async () => {
    const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const torto = item('lei-t');
    torto.nos.reverse();
    const fonte = await FonteEmMemoria.criar([{ item: torto }]);
    const [entrada] = (await fonte.listar()).itens;
    await expect(aderirAoItem(repo, fonte, entrada!)).rejects.toMatchObject({ motivo: 'arvore' });
    const repetido = item('lei-r');
    repetido.nos[1] = { ...repetido.nos[0]!, pai: undefined };
    const f2 = await FonteEmMemoria.criar([{ item: repetido }]);
    await expect(aderirAoItem(repo, f2, (await f2.listar()).itens[0]!)).rejects.toMatchObject({
      motivo: 'arvore',
    });
    repo.fechar();
  });

  it('casa a disciplina pelo nome; o que não casa fica "sem disciplina" com a sugestão', async () => {
    const { repo, fonte, indice } = await montar();
    const penal = await repo.colecao('disciplinas').criar({ nome: 'direito penal' });
    await aderirAoItem(repo, fonte, indice.itens[0]!);
    await aderirAoItem(repo, fonte, indice.itens[1]!);
    await aderirAoItem(repo, fonte, indice.itens[2]!);
    const normas = await repo.colecao('normas').todosDoUsuario();
    const idDe = (t: string) => normas.find((n) => n.tituloCurto === t)!.id;
    const vinculos = await repo.colecao('vinculosDisciplina').todosDoUsuario();
    expect(vinculos).toHaveLength(2);
    expect(vinculos.find((v) => v.normaId === idDe('LEI-A'))).toMatchObject({
      disciplinaId: penal.id,
      subtitulo: 'Parte geral',
      sugestao: 'Direito  Penal',
    });
    const solto = vinculos.find((v) => v.normaId === idDe('LEI-B'))!;
    expect(solto.disciplinaId).toBeUndefined();
    expect(solto.sugestao).toBe('Sem Casamento');
    repo.fechar();
  });
});

describe('adesão em lote', () => {
  it('uma falha não afeta as demais; reexecutar pula o que já entrou e tenta de novo o que falhou', async () => {
    const { repo, fonte } = await montar();
    fonte.falhas.add('lei-b');
    const progresso: string[] = [];
    const r1 = await aderirEmLote(repo, fonte, ['lei-a', 'lei-b', 'lei-c', 'lei-z'], {
      aoProgresso: (f, t) => progresso.push(`${String(f)}/${String(t)}`),
    });
    expect(r1.adicionadas).toEqual(['lei-a', 'lei-c']);
    expect(r1.falhas.map((f) => f.id)).toEqual(['lei-b', 'lei-z']);
    expect(progresso[0]).toBe('0/4');
    expect(progresso.at(-1)).toBe('4/4');
    fonte.falhas.clear();
    const r2 = await aderirEmLote(repo, fonte, ['lei-a', 'lei-b', 'lei-c']);
    expect(r2.jaAdicionadas).toEqual(['lei-a', 'lei-c']);
    expect(r2.adicionadas).toEqual(['lei-b']);
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(3);
    repo.fechar();
  });

  it('"Parar" encerra o lote e devolve o que sobrou', async () => {
    const { repo, fonte } = await montar();
    let n = 0;
    const r = await aderirEmLote(repo, fonte, ['lei-a', 'lei-b', 'lei-c'], {
      deveParar: () => ++n > 1,
    });
    expect(r.adicionadas).toEqual(['lei-a']);
    expect(r.restantes).toEqual(['lei-b', 'lei-c']);
    repo.fechar();
  });
});

describe('nomeComparavel', () => {
  it('ignora acento, caixa e espaços', () => {
    expect(nomeComparavel('  Direito  Constitucional ')).toBe('direito constitucional');
    expect(nomeComparavel('Execução')).toBe('execucao');
  });
});
