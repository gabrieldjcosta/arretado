import { Repositorio } from '../../core/persistencia';
import { dispositivosDaNorma } from './consultas';
import { aderirAoItem } from './adesao';
import { atualizarItem, compararComAtual, itensComVersaoNova } from './atualizacao';
import { compararArvores, reancorar } from './comparacao';
import type { ItemDoAcervo, NoDoItem } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';

const nomeBanco = () => `atualizacao-${Math.random().toString(36).slice(2)}`;

const no = (endereco: string, texto: string, extra: Partial<NoDoItem> = {}): NoDoItem => ({
  endereco,
  categoria: 'normativo',
  tipo: 'artigo',
  rotulo: endereco,
  status: 'vigente',
  confianca: 'alta',
  trechos: [{ texto }],
  ...extra,
});

const item = (versao: number, nos: NoDoItem[]): ItemDoAcervo => ({
  id: 'lei-x',
  versao,
  norma: { tituloCurto: 'LEI X', tipo: 'Lei', esfera: 'federal' },
  nos,
});

const V1 = [
  no('art1', 'Primeiro artigo com texto longo.'),
  no('art2', 'Segundo artigo.'),
  no('art3', 'Terceiro artigo.'),
  no('art4', 'Quarto artigo.'),
];

describe('compararArvores', () => {
  const antigos = V1.map((n) => ({
    endereco: n.endereco,
    status: n.status,
    rotulo: n.rotulo,
    trechos: n.trechos,
  }));

  it('classifica incluído, alterado, revogado, renumerado e removido', () => {
    const c = compararArvores(antigos, [
      no('art1', 'Primeiro artigo com texto longo.'),
      no('art2', 'Segundo artigo mudou.'),
      no('art3', 'Terceiro artigo.', { status: 'revogado' }),
      no('art5', 'Quarto artigo.', { renumeradoDe: 'art4' }),
      no('art6', 'Novo.'),
    ]);
    expect(c.iguais).toBe(1);
    expect(c.alterados.map((n) => n.endereco)).toEqual(['art2']);
    expect(c.revogados.map((n) => n.endereco)).toEqual(['art3']);
    expect(c.renumerados).toEqual([{ endereco: 'art5', rotulo: 'art5', de: 'art4' }]);
    expect(c.incluidos.map((n) => n.endereco)).toEqual(['art6']);
    expect(c.removidos).toEqual([]);
    expect(c.novoEndereco.get('art4')).toBe('art5');
  });

  it('endereço sem correspondência é removido; renumeração que não se confirma é inclusão', () => {
    const c = compararArvores(antigos, [
      no('art1', 'Primeiro artigo com texto longo.'),
      no('art2', 'Segundo artigo.'),
      no('art3', 'Terceiro artigo.', { renumeradoDe: 'art2' }),
    ]);
    expect(c.renumerados).toEqual([]);
    expect(c.removidos.map((n) => n.endereco)).toEqual(['art4']);
    expect(c.novoEndereco.get('art4')).toBeUndefined();
  });
});

describe('reancorar', () => {
  const ancora = { texto: 'texto longo', inicio: 20, fim: 31 };
  it('mantém quando o texto está onde estava', () => {
    expect(reancorar(ancora, 'Primeiro artigo com texto longo.')).toEqual({
      status: 'valida',
      inicio: 20,
      fim: 31,
    });
  });
  it('acha o trecho deslocado, na ocorrência mais perto', () => {
    expect(reancorar(ancora, 'Aviso. Primeiro artigo com texto longo; texto longo.')).toEqual({
      status: 'reancorada',
      inicio: 27,
      fim: 38,
    });
  });
  it('fica pendente sem o texto', () => {
    expect(reancorar(ancora, 'Outro artigo.')).toEqual({ status: 'pendente' });
  });
});

async function montar(nosV2: NoDoItem[]) {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const fonte1 = await FonteEmMemoria.criar([{ item: item(1, V1) }]);
  const fonte2 = await FonteEmMemoria.criar([{ item: item(2, nosV2) }]);
  const [e1] = (await fonte1.listar()).itens;
  const [e2] = (await fonte2.listar()).itens;
  if (!e1 || !e2) throw new Error('índice vazio');
  const adesao = await aderirAoItem(repo, fonte1, e1);
  if (adesao.estado !== 'adicionada') throw new Error('não adicionou');
  const dispositivos = await repo.colecao('dispositivos').todosDoUsuario();
  const id = (e: string) => dispositivos.find((d) => d.endereco === e)?.id ?? '';
  return { repo, fonte2, e2, normaId: adesao.normaId, versaoId: adesao.versaoId, id };
}

describe('atualizarItem', () => {
  it('remapeia pelo endereço, reancora e leva o que sumiu às pendências', async () => {
    const { repo, fonte2, e2, normaId, versaoId, id } = await montar([
      no('art1', 'Aviso. Primeiro artigo com texto longo.'),
      no('art2', 'Segundo artigo mudou por completo.'),
      no('art3', 'Terceiro artigo.', { status: 'revogado' }),
      no('art5', 'Quarto artigo.', { renumeradoDe: 'art4' }),
      no('art6', 'Novo.'),
    ]);
    // Antes: estrela e erro no art4 (renumera), estrela e erro e leitura no art2 (fica) e no art3.
    await repo.colecao('estrelas').criar({ normaId, alvoId: id('art4'), origemTipo: 'direta' });
    const marca = (dispositivoId: string, texto: string, inicio: number) =>
      repo.colecao('marcacoes').criar({
        normaId,
        dispositivoId,
        versaoId,
        tipo: 'grifo',
        cor: 1,
        ancora: { texto, inicio, fim: inicio + texto.length },
        status: 'valida',
      });
    const grifoDeslocado = await marca(id('art1'), 'texto longo', 20);
    const grifoPerdido = await marca(id('art2'), 'Segundo artigo.', 0);
    const grifoIgual = await marca(id('art4'), 'Quarto', 0);
    await repo.colecao('leituras').criar({ normaId, lidoAteId: id('art3'), posicaoId: id('art4') });

    const antes = await compararComAtual(repo, fonte2, e2);
    expect(antes.renumerados.map((r) => r.de)).toEqual(['art4']);

    const r = await atualizarItem(repo, fonte2, e2);
    if (r.estado !== 'atualizada') throw new Error('não atualizou');
    expect(r.comparacao.alterados.map((n) => n.endereco)).toEqual(['art1', 'art2']);
    expect(r.pendencias).toBe(0);
    expect(r.reancoradas).toBe(1);
    expect(r.marcacoesPendentes).toBe(1);

    const norma = await repo.colecao('normas').obter(normaId);
    expect(norma?.versaoVigenteId).toBe(r.versaoId);
    expect(norma?.origemAcervo?.versao).toBe(2);
    expect((await repo.colecao('versoesNorma').obter(versaoId))?.status).toBe('arquivada');
    expect((await repo.colecao('versoesNorma').obter(r.versaoId))?.status).toBe('vigente');

    // A renumeração mantém o id: a estrela e o "lido até" seguem valendo, no endereço novo.
    expect((await repo.colecao('dispositivos').obter(id('art4')))?.endereco).toBe('art5');
    const estrelas = await repo.colecao('estrelas').todosDoUsuario();
    expect(estrelas.map((e) => e.alvoId)).toEqual([id('art4')]);
    const g1 = await repo.colecao('marcacoes').obter(grifoDeslocado.id);
    expect(g1).toMatchObject({ status: 'reancorada', versaoId: r.versaoId });
    expect(g1?.ancora).toMatchObject({ inicio: 27, fim: 38 });
    expect((await repo.colecao('marcacoes').obter(grifoPerdido.id))?.status).toBe('pendente');
    expect((await repo.colecao('marcacoes').obter(grifoIgual.id))?.status).toBe('valida');
    repo.fechar();
  });

  it('o endereço perdido vira pendência e a leitura recua para o anterior', async () => {
    const { repo, fonte2, e2, normaId, id } = await montar([
      no('art1', 'Primeiro artigo com texto longo.'),
      no('art2', 'Segundo artigo.'),
    ]);
    const estrela = await repo
      .colecao('estrelas')
      .criar({ normaId, alvoId: id('art4'), origemTipo: 'direta' });
    const erro = await repo.colecao('erros').criar({
      resultado: 'errou',
      oQueFoi: 'Pergunta',
      status: 'aberto',
      dispositivoId: id('art4'),
    });
    const leitura = await repo
      .colecao('leituras')
      .criar({ normaId, lidoAteId: id('art4'), posicaoId: id('art2') });
    const disciplina = await repo.colecao('vinculosDisciplina').criar({
      normaId,
      sugestao: 'Penal',
      trecho: { inicioEndereco: 'art3', fimEndereco: 'art4' },
    });
    const keep = await repo.colecao('vinculosDisciplina').criar({
      normaId,
      sugestao: 'Civil',
      trecho: { inicioEndereco: 'art1', fimEndereco: 'art2' },
    });

    const r = await atualizarItem(repo, fonte2, e2);
    if (r.estado !== 'atualizada') throw new Error('não atualizou');
    expect(r.comparacao.removidos.map((n) => n.endereco)).toEqual(['art3', 'art4']);
    const pendencias = await repo.colecao('pendenciasReleitura').todosDoUsuario();
    expect(pendencias.map((p) => [p.tipo, p.enderecoAntigo, p.referenciaId]).sort()).toEqual(
      [
        ['estrela', 'art4', estrela.id],
        ['erro', 'art4', erro.id],
        ['lido_ate', 'art4', leitura.id],
        ['vinculo', 'art3', disciplina.id],
      ].sort(),
    );
    expect((await repo.colecao('leituras').obter(leitura.id))?.lidoAteId).toBe(id('art2'));
    expect((await repo.colecao('vinculosDisciplina').obter(disciplina.id))?.trecho).toBeUndefined();
    expect((await repo.colecao('vinculosDisciplina').obter(keep.id))?.trecho).toBeDefined();
    const visiveis = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId);
    expect(visiveis.map((d) => d.endereco)).toEqual(['art1', 'art2']);
    repo.fechar();
  });

  it('é idempotente e itensComVersaoNova acusa a versão maior', async () => {
    const { repo, fonte2, e2 } = await montar([no('art1', 'Texto novo.')]);
    expect((await itensComVersaoNova(repo, [e2])).map((x) => x.versaoAderida)).toEqual([1]);
    await atualizarItem(repo, fonte2, e2);
    expect((await atualizarItem(repo, fonte2, e2)).estado).toBe('em_dia');
    expect(await itensComVersaoNova(repo, [e2])).toEqual([]);
    expect(await repo.colecao('versoesNorma').todosDoUsuario()).toHaveLength(2);
    repo.fechar();
  });

  it('recusa item que não foi adicionado', async () => {
    const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const fonte = await FonteEmMemoria.criar([{ item: item(2, [no('art1', 'x')]) }]);
    const [e] = (await fonte.listar()).itens;
    await expect(atualizarItem(repo, fonte, e!)).rejects.toThrow('não foi adicionado');
    repo.fechar();
  });
});
