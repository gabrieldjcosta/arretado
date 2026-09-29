import { Barramento, type Evento } from '../../core/eventos/barramento';
import { aplicar, exportarPacote, lerPacote, planejar } from '../../core/pacote';
import { lerAnexo, RegistroInvalido, Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { sha256 } from '../../core/util/sha256';
import { repositorioDeTeste } from '../../testes/repositorio';
import { estruturar, VERSAO_ESTRUTURADOR } from './estruturador';
import { lerFonte, serializarFonte } from './registros';
import {
  criarRascunho,
  descartarRascunho,
  PublicacaoBloqueada,
  publicarVersao,
  RascunhoIndisponivel,
  rascunhosPendentes,
  retomarRascunho,
  verificarPublicacao,
  versaoComMesmaFonte,
} from './servico';

const LINK = 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14000.htm';
const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('Presidência da República'),
  linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
  linha('(Vide Lei nº 9.999, de 2019)'),
  linha('Dispõe sobre o teste.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES GERAIS'),
  linha('Objeto'),
  {
    trechos: [
      { texto: 'Art. 1º Esta Lei trata do teste. ' },
      { texto: '(Redação dada pela Lei nº 14.000, de 2021)', link: LINK },
    ],
  },
  linha('Parágrafo único. O teste é contínuo.'),
  linha('Art. 2º São deveres:'),
  linha('I - estudar;'),
  linha('II - revisar.'),
  linha('Brasília, 5 de maio de 2020; 199º da Independência e 132º da República.'),
];

const ORDEM_DE_LEITURA = [
  [1, 'preambulo', 'preambulo', 'normativo', undefined],
  [2, 'tit1', 'titulo', 'estrutural', undefined],
  [3, 'tit1.nome', 'nome', 'estrutural', 'tit1'],
  [4, 'art1', 'artigo', 'normativo', 'tit1'],
  [5, 'art1.nome', 'nome', 'normativo', 'art1'],
  [6, 'art1.parUnico', 'paragrafo', 'normativo', 'art1'],
  [7, 'art2', 'artigo', 'normativo', 'tit1'],
  [8, 'art2.incI', 'inciso', 'normativo', 'art2'],
  [9, 'art2.incII', 'inciso', 'normativo', 'art2'],
];

async function arvore(repo: Repositorio, normaId: string) {
  const dispositivos = (await repo.colecao('dispositivos').todosDoUsuario())
    .filter((d) => d.normaId === normaId)
    .sort((a, b) => a.ordem - b.ordem);
  const enderecoDe = new Map(dispositivos.map((d) => [d.id, d.endereco]));
  const textos = (await repo.colecao('textosDispositivo').todosDoUsuario()).filter(
    (t) => t.normaId === normaId,
  );
  return {
    dispositivos,
    textos,
    linhas: dispositivos.map((d) => [
      d.ordem,
      d.endereco,
      d.tipo,
      d.categoria,
      d.paiId && enderecoDe.get(d.paiId),
    ]),
    textoDe: (endereco: string) => textos.find((t) => enderecoDe.get(t.dispositivoId) === endereco),
  };
}

async function contagem(repo: Repositorio) {
  return {
    normas: await repo.db.tabela('normas').count(),
    versoesNorma: await repo.db.tabela('versoesNorma').count(),
    dispositivos: await repo.db.tabela('dispositivos').count(),
    textosDispositivo: await repo.db.tabela('textosDispositivo').count(),
    anexos: await repo.db.tabela('anexos').count(),
    anexosConteudo: await repo.db.anexosConteudo.count(),
  };
}

async function motivoDa(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (excecao) {
    if (excecao instanceof RascunhoIndisponivel) return excecao.motivo;
    throw excecao;
  }
  return 'sem falha';
}

describe('criar rascunho (9.2)', () => {
  it('grava norma, versão rascunho, um dispositivo e um texto por nó e a fonte como anexo', async () => {
    const eventos = new Barramento();
    const { repo } = await repositorioDeTeste({ eventos });
    const recebidos: Evento[] = [];
    eventos.assinar('*', (e) => {
      recebidos.push(e);
    });
    const { norma, versao, rascunho } = await criarRascunho(repo, {
      blocos: LEI,
      origemEntrada: 'html',
    });

    expect(rascunho).toEqual(estruturar(LEI));
    expect(norma).toMatchObject({
      tituloCurto: 'Lei nº 1.234/2020',
      escopo: 'pessoal',
      tipo: 'Lei',
      referencia: '1.234/2020',
      epigrafe: 'LEI Nº 1.234, DE 5 DE MAIO DE 2020.',
      ementa: 'Dispõe sobre o teste.',
      fonteConsultadaEm: '2026-09-23',
      origem: 'importacao',
    });
    expect(norma.versaoVigenteId).toBeUndefined();
    expect(versao).toMatchObject({
      normaId: norma.id,
      status: 'rascunho',
      capturadaEm: '2026-09-23T12:00:00.000Z',
      origemEntrada: 'html',
      hash: await sha256(serializarFonte(LEI)),
      versaoAdaptador: VERSAO_ESTRUTURADOR,
      notaVigenciaMaisRecente: { lei: 'Lei nº 14.000', ano: 2021 },
      // A nota da norma inteira, sem `tipo` nem `linha`.
      notasDaNorma: [{ texto: '(Vide Lei nº 9.999, de 2019)', lei: 'Lei nº 9.999', ano: 2019 }],
    });

    const lida = await arvore(repo, norma.id);
    expect(lida.linhas).toEqual(ORDEM_DE_LEITURA);
    expect(lida.dispositivos.every((d) => d.status === 'vigente' && d.confianca === 'alta')).toBe(
      true,
    );
    expect(lida.dispositivos.map((d) => d.rotulo)).toEqual([
      undefined,
      'TÍTULO I',
      undefined,
      'Art. 1º',
      undefined,
      'Parágrafo único',
      'Art. 2º',
      'I',
      'II',
    ]);
    // Um texto por dispositivo, inclusive o do título (vazio), todos desta versão.
    expect(lida.textos).toHaveLength(9);
    expect(new Set(lida.textos.map((t) => t.dispositivoId)).size).toBe(9);
    expect(lida.textos.every((t) => t.versaoId === versao.id)).toBe(true);
    expect(lida.textoDe('tit1')).toMatchObject({ trechos: [] });
    expect(lida.textoDe('tit1')).not.toHaveProperty('notasVigencia');
    expect(lida.textoDe('art1')).toMatchObject({
      trechos: [{ texto: 'Esta Lei trata do teste.' }],
      notasVigencia: [
        {
          texto: '(Redação dada pela Lei nº 14.000, de 2021)',
          lei: 'Lei nº 14.000',
          ano: 2021,
          link: LINK,
        },
      ],
    });

    // A fonte: os blocos como vieram, com o hash da versão.
    const fonte = await lerAnexo(repo, versao.anexoFonteId ?? '');
    expect(fonte?.anexo).toMatchObject({ tipoMime: 'application/json', hash: versao.hash });
    expect(lerFonte(fonte?.bytes ?? new Uint8Array())).toEqual(LEI);

    // Eventos só depois da confirmação; a árvore sai num registro.lote por coleção.
    expect(recebidos.filter((e) => e.nome === 'registro.lote').map((e) => e.payload)).toEqual([
      { colecao: 'dispositivos', quantidade: 9 },
      { colecao: 'textosDispositivo', quantidade: 9 },
    ]);
  });

  it('título informado prevalece; URL oficial; texto puro fica a confirmar e sem data de consulta', async () => {
    const { repo } = await repositorioDeTeste();
    const url = 'https://www.planalto.gov.br/ccivil_03/leis/l1234.htm';
    const { norma } = await criarRascunho(repo, {
      blocos: LEI,
      origemEntrada: 'url',
      tituloCurto: '  Lei do teste  ',
      urlOficial: url,
    });
    expect(norma).toMatchObject({
      tituloCurto: 'Lei do teste',
      urlOficial: url,
      fonteConsultadaEm: '2026-09-23',
    });

    const puro = await criarRascunho(repo, {
      blocos: LEI,
      origemEntrada: 'texto',
      tituloCurto: '   ',
      urlOficial: '  ',
    });
    expect(puro.norma).not.toHaveProperty('urlOficial');
    expect(puro.norma.tituloCurto).toBe('Lei nº 1.234/2020');
    expect(puro.norma).not.toHaveProperty('fonteConsultadaEm');
    expect(puro.versao.origemEntrada).toBe('texto');
    const lida = await arvore(repo, puro.norma.id);
    expect(lida.dispositivos.length).toBeGreaterThan(0);
    expect(lida.dispositivos.every((d) => d.confianca === 'a_confirmar')).toBe(true);
  });

  it('falha no meio não deixa nada: nem norma, nem anexo, nem os bytes, nem log', async () => {
    const { repo } = await repositorioDeTeste();
    const antes = await repo.db.alteracoes.count();
    await expect(
      criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', urlOficial: 'ftp://x.gov.br' }),
    ).rejects.toBeInstanceOf(RegistroInvalido);
    expect(await contagem(repo)).toEqual({
      normas: 0,
      versoesNorma: 0,
      dispositivos: 0,
      textosDispositivo: 0,
      anexos: 0,
      anexosConteudo: 0,
    });
    expect(await repo.db.alteracoes.count()).toBe(antes);
  });

  it('norma sem artigos também é gravada (o sumário da 9.5 mostra a anomalia)', async () => {
    const { repo } = await repositorioDeTeste();
    const { rascunho, norma } = await criarRascunho(repo, {
      blocos: [linha('Um texto qualquer que não é lei.')],
      origemEntrada: 'texto',
    });
    expect(rascunho.anomalias.map((a) => a.tipo)).toContain('sem_artigos');
    expect(norma.tituloCurto).toBe('Norma sem título');
  });
});

describe('rascunhos pendentes, retomar e descartar (9.2)', () => {
  it('lista só os rascunhos, do mais recente ao mais antigo', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const a = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', tituloCurto: 'A' });
    relogio.avancar(1_000);
    const b = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', tituloCurto: 'B' });
    expect((await rascunhosPendentes(repo)).map((p) => p.norma.tituloCurto)).toEqual(['B', 'A']);
    await repo.colecao('versoesNorma').atualizar(a.versao.id, { status: 'vigente' });
    expect(await rascunhosPendentes(repo)).toEqual([{ norma: b.norma, versao: b.versao }]);
  });

  it('retomar devolve o mesmo rascunho, sem regravar nada', async () => {
    const { repo } = await repositorioDeTeste();
    const criado = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const antes = await arvore(repo, criado.norma.id);
    const log = await repo.db.alteracoes.count();
    const retomado = await retomarRascunho(repo, criado.versao.id);
    expect(retomado).toEqual(criado);
    expect((await arvore(repo, criado.norma.id)).dispositivos).toEqual(antes.dispositivos);
    expect(await repo.db.alteracoes.count()).toBe(log);
  });

  it('retomar depois de o estruturador mudar refaz a árvore pela fonte, com os ids de cada endereço, e mantém o título', async () => {
    const { repo } = await repositorioDeTeste();
    const criado = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const gravada = await arvore(repo, criado.norma.id);
    const idDe = new Map(gravada.dispositivos.map((d) => [d.endereco, d.id]));
    const textoDe = new Map(gravada.textos.map((t) => [t.dispositivoId, t.id]));
    // Como se o rascunho tivesse sido gravado por um estruturador anterior, que achava um art. 3º.
    await repo.colecao('versoesNorma').atualizar(criado.versao.id, {
      versaoAdaptador: '0.4',
      notaVigenciaMaisRecente: undefined,
    });
    const sobra = await repo.colecao('dispositivos').criar({
      normaId: criado.norma.id,
      endereco: 'art3',
      categoria: 'normativo',
      tipo: 'artigo',
      ordem: 10,
      status: 'vigente',
      confianca: 'alta',
    });
    await repo.colecao('textosDispositivo').criar({
      versaoId: criado.versao.id,
      dispositivoId: sobra.id,
      normaId: criado.norma.id,
      trechos: [{ texto: 'Sobra.' }],
    });
    await repo.colecao('normas').atualizar(criado.norma.id, {
      tituloCurto: 'Meu título',
      ementa: 'velha',
      tituloOficial: 'X',
    });

    const retomado = await retomarRascunho(repo, criado.versao.id);
    expect(retomado.versao).toMatchObject({
      versaoAdaptador: VERSAO_ESTRUTURADOR,
      notaVigenciaMaisRecente: { lei: 'Lei nº 14.000', ano: 2021 },
    });
    expect(retomado.norma).toMatchObject({
      tituloCurto: 'Meu título',
      ementa: 'Dispõe sobre o teste.',
    });
    expect(retomado.norma).not.toHaveProperty('tituloOficial');
    const lida = await arvore(repo, criado.norma.id);
    expect(lida.linhas).toEqual(ORDEM_DE_LEITURA);
    // O mesmo endereço mantém o id do dispositivo e o do texto; o que sumiu (art. 3º) sai.
    expect(lida.dispositivos.map((d) => d.id)).toEqual(
      lida.dispositivos.map((d) => idDe.get(d.endereco)),
    );
    expect(lida.textos.map((t) => t.id).sort()).toEqual(
      lida.textos.map((t) => textoDe.get(t.dispositivoId)).sort(),
    );
    expect(await contagem(repo)).toMatchObject({ dispositivos: 9, textosDispositivo: 9 });
  });

  it('backup anterior ao refazer, importado por mesclagem (modos 2 e 4), não cria uma segunda árvore', async () => {
    const { repo } = await repositorioDeTeste();
    const criado = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await repo.colecao('versoesNorma').atualizar(criado.versao.id, { versaoAdaptador: '0.4' });
    const backup = await lerPacote(
      (await exportarPacote(repo, { incluirAnexos: true, incluirLog: false })).bytes,
    );
    await retomarRascunho(repo, criado.versao.id);
    for (const modo of [2, 4] as const) {
      const previa = await planejar(repo, backup, { modo });
      await aplicar(repo, backup, previa, new Map(), { snapshot: false });
      const lida = await arvore(repo, criado.norma.id);
      expect(lida.linhas).toEqual(ORDEM_DE_LEITURA);
      expect(lida.textos).toHaveLength(9);
    }
  });

  it('refazer a árvore de norma com outra versão é recusado sem mexer em nada', async () => {
    const { repo } = await repositorioDeTeste();
    const criado = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await repo.colecao('versoesNorma').atualizar(criado.versao.id, { versaoAdaptador: '0.4' });
    await repo.colecao('versoesNorma').criar({
      normaId: criado.norma.id,
      status: 'vigente',
      capturadaEm: '2026-09-01T12:00:00.000Z',
      origemEntrada: 'html',
      hash: '0'.repeat(64),
    });
    const antes = await arvore(repo, criado.norma.id);
    expect(await motivoDa(retomarRascunho(repo, criado.versao.id))).toBe(
      'norma_com_outras_versoes',
    );
    expect((await arvore(repo, criado.norma.id)).dispositivos).toEqual(antes.dispositivos);
  });

  it('fonte alterada ou ausente: o rascunho não é retomado', async () => {
    const { repo } = await repositorioDeTeste();
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const anexoId = versao.anexoFonteId ?? '';
    await repo.db.anexosConteudo.put({ id: anexoId, bytes: serializarFonte([linha('outra')]) });
    expect(await motivoDa(retomarRascunho(repo, versao.id))).toBe('fonte_ilegivel');
    await repo.db.anexosConteudo.delete(anexoId);
    expect(await motivoDa(retomarRascunho(repo, versao.id))).toBe('fonte_ilegivel');
  });

  it('descartar apaga tudo do rascunho, com registro no log, e deixa as outras normas', async () => {
    const eventos = new Barramento();
    const { repo } = await repositorioDeTeste({ eventos });
    const a = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', tituloCurto: 'A' });
    const b = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html', tituloCurto: 'B' });
    const idsDeA = [
      a.norma.id,
      a.versao.id,
      a.versao.anexoFonteId,
      ...(await arvore(repo, a.norma.id)).dispositivos.map((d) => d.id),
      ...(await arvore(repo, a.norma.id)).textos.map((t) => t.id),
    ];
    const seq = (await repo.db.alteracoes.orderBy('seq').last())?.seq ?? 0;
    const recebidos: Evento[] = [];
    eventos.assinar('*', (e) => {
      recebidos.push(e);
    });

    await descartarRascunho(repo, a.versao.id);
    expect(await contagem(repo)).toEqual({
      normas: 1,
      versoesNorma: 1,
      dispositivos: 9,
      textosDispositivo: 9,
      anexos: 1,
      anexosConteudo: 1,
    });
    expect(await rascunhosPendentes(repo)).toEqual([{ norma: b.norma, versao: b.versao }]);
    const log = await repo.db.alteracoes.where('seq').above(seq).toArray();
    expect(log.every((l) => l.operacao === 'remover')).toBe(true);
    expect(new Set(log.map((l) => l.registroId))).toEqual(new Set(idsDeA));
    // Um registro.lote por coleção, só depois da confirmação.
    expect(recebidos.map((e) => [e.nome, e.payload])).toEqual([
      ['registro.lote', { colecao: 'textosDispositivo', quantidade: 9 }],
      ['registro.lote', { colecao: 'dispositivos', quantidade: 9 }],
      ['registro.lote', { colecao: 'versoesNorma', quantidade: 1 }],
      ['registro.lote', { colecao: 'normas', quantidade: 1 }],
      ['registro.lote', { colecao: 'anexos', quantidade: 1 }],
    ]);
    expect(await motivoDa(retomarRascunho(repo, a.versao.id))).toBe('inexistente');
    expect(await motivoDa(descartarRascunho(repo, a.versao.id))).toBe('inexistente');
  });

  it('versão publicada, inexistente ou de norma com outra versão não se descarta', async () => {
    const { repo } = await repositorioDeTeste();
    const publicada = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await repo.colecao('versoesNorma').atualizar(publicada.versao.id, { status: 'vigente' });
    expect(await motivoDa(descartarRascunho(repo, publicada.versao.id))).toBe('publicada');
    expect(await motivoDa(retomarRascunho(repo, publicada.versao.id))).toBe('publicada');
    expect(await motivoDa(descartarRascunho(repo, repo.ctx.novoId()))).toBe('inexistente');

    const comOutra = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await repo.colecao('versoesNorma').criar({
      normaId: comOutra.norma.id,
      status: 'arquivada',
      capturadaEm: '2026-09-01T12:00:00.000Z',
      origemEntrada: 'html',
      hash: '0'.repeat(64),
    });
    const antes = await contagem(repo);
    expect(await motivoDa(descartarRascunho(repo, comOutra.versao.id))).toBe(
      'norma_com_outras_versoes',
    );
    expect(await contagem(repo)).toEqual(antes);
  });
});

// Duas "SEÇÃO IV" no mesmo capítulo, como na LC 80: o estrutural repete, o artigo não.
const DUAS_SECOES: Bloco[] = [
  linha('LEI COMPLEMENTAR Nº 1, DE 1º DE JANEIRO DE 2000.'),
  linha('Dispõe sobre o teste.'),
  linha('TÍTULO I'),
  linha('DO TESTE'),
  linha('CAPÍTULO I'),
  linha('DO CAPÍTULO'),
  linha('SEÇÃO IV'),
  linha('DA PRIMEIRA'),
  linha('Art. 1º Um.'),
  linha('SEÇÃO IV'),
  linha('DA SEGUNDA'),
  linha('Art. 2º Dois.'),
];

async function bloqueioDa(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (excecao) {
    if (excecao instanceof PublicacaoBloqueada) return excecao;
    throw excecao;
  }
  return undefined;
}

/** O que a publicação não pode mudar: a árvore da norma. */
async function estado(repo: Repositorio, normaId: string) {
  const lida = await arvore(repo, normaId);
  return { dispositivos: lida.dispositivos, textos: lida.textos };
}

describe('publicar (9.3)', () => {
  it('a versão vira vigente, a norma aponta para ela e a árvore fica como estava', async () => {
    const eventos = new Barramento();
    const { repo, relogio } = await repositorioDeTeste({ eventos });
    const criado = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const antes = await estado(repo, criado.norma.id);
    const log = await repo.db.alteracoes.count();
    const recebidos: Evento[] = [];
    eventos.assinar('*', (e) => {
      recebidos.push(e);
    });
    relogio.avancar(60_000);

    const publicada = await publicarVersao(repo, criado.versao.id);

    expect(publicada.versao).toMatchObject({ id: criado.versao.id, status: 'vigente' });
    expect(publicada.norma).toMatchObject({
      id: criado.norma.id,
      versaoVigenteId: criado.versao.id,
    });
    expect(publicada.relatorio).toEqual({
      conflitos: [],
      avisos: [],
      aConfirmar: 0,
      totalDispositivos: 9,
    });
    expect(await repo.colecao('versoesNorma').obter(criado.versao.id)).toEqual(publicada.versao);
    expect(await repo.colecao('normas').obter(criado.norma.id)).toEqual(publicada.norma);
    // Só a versão e a norma mudam: dispositivos e textos iguais, byte a byte.
    expect(await estado(repo, criado.norma.id)).toEqual(antes);
    expect(await rascunhosPendentes(repo)).toEqual([]);
    // Duas atualizações no log, e nenhuma outra escrita.
    const novas = await repo.db.alteracoes.where('seq').above(log).toArray();
    expect(novas.map((l) => [l.colecao, l.operacao])).toEqual([
      ['versoesNorma', 'atualizar'],
      ['normas', 'atualizar'],
    ]);
    // O evento sai depois da confirmação, com só os ids.
    expect(recebidos.map((e) => e.nome)).toEqual([
      'registro.atualizado',
      'registro.atualizado',
      'versao.publicada',
    ]);
    expect(recebidos.at(-1)?.payload).toEqual({
      normaId: criado.norma.id,
      versaoId: criado.versao.id,
    });
  });

  it('norma publicada nunca muda sem nova versão: publicar, descartar e retomar recusam', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await publicarVersao(repo, versao.id);
    // Como se o estruturador tivesse mudado depois: retomar refaria a árvore de um rascunho.
    await repo.colecao('versoesNorma').atualizar(versao.id, { versaoAdaptador: '0.4' });
    const antes = await estado(repo, norma.id);
    const log = await repo.db.alteracoes.count();

    expect(await motivoDa(publicarVersao(repo, versao.id))).toBe('publicada');
    expect(await motivoDa(descartarRascunho(repo, versao.id))).toBe('publicada');
    expect(await motivoDa(retomarRascunho(repo, versao.id))).toBe('publicada');
    expect(await motivoDa(verificarPublicacao(repo, versao.id))).toBe('publicada');

    expect(await estado(repo, norma.id)).toEqual(antes);
    expect(await repo.db.alteracoes.count()).toBe(log);
    expect(await contagem(repo)).toMatchObject({ normas: 1, versoesNorma: 1, dispositivos: 9 });
  });

  it('endereço de dispositivo duplicado bloqueia, sem mudar nada, e publica quando é corrigido', async () => {
    const eventos = new Barramento();
    const { repo } = await repositorioDeTeste({ eventos });
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const repetido = await repo.colecao('dispositivos').criar({
      normaId: norma.id,
      endereco: 'art1',
      categoria: 'normativo',
      tipo: 'artigo',
      ordem: 10,
      rotulo: 'Art. 1º-A',
      status: 'vigente',
      confianca: 'alta',
    });
    const recebidos: string[] = [];
    eventos.assinar('versao.publicada', (e) => {
      recebidos.push(e.nome);
    });
    const log = await repo.db.alteracoes.count();

    const relatorio = await verificarPublicacao(repo, versao.id);
    expect(relatorio.conflitos).toEqual([
      {
        tipo: 'endereco_duplicado',
        gravidade: 'conflito',
        endereco: 'art1',
        mensagem:
          'O endereço art1 aparece 2 vezes (Art. 1º, Art. 1º-A). Corrija antes de publicar.',
      },
    ]);
    expect(relatorio.avisos).toEqual([]);

    // O aceite em lote é dos "a confirmar"; não passa por cima de conflito.
    const bloqueio = await bloqueioDa(publicarVersao(repo, versao.id, { aceitarAConfirmar: true }));
    expect(bloqueio).toMatchObject({ motivo: 'conflitos', versaoId: versao.id });
    expect(bloqueio?.relatorio.conflitos).toHaveLength(1);
    expect(bloqueio?.message).toBe('Há 1 conflito(s) a resolver antes de publicar.');
    expect(await repo.colecao('versoesNorma').obter(versao.id)).toMatchObject({
      status: 'rascunho',
    });
    expect(await repo.colecao('normas').obter(norma.id)).not.toHaveProperty('versaoVigenteId');
    expect(await repo.db.alteracoes.count()).toBe(log);
    expect(recebidos).toEqual([]);

    // Dispositivo excluído (logicamente) não conta.
    await repo.colecao('dispositivos').excluir(repetido.id);
    const publicada = await publicarVersao(repo, versao.id);
    expect(publicada.versao.status).toBe('vigente');
    expect(recebidos).toEqual(['versao.publicada']);
  });

  it('nó estrutural repetido só avisa (LC 80: duas "SEÇÃO IV") e a norma é publicada', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao, rascunho } = await criarRascunho(repo, {
      blocos: DUAS_SECOES,
      origemEntrada: 'html',
    });
    // A árvore gravada mesmo tem o endereço duas vezes (o estruturador não funde o estrutural).
    const gravada = await arvore(repo, norma.id);
    expect(gravada.dispositivos.filter((d) => d.endereco === 'tit1.cap1.sec4')).toHaveLength(2);
    expect(rascunho.anomalias.filter((a) => a.gravidade === 'conflito')).toEqual([]);

    const publicada = await publicarVersao(repo, versao.id);
    expect(publicada.relatorio.conflitos).toEqual([]);
    expect(publicada.relatorio.avisos.map((a) => [a.tipo, a.gravidade, a.endereco])).toEqual([
      ['endereco_duplicado', 'aviso', 'tit1.cap1.sec4'],
      ['endereco_duplicado', 'aviso', 'tit1.cap1.sec4.nome'],
    ]);
    expect(publicada.relatorio.avisos[0]?.mensagem).toBe(
      'O endereço tit1.cap1.sec4 aparece 2 vezes (SEÇÃO IV): a fonte repete a numeração. Dá para publicar; corrija o rótulo na revisão.',
    );
    expect(publicada.versao.status).toBe('vigente');
  });

  it('estrutural e dispositivo no mesmo endereço é conflito; o aviso é só de estrutural com estrutural', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, {
      blocos: DUAS_SECOES,
      origemEntrada: 'html',
    });
    await repo.colecao('dispositivos').criar({
      normaId: norma.id,
      endereco: 'tit1.cap1.sec4',
      categoria: 'normativo',
      tipo: 'artigo',
      ordem: 20,
      status: 'vigente',
      confianca: 'alta',
    });
    const relatorio = await verificarPublicacao(repo, versao.id);
    expect(relatorio.conflitos.map((c) => c.endereco)).toEqual(['tit1.cap1.sec4']);
    expect(relatorio.avisos.map((a) => a.endereco)).toEqual(['tit1.cap1.sec4.nome']);
  });

  it('norma sem artigo bloqueia (é o conflito que o estruturador já acusa)', async () => {
    const { repo } = await repositorioDeTeste();
    const { versao } = await criarRascunho(repo, {
      blocos: [linha('Um texto qualquer que não é lei.')],
      origemEntrada: 'html',
    });
    const bloqueio = await bloqueioDa(publicarVersao(repo, versao.id, { aceitarAConfirmar: true }));
    expect(bloqueio?.motivo).toBe('conflitos');
    expect(bloqueio?.relatorio.conflitos.map((c) => c.tipo)).toEqual(['sem_artigos']);
  });

  it('"a confirmar" bloqueia até ser aceito em lote, e o aceite não muda a confiança', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'texto' });
    const total = (await arvore(repo, norma.id)).dispositivos.length;
    const relatorio = await verificarPublicacao(repo, versao.id);
    expect(relatorio).toMatchObject({ conflitos: [], aConfirmar: total, totalDispositivos: total });

    const bloqueio = await bloqueioDa(publicarVersao(repo, versao.id));
    expect(bloqueio).toMatchObject({ motivo: 'a_confirmar' });
    expect(bloqueio?.relatorio.aConfirmar).toBe(total);
    expect(bloqueio?.message).toBe(
      `${String(total)} dispositivo(s) a confirmar: aceite-os em lote para publicar.`,
    );
    expect(
      await bloqueioDa(publicarVersao(repo, versao.id, { aceitarAConfirmar: false })),
    ).toMatchObject({ motivo: 'a_confirmar' });
    expect(await repo.colecao('versoesNorma').obter(versao.id)).toMatchObject({
      status: 'rascunho',
    });

    const antes = await estado(repo, norma.id);
    const publicada = await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
    expect(publicada.versao.status).toBe('vigente');
    expect(publicada.relatorio.aConfirmar).toBe(total);
    expect(await estado(repo, norma.id)).toEqual(antes);
    expect(
      (await arvore(repo, norma.id)).dispositivos.every((d) => d.confianca === 'a_confirmar'),
    ).toBe(true);
  });

  it('conflito vem antes do "a confirmar": corrigir primeiro, e o aceite em lote não o dispensa', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'texto' });
    await repo.colecao('dispositivos').criar({
      normaId: norma.id,
      endereco: 'art1',
      categoria: 'normativo',
      tipo: 'artigo',
      ordem: 20,
      status: 'vigente',
      confianca: 'a_confirmar',
    });
    const relatorio = await verificarPublicacao(repo, versao.id);
    expect(relatorio.conflitos.map((c) => c.endereco)).toEqual(['art1']);
    expect(relatorio.aConfirmar).toBeGreaterThan(1);
    for (const opcoes of [{}, { aceitarAConfirmar: true }]) {
      expect((await bloqueioDa(publicarVersao(repo, versao.id, opcoes)))?.motivo).toBe('conflitos');
    }
    expect(await repo.colecao('versoesNorma').obter(versao.id)).toMatchObject({
      status: 'rascunho',
    });
  });

  it('só os dispositivos "a confirmar" contam, e sem eles o aceite é dispensável', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const art2 = (await arvore(repo, norma.id)).dispositivos.find((d) => d.endereco === 'art2');
    await repo.colecao('dispositivos').atualizar(art2?.id ?? '', { confianca: 'a_confirmar' });
    expect((await verificarPublicacao(repo, versao.id)).aConfirmar).toBe(1);
    expect((await bloqueioDa(publicarVersao(repo, versao.id)))?.motivo).toBe('a_confirmar');
    await repo.colecao('dispositivos').atualizar(art2?.id ?? '', { confianca: 'media' });
    expect((await publicarVersao(repo, versao.id)).versao.status).toBe('vigente');
  });

  it('a verificação não grava nada e recusa o que não é rascunho de norma única', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    const log = await repo.db.alteracoes.count();
    await verificarPublicacao(repo, versao.id);
    expect(await repo.db.alteracoes.count()).toBe(log);
    expect(await motivoDa(verificarPublicacao(repo, repo.ctx.novoId()))).toBe('inexistente');

    await repo.colecao('versoesNorma').criar({
      normaId: norma.id,
      status: 'arquivada',
      capturadaEm: '2026-09-01T12:00:00.000Z',
      origemEntrada: 'html',
      hash: '0'.repeat(64),
    });
    expect(await motivoDa(verificarPublicacao(repo, versao.id))).toBe('norma_com_outras_versoes');
    const antes = await estado(repo, norma.id);
    expect(await motivoDa(publicarVersao(repo, versao.id))).toBe('norma_com_outras_versoes');
    expect(await repo.colecao('versoesNorma').obter(versao.id)).toMatchObject({
      status: 'rascunho',
    });
    expect(await estado(repo, norma.id)).toEqual(antes);
  });

  it('publicar depois de descartar, e descartar depois de publicar: a segunda recusa', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await descartarRascunho(repo, a.versao.id);
    expect(await motivoDa(publicarVersao(repo, a.versao.id))).toBe('inexistente');
    expect(await contagem(repo)).toMatchObject({ normas: 0, dispositivos: 0 });

    const b = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await publicarVersao(repo, b.versao.id);
    expect(await motivoDa(descartarRascunho(repo, b.versao.id))).toBe('publicada');
    expect(await contagem(repo)).toMatchObject({
      normas: 1,
      dispositivos: 9,
      textosDispositivo: 9,
    });
  });

  it('duas abas ao mesmo tempo: uma publica ou descarta, a outra recusa, e nada fica pela metade', async () => {
    const { repo: aba1 } = await repositorioDeTeste();
    const aba2 = await Repositorio.abrir({ nomeBanco: aba1.db.name });
    try {
      for (const ordem of ['publicar-primeiro', 'descartar-primeiro'] as const) {
        const { norma, versao } = await criarRascunho(aba1, { blocos: LEI, origemEntrada: 'html' });
        const publicar = () => publicarVersao(aba1, versao.id);
        const descartar = () => descartarRascunho(aba2, versao.id);
        const [publicou, descartou] =
          ordem === 'publicar-primeiro'
            ? await Promise.allSettled([publicar(), descartar()])
            : (await Promise.allSettled([descartar(), publicar()])).reverse();
        // Exatamente uma das duas tem êxito; a outra é RascunhoIndisponivel.
        expect([publicou?.status, descartou?.status].sort()).toEqual(['fulfilled', 'rejected']);
        const recusada = publicou?.status === 'rejected' ? publicou : descartou;
        expect(recusada?.status === 'rejected' && recusada.reason).toBeInstanceOf(
          RascunhoIndisponivel,
        );
        const versaoLida = await aba1.colecao('versoesNorma').obter(versao.id);
        if (publicou?.status === 'fulfilled') {
          expect(versaoLida?.status).toBe('vigente');
          expect((await arvore(aba1, norma.id)).dispositivos).toHaveLength(9);
        } else {
          expect(versaoLida).toBeUndefined();
          expect((await arvore(aba1, norma.id)).dispositivos).toHaveLength(0);
          expect(await aba1.colecao('normas').obter(norma.id)).toBeUndefined();
        }
      }
      // Publicar duas vezes ao mesmo tempo: uma só publica.
      const { versao } = await criarRascunho(aba1, { blocos: LEI, origemEntrada: 'html' });
      const dupla = await Promise.allSettled([
        publicarVersao(aba1, versao.id),
        publicarVersao(aba2, versao.id),
      ]);
      expect(dupla.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    } finally {
      aba2.fechar();
    }
  });

  it('o evento não sai quando a publicação falha', async () => {
    const eventos = new Barramento();
    const { repo } = await repositorioDeTeste({ eventos });
    const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'texto' });
    const nomes: string[] = [];
    eventos.assinar('*', (e) => {
      nomes.push(e.nome);
    });
    await bloqueioDa(publicarVersao(repo, versao.id));
    await motivoDa(publicarVersao(repo, repo.ctx.novoId()));
    expect(nomes).toEqual([]);
  });
});

describe('importação pela tela (9.5)', () => {
  it('o título curto confirmado entra junto com a publicação; em branco, fica o do rascunho', async () => {
    const { repo } = await repositorioDeTeste();
    const primeira = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    expect(primeira.norma.tituloCurto).toBe('Lei nº 1.234/2020');
    const log = await repo.db.alteracoes.count();

    const publicada = await publicarVersao(repo, primeira.versao.id, { tituloCurto: '  Teste  ' });

    expect(publicada.norma.tituloCurto).toBe('Teste');
    expect(await repo.colecao('normas').obter(primeira.norma.id)).toEqual(publicada.norma);
    // Na mesma atualização da norma: nenhuma escrita a mais no log.
    expect(await repo.db.alteracoes.count()).toBe(log + 2);

    const segunda = await criarRascunho(repo, { blocos: LEI.slice(0, -1), origemEntrada: 'html' });
    const semTroca = await publicarVersao(repo, segunda.versao.id, { tituloCurto: '   ' });
    expect(semTroca.norma.tituloCurto).toBe('Lei nº 1.234/2020');
  });

  it('publicação recusada não grava o título', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma, versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'texto' });
    await expect(publicarVersao(repo, versao.id, { tituloCurto: 'Outro' })).rejects.toBeInstanceOf(
      PublicacaoBloqueada,
    );
    expect((await repo.colecao('normas').obter(norma.id))?.tituloCurto).toBe(norma.tituloCurto);
  });

  it('a mesma fonte acha a versão já gravada, a vigente antes do rascunho; outra fonte, nada', async () => {
    const { repo } = await repositorioDeTeste();
    expect(await versaoComMesmaFonte(repo, LEI)).toBeUndefined();

    const rascunho = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    expect(await versaoComMesmaFonte(repo, LEI)).toEqual({
      norma: rascunho.norma,
      versao: rascunho.versao,
    });
    // Mesmo conteúdo em outro objeto: a fonte é JSON canônico.
    expect((await versaoComMesmaFonte(repo, structuredClone(LEI)))?.versao.id).toBe(
      rascunho.versao.id,
    );
    expect(await versaoComMesmaFonte(repo, LEI.slice(1))).toBeUndefined();

    // Duas normas com a mesma fonte (antes da 9.5, nada impedia): a publicada vence.
    const outra = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
    await publicarVersao(repo, outra.versao.id);
    const achada = await versaoComMesmaFonte(repo, LEI);
    expect(achada?.versao).toMatchObject({ id: outra.versao.id, status: 'vigente' });

    await descartarRascunho(repo, rascunho.versao.id);
    expect((await versaoComMesmaFonte(repo, LEI))?.versao.id).toBe(outra.versao.id);
  });
});

describe('andamento ao criar o rascunho (9.5)', () => {
  it('antesDeGravar vem depois de estruturar e antes de gravar qualquer registro', async () => {
    const { repo } = await repositorioDeTeste();
    const chamadas: Awaited<ReturnType<typeof contagem>>[] = [];
    await criarRascunho(
      repo,
      { blocos: LEI, origemEntrada: 'html' },
      {
        antesDeGravar: async () => {
          chamadas.push(await contagem(repo));
        },
      },
    );
    expect(chamadas).toEqual([
      {
        normas: 0,
        versoesNorma: 0,
        dispositivos: 0,
        textosDispositivo: 0,
        anexos: 0,
        anexosConteudo: 0,
      },
    ]);
    expect(await contagem(repo)).toMatchObject({ normas: 1, dispositivos: 9 });
  });
});
