import type { Bloco } from '../../core/seguranca/sanitizador';
import type { Repositorio } from '../../core/persistencia';
import { repositorioDeTeste } from '../../testes/repositorio';
import {
  corrigirTextoPublicado,
  CorrecaoRecusada,
  textosAnteriores,
  trechosCorrigidos,
  voltarParaVersao,
} from './correcao';
import { abrirNorma, lerJanela } from './leitor';
import { criarGrifo, criarNota, marcacoesDaNorma } from './marcacoes';
import { criarRascunho, publicarVersao } from './servico';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const ART1 =
  'Art. 1º A execução penal tem por objetivo efetivar as disposições de sentença ou decisão criminal.';
const LEI: Bloco[] = [
  linha('LEI Nº 7.210, DE 11 DE JULHO DE 1984.'),
  linha('Institui a Lei de Execução Penal.'),
  linha(ART1),
  linha('Art. 2º A jurisdição penal será exercida.'),
];

async function publicada(repo: Repositorio) {
  const { versao, norma } = await criarRascunho(repo, {
    blocos: LEI,
    origemEntrada: 'html',
    tituloCurto: 'LEP',
  });
  await publicarVersao(repo, versao.id, { aceitarAConfirmar: true });
  return { normaId: norma.id, versaoId: versao.id };
}

async function textoDe(repo: Repositorio, normaId: string, endereco: string) {
  const aberta = await abrirNorma(repo, normaId);
  const itens = await lerJanela(repo, aberta, { inicio: 0, quantidade: 50 });
  const item = itens.find((i) => i.dispositivo.endereco === endereco);
  if (!item?.texto) throw new Error(`sem ${endereco}`);
  return {
    versaoId: aberta.versao.id,
    dispositivoId: item.dispositivo.id,
    texto: item.texto.trechos.map((t) => t.texto).join(''),
    trechos: item.texto.trechos,
  };
}

async function grifar(repo: Repositorio, normaId: string, endereco: string, trecho: string) {
  const alvo = await textoDe(repo, normaId, endereco);
  const inicio = alvo.texto.indexOf(trecho);
  if (inicio < 0) throw new Error(`sem "${trecho}"`);
  return criarGrifo(
    repo,
    {
      normaId,
      versaoId: alvo.versaoId,
      dispositivoId: alvo.dispositivoId,
      inicio,
      fim: inicio + trecho.length,
    },
    1,
  );
}

describe('correção do texto publicado (11.7)', () => {
  it('grava versão nova (edicao_manual), arquiva a anterior e o grifo sobrevive', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const grifo = await grifar(repo, normaId, 'art1', 'disposições de sentença');
    const art1 = await textoDe(repo, normaId, 'art1');
    const corrigido = art1.texto.replace('A execução penal', 'Esta execução penal');

    const r = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: corrigido },
    ]);

    expect(r).toMatchObject({
      estado: 'corrigida',
      versaoAnteriorId: versaoId,
      alterados: [art1.dispositivoId],
      reancoradas: 1,
      pendentes: 0,
    });
    const nova = await repo.colecao('versoesNorma').obter(r.versaoId);
    expect(nova).toMatchObject({ status: 'vigente', origemEntrada: 'edicao_manual' });
    expect(nova?.versaoAdaptador?.endsWith('+manual')).toBe(true);
    expect((await repo.colecao('versoesNorma').obter(versaoId))?.status).toBe('arquivada');
    expect((await repo.colecao('normas').obter(normaId))?.versaoVigenteId).toBe(r.versaoId);

    // Mesmo dispositivo (mesmo id); o texto novo é o lido.
    const depois = await textoDe(repo, normaId, 'art1');
    expect(depois.dispositivoId).toBe(art1.dispositivoId);
    expect(depois.texto).toBe(corrigido);

    // O grifo foi para a versão nova, no mesmo trecho, deslocado 3 letras.
    const m = await repo.colecao('marcacoes').obter(grifo.id);
    expect(m).toMatchObject({
      versaoId: r.versaoId,
      status: 'reancorada',
      ancora: { texto: 'disposições de sentença', inicio: grifo.ancora.inicio + 3 },
    });
    expect(
      (await marcacoesDaNorma(repo, normaId, r.versaoId)).get(art1.dispositivoId),
    ).toHaveLength(1);

    // A versão de antes é consultável: o texto antigo continua gravado.
    const antes = await textosAnteriores(repo, normaId, art1.dispositivoId);
    expect(antes).toEqual([
      {
        versaoId,
        capturadaEm: expect.any(String) as string,
        substituidoEm: expect.any(String) as string,
        origemEntrada: 'html',
        texto: art1.texto,
      },
    ]);
  });

  it('grifo no lugar exato fica "valida"; de outro dispositivo só muda de versão', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const noLugar = await grifar(repo, normaId, 'art1', 'A execução penal');
    const outro = await grifar(repo, normaId, 'art2', 'jurisdição penal');
    const art1 = await textoDe(repo, normaId, 'art1');
    const r = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: `${art1.texto} Texto acrescido.` },
    ]);
    expect(await repo.colecao('marcacoes').obter(noLugar.id)).toMatchObject({
      versaoId: r.versaoId,
      status: 'valida',
      ancora: noLugar.ancora,
    });
    expect(await repo.colecao('marcacoes').obter(outro.id)).toMatchObject({
      versaoId: r.versaoId,
      status: 'valida',
      ancora: outro.ancora,
    });
  });

  it('aproximada: o trecho com um erro de digitação corrigido volta, com o texto novo', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const nota = await grifar(repo, normaId, 'art1', 'efetivar as disposições de sentença');
    const art1 = await textoDe(repo, normaId, 'art1');
    const r = await corrigirTextoPublicado(repo, normaId, versaoId, [
      {
        dispositivoId: art1.dispositivoId,
        texto: art1.texto.replace('efetivar as disposições', 'efetivar às disposiçoes'),
      },
    ]);
    expect(r.reancoradas).toBe(1);
    expect(await repo.colecao('marcacoes').obter(nota.id)).toMatchObject({
      versaoId: r.versaoId,
      status: 'reancorada',
      ancora: { texto: 'efetivar às disposiçoes de sentença' },
    });
  });

  it('pendente: sem o trecho, a marcação fica para reler, guarda a âncora e avisa', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    const inicio = art1.texto.indexOf('decisão criminal');
    const nota = await criarNota(
      repo,
      {
        normaId,
        versaoId,
        dispositivoId: art1.dispositivoId,
        inicio,
        fim: inicio + 'decisão criminal'.length,
      },
      'cai muito',
    );
    const eventos: { nome: string; payload: unknown }[] = [];
    repo.eventos.assinar('*', (e) => {
      if (e.nome.includes('.') && !e.nome.startsWith('registro.')) eventos.push(e);
    });

    const r = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Texto todo outro.' },
    ]);

    expect(r).toMatchObject({ pendentes: 1, reancoradas: 0 });
    const m = await repo.colecao('marcacoes').obter(nota.id);
    expect(m).toMatchObject({
      status: 'pendente',
      versaoId,
      ancora: nota.ancora,
      nota: 'cai muito',
    });
    expect(eventos).toEqual([
      {
        nome: 'dispositivo.alterado',
        payload: {
          normaId,
          dispositivoId: art1.dispositivoId,
          versaoAnterior: versaoId,
          versaoNova: r.versaoId,
        },
      },
      {
        nome: 'marcacao.pendenteReancoragem',
        payload: { normaId, marcacaoId: nota.id, dispositivoId: art1.dispositivoId },
      },
      { nome: 'versao.publicada', payload: { normaId, versaoId: r.versaoId } },
    ]);
  });

  it('desfazer volta o texto de antes e recupera o grifo pendente', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const grifo = await grifar(repo, normaId, 'art1', 'decisão criminal');
    const art1 = await textoDe(repo, normaId, 'art1');
    const corrigida = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Outro.' },
    ]);
    expect((await repo.colecao('marcacoes').obter(grifo.id))?.status).toBe('pendente');

    const desfeita = await voltarParaVersao(repo, normaId, corrigida.versaoId, versaoId);

    expect(desfeita).toMatchObject({ estado: 'corrigida', recuperadas: 1, pendentes: 0 });
    expect((await textoDe(repo, normaId, 'art1')).texto).toBe(art1.texto);
    expect(await repo.colecao('marcacoes').obter(grifo.id)).toMatchObject({
      status: 'valida',
      versaoId: desfeita.versaoId,
      ancora: grifo.ancora,
    });
    // Nada se apaga: as três versões existem (duas arquivadas).
    const versoes = await repo.colecao('versoesNorma').todosDoUsuario();
    expect(versoes.map((v) => v.status).sort()).toEqual(['arquivada', 'arquivada', 'vigente']);
  });

  it('estrela, erro, "lido até", posição e vínculo seguem o dispositivo', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    const estrela = await repo
      .colecao('estrelas')
      .criar({ normaId, alvoId: art1.dispositivoId, origemTipo: 'direta' });
    const erro = await repo.colecao('erros').criar({
      resultado: 'errou',
      oQueFoi: 'art. 1º, LEP: objetivo',
      status: 'aberto',
      dispositivoId: art1.dispositivoId,
    });
    const leitura = await repo.colecao('leituras').criar({
      normaId,
      lidoAteId: art1.dispositivoId,
      posicaoId: art1.dispositivoId,
    });
    const vinculo = await repo.colecao('vinculosDisciplina').criar({
      normaId,
      trecho: { inicioEndereco: 'art1', fimEndereco: 'art2' },
    });
    const enderecos = (await abrirNorma(repo, normaId)).nos.map((n) => [
      n.dispositivo.id,
      n.dispositivo.endereco,
    ]);

    await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Texto corrigido.' },
    ]);

    expect(
      (await abrirNorma(repo, normaId)).nos.map((n) => [n.dispositivo.id, n.dispositivo.endereco]),
    ).toEqual(enderecos);
    expect(await repo.colecao('estrelas').obter(estrela.id)).toMatchObject({
      alvoId: art1.dispositivoId,
      excluidoEm: null,
    });
    expect((await repo.colecao('erros').obter(erro.id))?.dispositivoId).toBe(art1.dispositivoId);
    expect(await repo.colecao('leituras').obter(leitura.id)).toMatchObject({
      lidoAteId: art1.dispositivoId,
      posicaoId: art1.dispositivoId,
    });
    expect((await repo.colecao('vinculosDisciplina').obter(vinculo.id))?.trecho).toEqual({
      inicioEndereco: 'art1',
      fimEndereco: 'art2',
    });
    expect(await repo.colecao('pendenciasReleitura').todosDoUsuario()).toEqual([]);
  });

  it('texto igual não gera versão', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    const r = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: `  ${art1.texto}\r\n` },
    ]);
    expect(r).toMatchObject({ estado: 'sem_mudanca', versaoId, alterados: [] });
    expect(await repo.colecao('versoesNorma').todosDoUsuario()).toHaveLength(1);
  });

  it('recusa sem gravar: versão desatualizada, texto vazio, dispositivo de outra norma', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    const primeira = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Uma.' },
    ]);
    // Outra aba ainda mostra a versão de antes.
    await expect(
      corrigirTextoPublicado(repo, normaId, versaoId, [
        { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Duas.' },
      ]),
    ).rejects.toMatchObject({ motivo: 'versao_mudou' });
    await expect(
      corrigirTextoPublicado(repo, normaId, primeira.versaoId, [
        { dispositivoId: art1.dispositivoId, texto: '   ' },
      ]),
    ).rejects.toBeInstanceOf(CorrecaoRecusada);
    const outra = await publicada(repo);
    await expect(
      corrigirTextoPublicado(repo, outra.normaId, outra.versaoId, [
        { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Três.' },
      ]),
    ).rejects.toMatchObject({ motivo: 'dispositivo_fora' });
    await expect(
      voltarParaVersao(repo, normaId, primeira.versaoId, outra.versaoId),
    ).rejects.toMatchObject({ motivo: 'versao_inexistente' });
    expect((await textoDe(repo, normaId, 'art1')).texto).toBe('Art. 1º Uma.');
    expect(
      (await repo.colecao('versoesNorma').todosDoUsuario()).filter((v) => v.normaId === normaId),
    ).toHaveLength(2);
  });

  it('voltar um dispositivo só deixa os outros como estão', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    const art2 = await textoDe(repo, normaId, 'art2');
    const r = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Novo um.' },
      { dispositivoId: art2.dispositivoId, texto: 'Art. 2º Novo dois.' },
    ]);
    expect(r.alterados).toHaveLength(2);
    await voltarParaVersao(repo, normaId, r.versaoId, versaoId, [art2.dispositivoId]);
    expect((await textoDe(repo, normaId, 'art1')).texto).toBe('Art. 1º Novo um.');
    expect((await textoDe(repo, normaId, 'art2')).texto).toBe(art2.texto);
  });
});

describe('trechosCorrigidos', () => {
  const link = 'https://www.planalto.gov.br/lei';
  const antigos = [
    { texto: 'Art. 5º Ver a ' },
    { texto: 'Lei nº 1', link },
    { texto: ' e o texto ' },
    { texto: 'revogado', tachado: true },
    { texto: '.' },
  ];

  it('mantém a forma fora do trecho mudado', () => {
    expect(trechosCorrigidos(antigos, 'Art. 5º Ver a Lei nº 1 e o novo texto revogado.')).toEqual([
      { texto: 'Art. 5º Ver a ' },
      { texto: 'Lei nº 1', link },
      { texto: ' e o novo texto ' },
      { texto: 'revogado', tachado: true },
      { texto: '.' },
    ]);
  });

  it('a troca dentro de um trecho herda a forma dele', () => {
    expect(trechosCorrigidos(antigos, 'Art. 5º Ver a Lei nº 12 e o texto revogado.')).toEqual([
      { texto: 'Art. 5º Ver a ' },
      { texto: 'Lei nº 12', link },
      { texto: ' e o texto ' },
      { texto: 'revogado', tachado: true },
      { texto: '.' },
    ]);
  });

  it('a troca que pega mais de um trecho fica sem forma', () => {
    expect(trechosCorrigidos(antigos, 'Art. 5º Tudo novo.')).toEqual([
      { texto: 'Art. 5º Tudo novo.' },
    ]);
  });

  it('texto igual devolve os mesmos trechos', () => {
    expect(trechosCorrigidos(antigos, 'Art. 5º Ver a Lei nº 1 e o texto revogado.')).toBe(antigos);
  });
});

describe('correção do texto publicado: revisão das etapas 8, 9 e 11', () => {
  it('texto inserido antes do grifo curto: o grifo segue a edição, não a ocorrência mais perto', async () => {
    const { repo } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    // O "de" de "decisão" (o último do artigo).
    const inicio = art1.texto.lastIndexOf('de');
    const grifo = await criarGrifo(
      repo,
      { normaId, versaoId, dispositivoId: art1.dispositivoId, inicio, fim: inicio + 2 },
      1,
    );
    const inserido = ', em todo o território nacional,';
    const corrigido = art1.texto.replace('A execução penal', `A execução penal${inserido}`);

    await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: corrigido },
    ]);

    const depois = await repo.colecao('marcacoes').obter(grifo.id);
    expect(depois?.ancora.inicio).toBe(inicio + inserido.length);
    expect(corrigido.slice(inicio + inserido.length).startsWith('decisão')).toBe(true);
  });
});

describe('texto de antes: revisão das etapas 8, 9 e 11', () => {
  it('depois de desfazer, o texto igual ao de agora sai da lista; "até" é a data da troca', async () => {
    const { repo, relogio } = await repositorioDeTeste();
    const { normaId, versaoId } = await publicada(repo);
    const art1 = await textoDe(repo, normaId, 'art1');
    relogio.avancar(60_000);
    const corrigida = await corrigirTextoPublicado(repo, normaId, versaoId, [
      { dispositivoId: art1.dispositivoId, texto: 'Art. 1º Outro.' },
    ]);
    const lista1 = await textosAnteriores(repo, normaId, art1.dispositivoId);
    const versoes = await repo.colecao('versoesNorma').todosDoUsuario();
    const nova = versoes.find((v) => v.id === corrigida.versaoId);
    expect(lista1).toMatchObject([{ versaoId, substituidoEm: nova?.capturadaEm }]);

    relogio.avancar(60_000);
    await voltarParaVersao(repo, normaId, corrigida.versaoId, versaoId);
    const lista2 = await textosAnteriores(repo, normaId, art1.dispositivoId);
    // Só o "Outro." (o original é o texto de agora).
    expect(lista2.map((t) => t.versaoId)).toEqual([corrigida.versaoId]);
  });
});
