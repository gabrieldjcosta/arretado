import { textoParaBlocos } from '../../core/seguranca/sanitizador';
import type { Repositorio } from '../../core/persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import { dispositivosDaNorma, todos } from './consultas';
import {
  converterLinha,
  dividirAqui,
  EdicaoInvalida,
  juntarComAnterior,
  salvarTexto,
  type ConverterEm,
} from './edicao';
import { atribuirOrdem } from './edicao-arvore';
import { confirmarDispositivos, corrigirDispositivo } from './revisao';
import {
  criarRascunho,
  editadoAMao,
  publicarVersao,
  retomarRascunho,
  verificarPublicacao,
} from './servico';

const TEXTO = [
  'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
  'Art. 1º Esta Lei trata do teste.',
  'Parágrafo único. O teste é contínuo.',
  'Art. 2º São deveres:',
  'I - estudar;',
  'II - revisar.',
].join('\n');

async function rascunho(texto = TEXTO) {
  const { repo } = await repositorioDeTeste();
  const criado = await criarRascunho(repo, {
    blocos: textoParaBlocos(texto),
    origemEntrada: 'texto',
  });
  return { repo, versaoId: criado.versao.id, normaId: criado.norma.id };
}

interface Linha {
  id: string;
  endereco: string;
  tipo: string;
  categoria: string;
  rotulo?: string;
  texto: string;
  pai?: string;
  confianca: string;
  notas: number;
  redacoes: number;
}

/** A árvore gravada em ordem de leitura, com o endereço do pai e o texto. */
async function ler(repo: Repositorio, normaId: string, versaoId: string): Promise<Linha[]> {
  const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), normaId, false);
  const textos = new Map(
    (
      await todos(repo.colecao('textosDispositivo'), {
        indice: 'versaoId',
        de: versaoId,
        ate: versaoId,
      })
    ).map((t) => [t.dispositivoId, t]),
  );
  const porId = new Map(ds.map((d) => [d.id, d]));
  return ds.map((d) => {
    const t = textos.get(d.id);
    return {
      id: d.id,
      endereco: d.endereco,
      tipo: d.tipo,
      categoria: d.categoria,
      ...(d.rotulo === undefined ? {} : { rotulo: d.rotulo }),
      texto: (t?.trechos ?? []).map((x) => x.texto).join(''),
      ...(d.paiId ? { pai: porId.get(d.paiId)?.endereco ?? '?' } : {}),
      confianca: d.confianca,
      notas: t?.notasVigencia?.length ?? 0,
      redacoes: t?.redacoesAnteriores?.length ?? 0,
    };
  });
}

const achar = (linhas: Linha[], endereco: string) => {
  const l = linhas.find((x) => x.endereco === endereco);
  if (!l) throw new Error(`sem ${endereco} em ${linhas.map((x) => x.endereco).join(', ')}`);
  return l;
};

describe('converter linha em… (10.2): um teste por conversão', () => {
  it('inciso → parágrafo: o número é o próximo e o recuo sobe para o artigo', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'paragrafo');
    const depois = await ler(repo, normaId, versaoId);
    const l = achar(depois, 'art2.par1');
    expect(l).toMatchObject({ tipo: 'paragrafo', rotulo: '§ 1º', pai: 'art2', texto: 'revisar.' });
    expect(l.id).toBe(achar(antes, 'art2.incII').id);
    expect(depois.map((x) => x.endereco)).toEqual(
      expect.arrayContaining(['art1', 'art1.parUnico', 'art2', 'art2.incI', 'art2.par1']),
    );
  });

  it('inciso → alínea: passa a ser filha do inciso de cima', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'alinea');
    const l = achar(await ler(repo, normaId, versaoId), 'art2.incI.alA');
    expect(l).toMatchObject({ tipo: 'alinea', rotulo: 'a)', pai: 'art2.incI' });
  });

  it('inciso → item: filho do inciso de cima, numerado 1.', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'item');
    const l = achar(await ler(repo, normaId, versaoId), 'art2.incI.it1');
    expect(l).toMatchObject({ tipo: 'item', rotulo: '1.', pai: 'art2.incI' });
  });

  it('parágrafo → inciso: numeral romano do artigo de cima', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art1.parUnico').id, 'inciso');
    const l = achar(await ler(repo, normaId, versaoId), 'art1.incI');
    expect(l).toMatchObject({ tipo: 'inciso', rotulo: 'I', pai: 'art1' });
  });

  it('inciso → artigo: o número segue o artigo anterior e os filhos acompanham a ordem', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incI').id, 'artigo');
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art3')).toMatchObject({ tipo: 'artigo', rotulo: 'Art. 3º' });
    // O inciso II, que vinha depois, passa a ser filho do artigo novo.
    expect(achar(depois, 'art3.incII').pai).toBe('art3');
    expect(depois.map((x) => x.endereco)).toEqual([
      'art1',
      'art1.parUnico',
      'art2',
      'art3',
      'art3.incII',
    ]);
  });

  it('parágrafo → nome: vira a rubrica do artigo seguinte', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art1.parUnico').id, 'nome');
    const depois = await ler(repo, normaId, versaoId);
    const nome = achar(depois, 'art2.nome');
    expect(nome).toMatchObject({ tipo: 'nome', pai: 'art2', texto: 'O teste é contínuo.' });
    expect(nome.rotulo).toBeUndefined();
    expect(nome.categoria).toBe('normativo');
    // Na ordem de leitura a rubrica vem logo depois do artigo (primeiro filho).
    expect(depois.map((x) => x.endereco)).toEqual([
      'art1',
      'art2',
      'art2.nome',
      'art2.incI',
      'art2.incII',
    ]);
  });

  it('inciso → nota de vigência: vai para a linha de cima', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'nota');
    const depois = await ler(repo, normaId, versaoId);
    expect(depois.some((x) => x.endereco === 'art2.incII')).toBe(false);
    expect(achar(depois, 'art2.incI').notas).toBe(1);
    const [t] = await repo
      .colecao('textosDispositivo')
      .obterPorChaves('[versaoId+dispositivoId]', [[versaoId, achar(depois, 'art2.incI').id]]);
    expect(t?.notasVigencia?.[0]?.texto).toBe('revisar.');
  });

  it('inciso → redação anterior: vai para a linha de cima, já confirmada', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'redacao');
    const depois = await ler(repo, normaId, versaoId);
    expect(depois.some((x) => x.endereco === 'art2.incII')).toBe(false);
    const [t] = await repo
      .colecao('textosDispositivo')
      .obterPorChaves('[versaoId+dispositivoId]', [[versaoId, achar(depois, 'art2.incI').id]]);
    expect(t?.redacoesAnteriores).toHaveLength(1);
    expect(t?.redacoesAnteriores?.[0]).toMatchObject({ confirmada: true });
  });

  it('inciso → caput: o texto entra no artigo de cima', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'caput');
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art2').texto).toBe('São deveres:\nrevisar.');
    expect(depois.some((x) => x.endereco === 'art2.incII')).toBe(false);
  });

  it.each([
    ['parte', 'parte1', 'PARTE I'],
    ['livro', 'liv1', 'LIVRO I'],
    ['titulo', 'tit1', 'TÍTULO I'],
    ['capitulo', 'cap1', 'CAPÍTULO I'],
    ['secao', 'sec1', 'SEÇÃO I'],
    ['subsecao', 'subsec1', 'SUBSEÇÃO I'],
  ] as const)('parágrafo → %s: o texto vira o nome do nó', async (para, endereco, rotulo) => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art1.parUnico').id, para);
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, endereco)).toMatchObject({ tipo: para, rotulo, categoria: 'estrutural' });
    expect(achar(depois, `${endereco}.nome`)).toMatchObject({
      tipo: 'nome',
      texto: 'O teste é contínuo.',
      categoria: 'estrutural',
      pai: endereco,
    });
    // O artigo 2 passa a ficar sob o nó, e o endereço do artigo continua sem o caminho.
    expect(achar(depois, 'art2').pai).toBe(endereco);
  });

  it('nó estrutural → parágrafo: o nome volta a ser o texto e o nó some', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art1.parUnico').id, 'capitulo');
    const meio = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(meio, 'cap1').id, 'paragrafo');
    const depois = await ler(repo, normaId, versaoId);
    expect(depois.some((x) => x.tipo === 'nome' || x.tipo === 'capitulo')).toBe(false);
    expect(achar(depois, 'art1.par1')).toMatchObject({
      rotulo: '§ 1º',
      texto: 'O teste é contínuo.',
      pai: 'art1',
    });
  });

  it('converter pelo id do nome do nó age na linha do nó', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art1.parUnico').id, 'capitulo');
    const meio = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(meio, 'cap1.nome').id, 'secao');
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'sec1').tipo).toBe('secao');
    expect(achar(depois, 'sec1.nome').texto).toBe('O teste é contínuo.');
  });

  it('o número pula o que já existe (o primeiro livre depois do anterior)', async () => {
    const { repo, versaoId, normaId } = await rascunho(
      ['Art. 1º Texto:', 'I - um;', 'II - dois;', 'III - três.', 'Art. 2º Outro.'].join('\n'),
    );
    const antes = await ler(repo, normaId, versaoId);
    // O inciso II vira artigo: o anterior é o 1, o 2 já existe, então fica 3.
    await converterLinha(repo, versaoId, achar(antes, 'art1.incII').id, 'artigo');
    expect(achar(await ler(repo, normaId, versaoId), 'art3').rotulo).toBe('Art. 3º');
  });

  it('recusa o que não faz sentido e não grava nada', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    const primeiro = achar(antes, 'art1');
    await expect(converterLinha(repo, versaoId, primeiro.id, 'nota')).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
    await expect(converterLinha(repo, versaoId, primeiro.id, 'caput')).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
    await expect(converterLinha(repo, versaoId, 'inexistente', 'inciso')).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
    expect(await ler(repo, normaId, versaoId)).toEqual(antes);
  });
});

describe('juntar com anterior (10.2)', () => {
  it('une o texto, leva o rótulo escrito e tira a linha', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await juntarComAnterior(repo, versaoId, achar(antes, 'art2.incII').id);
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art2.incI').texto).toBe('estudar;\nII - revisar.');
    expect(depois.some((x) => x.endereco === 'art2.incII')).toBe(false);
  });

  it('continua a frase com espaço quando a de cima ficou no meio', async () => {
    const { repo, versaoId, normaId } = await rascunho(
      ['Art. 1º Esta Lei trata', 'Parágrafo único. do teste.'].join('\n'),
    );
    const antes = await ler(repo, normaId, versaoId);
    await juntarComAnterior(repo, versaoId, achar(antes, 'art1.parUnico').id);
    expect(achar(await ler(repo, normaId, versaoId), 'art1').texto).toBe(
      'Esta Lei trata Parágrafo único do teste.',
    );
  });

  it('os filhos da linha juntada passam para a de cima', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await juntarComAnterior(repo, versaoId, achar(antes, 'art2').id);
    const depois = await ler(repo, normaId, versaoId);
    // O Art. 2º entrou no parágrafo único, e os incisos ficaram sob o parágrafo.
    expect(achar(depois, 'art1.parUnico').texto).toContain('Art. 2º São deveres:');
    expect(achar(depois, 'art1.parUnico.incI').pai).toBe('art1.parUnico');
  });

  it('a primeira linha não tem com quem juntar', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await expect(juntarComAnterior(repo, versaoId, antes[0]?.id ?? '')).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
  });
});

describe('dividir aqui (10.2)', () => {
  it('a segunda parte é uma linha nova do mesmo tipo, numerada pelo sistema e a confirmar', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    const incisoI = achar(antes, 'art2.incI');
    const novaId = await dividirAqui(repo, versaoId, incisoI.id, 'estudar; praticar;', 9);
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art2.incI').texto).toBe('estudar;');
    const nova = achar(depois, 'art2.incIII');
    expect(nova).toMatchObject({
      id: novaId,
      tipo: 'inciso',
      rotulo: 'III',
      texto: 'praticar;',
      pai: 'art2',
      confianca: 'a_confirmar',
    });
    // Na ordem de leitura fica logo depois do inciso I.
    expect(depois.map((x) => x.endereco)).toEqual([
      'art1',
      'art1.parUnico',
      'art2',
      'art2.incI',
      'art2.incIII',
      'art2.incII',
    ]);
  });

  it('a nota de vigência acompanha a segunda parte', async () => {
    const { repo, versaoId, normaId } = await rascunho(
      ['Art. 1º Primeira parte. Segunda parte. (Redação dada pela Lei nº 1, de 2000)'].join('\n'),
    );
    const antes = await ler(repo, normaId, versaoId);
    const artigo = achar(antes, 'art1');
    expect(artigo.notas).toBe(1);
    await dividirAqui(repo, versaoId, artigo.id, artigo.texto, 'Primeira parte.'.length);
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art1').notas).toBe(0);
    expect(achar(depois, 'art2').notas).toBe(1);
  });

  it('pede o cursor no meio do texto e recusa o que não se divide', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    const id = achar(antes, 'art2.incI').id;
    await expect(dividirAqui(repo, versaoId, id, 'estudar;', 0)).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
    await expect(dividirAqui(repo, versaoId, id, 'estudar;', 8)).rejects.toBeInstanceOf(
      EdicaoInvalida,
    );
    await converterLinha(repo, versaoId, achar(antes, 'art1.parUnico').id, 'capitulo');
    const meio = await ler(repo, normaId, versaoId);
    await expect(
      dividirAqui(repo, versaoId, achar(meio, 'cap1').id, 'O teste é contínuo.', 5),
    ).rejects.toBeInstanceOf(EdicaoInvalida);
  });
});

describe('salvar sem confirmar e rótulo (10.2)', () => {
  it('só o texto: grava, não confirma e não mexe no endereço', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    const inciso = achar(antes, 'art2.incI');
    await salvarTexto(repo, versaoId, inciso.id, { texto: 'estudar todos os dias;' });
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art2.incI')).toMatchObject({
      texto: 'estudar todos os dias;',
      confianca: 'a_confirmar',
    });
    expect(depois.map((x) => x.endereco)).toEqual(antes.map((x) => x.endereco));
  });

  it('rótulo que o sistema reconhece muda o número e os filhos o acompanham', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    const artigo = achar(antes, 'art2');
    await salvarTexto(repo, versaoId, artigo.id, { texto: artigo.texto, rotulo: 'Art. 5º' });
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art5')).toMatchObject({ rotulo: 'Art. 5º' });
    expect(achar(depois, 'art5.incI').pai).toBe('art5');
    expect(depois.some((x) => x.endereco.startsWith('art2'))).toBe(false);
  });

  it('rótulo que não reconhece muda só o que está escrito', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    const inciso = achar(antes, 'art2.incI');
    await salvarTexto(repo, versaoId, inciso.id, { texto: inciso.texto, rotulo: 'um' });
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art2.incI').rotulo).toBe('um');
  });

  it('a ordem das linhas continua certa depois de várias edições', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    let linhas = await ler(repo, normaId, versaoId);
    await dividirAqui(repo, versaoId, achar(linhas, 'art2.incI').id, 'estudar; a; b;', 9);
    linhas = await ler(repo, normaId, versaoId);
    await dividirAqui(repo, versaoId, achar(linhas, 'art2.incI').id, 'estudar; a; b;', 9);
    linhas = await ler(repo, normaId, versaoId);
    expect(linhas.map((x) => x.endereco)).toEqual([
      'art1',
      'art1.parUnico',
      'art2',
      'art2.incI',
      'art2.incIV',
      'art2.incIII',
      'art2.incII',
    ]);
  });
});

describe('a edição à mão sobrevive (10.2)', () => {
  it('retomar depois de o estruturador mudar não refaz a árvore editada', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'paragrafo');
    const editada = await ler(repo, normaId, versaoId);
    const versao = await repo.colecao('versoesNorma').obter(versaoId);
    expect(versao && editadoAMao(versao)).toBe(true);
    // O estruturador "mudou": a versão gravada é de outro estruturador, mas leva a marca.
    await repo.colecao('versoesNorma').atualizar(versaoId, { versaoAdaptador: '0.4+manual' });
    await retomarRascunho(repo, versaoId);
    expect(await ler(repo, normaId, versaoId)).toEqual(editada);
  });

  it('confirmar e corrigir da 10.1 também ficam', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await corrigirDispositivo(repo, versaoId, achar(antes, 'art2.incI').id, {
      texto: 'estudar muito;',
    });
    await confirmarDispositivos(repo, versaoId);
    await repo.colecao('versoesNorma').atualizar(versaoId, { versaoAdaptador: '0.4+manual' });
    await retomarRascunho(repo, versaoId);
    const depois = await ler(repo, normaId, versaoId);
    expect(achar(depois, 'art2.incI').texto).toBe('estudar muito;');
    expect(depois.every((x) => x.confianca === 'alta')).toBe(true);
  });

  it('sem edição à mão, o estruturador novo continua refazendo a árvore', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await repo.colecao('versoesNorma').atualizar(versaoId, { versaoAdaptador: '0.4' });
    await retomarRascunho(repo, versaoId);
    expect((await ler(repo, normaId, versaoId)).map((x) => x.endereco)).toEqual(
      antes.map((x) => x.endereco),
    );
    const versao = await repo.colecao('versoesNorma').obter(versaoId);
    expect(versao && editadoAMao(versao)).toBe(false);
  });

  it('o rascunho editado publica: sem endereço repetido e com o aceite em lote', async () => {
    const { repo, versaoId, normaId } = await rascunho();
    const antes = await ler(repo, normaId, versaoId);
    await converterLinha(repo, versaoId, achar(antes, 'art2.incII').id, 'paragrafo');
    const relatorio = await verificarPublicacao(repo, versaoId);
    expect(relatorio.conflitos).toEqual([]);
    await publicarVersao(repo, versaoId, { aceitarAConfirmar: true });
    const versao = await repo.colecao('versoesNorma').obter(versaoId);
    expect(versao?.status).toBe('vigente');
    expect((await ler(repo, normaId, versaoId)).length).toBeGreaterThan(0);
  });
});

describe('ordem entre vizinhos', () => {
  it('conserva o que continua crescente e põe o novo no meio', () => {
    const ordem = atribuirOrdem([{ id: 'a', antes: 1 }, { id: 'novo' }, { id: 'b', antes: 2 }]);
    expect(ordem.get('a')).toBe(1);
    expect(ordem.get('b')).toBe(2);
    expect(ordem.get('novo')).toBeGreaterThan(1);
    expect(ordem.get('novo')).toBeLessThan(2);
  });

  it('o novo no fim leva o número seguinte; o movido é reposto', () => {
    const ordem = atribuirOrdem([
      { id: 'a', antes: 1 },
      { id: 'b', antes: 5 },
      { id: 'c', antes: 3 },
      { id: 'novo' },
    ]);
    expect(ordem.get('a')).toBe(1);
    expect(ordem.get('b')).toBe(5);
    expect(ordem.get('c')).toBeGreaterThan(5);
    expect(ordem.get('novo')).toBeGreaterThan(ordem.get('c') ?? 0);
  });

  it('renumera tudo quando o espaço entre vizinhos acaba', () => {
    const ordem = atribuirOrdem([
      { id: 'a', antes: 1 },
      { id: 'novo' },
      { id: 'b', antes: 1 + 1e-9 },
    ]);
    expect([...ordem.values()]).toEqual([1, 2, 3]);
  });
});

// Ordem fixa dos tipos: o menu cobre todos (conferência de que nada ficou de fora).
describe('o menu de conversão', () => {
  it('cobre os tipos do §10.6', async () => {
    const { OPCOES_DE_CONVERSAO } = await import('./edicao-arvore');
    const valores: ConverterEm[] = OPCOES_DE_CONVERSAO.map((o) => o.valor);
    expect(valores).toEqual(
      expect.arrayContaining([
        'caput',
        'paragrafo',
        'inciso',
        'alinea',
        'item',
        'nome',
        'nota',
        'redacao',
        'parte',
        'livro',
        'titulo',
        'capitulo',
        'secao',
        'subsecao',
        'artigo',
      ]),
    );
  });
});
