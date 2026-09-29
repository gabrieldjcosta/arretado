import { Barramento, type Evento } from '../../core/eventos/barramento';
import { aplicar, exportarPacote, lerPacote, planejar } from '../../core/pacote';
import { lerAnexo, RegistroInvalido, type Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { sha256 } from '../../core/util/sha256';
import { repositorioDeTeste } from '../../testes/repositorio';
import { estruturar, VERSAO_ESTRUTURADOR } from './estruturador';
import { lerFonte, serializarFonte } from './registros';
import {
  criarRascunho,
  descartarRascunho,
  RascunhoIndisponivel,
  rascunhosPendentes,
  retomarRascunho,
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
