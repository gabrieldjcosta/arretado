// Banco sintético para os testes da migração para a conta (A4). Dados inventados (o repositório é
// público), determinístico: mesma semente = mesmo banco, ids, carimbos e log iguais.
// Cobre todas as coleções da v9 pelo caminho real de escrita (`Colecao`, com log): criações,
// atualizações, exclusão lógica, remoção física, um lote de adesão ao acervo numa transação,
// conteúdo binário de anexo e as coleções só locais (snapshot com conteúdo, log de importação,
// espaço separado).
import { NOMES_COLECOES, type NomeColecao } from '../../modelo';
import { camposMinimos } from '../../modelo/fabrica';
import { Repositorio } from '../../persistencia';
import { sha256 } from '../bytes';

const INICIO = Date.parse('2026-09-23T12:00:00.000Z');

/** Gerador congruente linear: sequência fixa por semente. */
function geradorDeIds(semente: number): () => string {
  let s = semente >>> 0;
  const hex = (n: number) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      out += (s >>> 28).toString(16);
    }
    return out;
  };
  return () => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

export interface BancoSintetico {
  repo: Repositorio;
  /** Registros do usuário por coleção (inclusive excluídos logicamente), como gravados. */
  contagens: Record<NomeColecao, number>;
  /** Ids que os testes conferem. */
  ids: { tagExcluida: string; anexo: string; snapshot: string };
}

/** Abre `nomeBanco` (que deve ser novo) e o preenche. */
export async function criarBancoSintetico(
  nomeBanco: string,
  semente = 0xa4,
): Promise<BancoSintetico> {
  let ms = INICIO;
  const agora = () => new Date(ms);
  const passo = () => {
    ms += 60_000;
  };
  const repo = await Repositorio.abrir({
    nomeBanco,
    agora,
    novoId: geradorDeIds(semente),
    nomeAparelho: 'Aparelho sintético',
  });
  const c = <N extends NomeColecao>(nome: N) => repo.colecao(nome);
  const id = () => repo.ctx.novoId();

  // Sistema (usuário, aparelho e preferências nasceram ao abrir).
  passo();
  const fonte = await c('fontes').criar(camposMinimos('fontes', ''));
  const bytesAnexo = new Uint8Array([1, 2, 3, 4]);
  const anexo = await c('anexos').criar({
    ...camposMinimos('anexos', ''),
    tamanho: bytesAnexo.length,
    hash: await sha256(bytesAnexo),
  });
  await repo.db.anexosConteudo.put({ id: anexo.id, bytes: bytesAnexo });
  const tag = await c('tags').criar({ nome: 'Execução penal' });
  const tagExcluida = await c('tags').criar({ nome: 'Rascunho' });
  await c('tags').excluir(tagExcluida.id);

  // Plano.
  passo();
  const concurso = await c('concursos').criar(camposMinimos('concursos', ''));
  await c('fasesPrazos').criar(camposMinimos('fasesPrazos', concurso.id));
  const edital = await c('editais').criar({
    ...camposMinimos('editais', ''),
    concursoId: concurso.id,
  });
  const disciplina = await c('disciplinas').criar({
    ...camposMinimos('disciplinas', ''),
    editalId: edital.id,
  });
  const ponto = await c('pontos').criar({
    ...camposMinimos('pontos', ''),
    disciplinaId: disciplina.id,
  });
  const tarefa = await c('tarefasDeEstudo').criar({
    ...camposMinimos('tarefasDeEstudo', ''),
    pontoId: ponto.id,
  });
  await c('tarefasDeEstudo').atualizar(tarefa.id, { estado: 'feita' });
  await c('ciclos').criar({ ...camposMinimos('ciclos', disciplina.id), concursoId: concurso.id });
  await c('vinculos').criar(camposMinimos('vinculos', ponto.id));

  // Execução.
  passo();
  await c('dias').criar({ ...camposMinimos('dias', ''), pontoId: ponto.id });
  await c('sessoes').criar({ ...camposMinimos('sessoes', ''), pontoId: ponto.id });

  // Recall: erros com e sem frase correta (a Frase nasce do erro), cartões, revisões.
  passo();
  const erro = await c('erros').criar({
    ...camposMinimos('erros', ''),
    fraseCorreta: 'A progressão exige um sexto da pena.',
  });
  const erroExcluido = await c('erros').criar({ ...camposMinimos('erros', ''), oQueFoi: 'Outro' });
  await c('erros').excluir(erroExcluido.id);
  const frase = await c('frases').criar({
    ...camposMinimos('frases', ''),
    texto: 'A progressão exige um sexto da pena.',
    origemTipo: 'erro',
    erroId: erro.id,
  });
  await c('revisoesFrase').criar(camposMinimos('revisoesFrase', frase.id));
  const cartao = await c('cartoes').criar({
    ...camposMinimos('cartoes', ''),
    origemTipo: 'erro',
    erroId: erro.id,
  });
  await c('revisoes').criar(camposMinimos('revisoes', cartao.id));
  await c('cartoes').atualizar(cartao.id, { caixa: 2, proximaRevisao: '2026-09-27' });
  await c('erros').atualizar(erro.id, { status: 'com_cartao' });

  // Legislação: lote de adesão ao acervo (norma, versão, árvore e textos numa transação, como
  // `dominios/acervo/adesao.ts`).
  passo();
  const { normaId, versaoId, dispositivoIds } = await repo.transacao(async () => {
    const norma = await c('normas').criar(
      {
        tituloCurto: 'LEP',
        escopo: 'catalogo',
        especie: 'norma',
        origemAcervo: { id: 'lei-7210-1984', versao: 1, hash: 'e'.repeat(64) },
      },
      { origem: 'importacao' },
    );
    const versao = await c('versoesNorma').criar(
      { ...camposMinimos('versoesNorma', norma.id), status: 'vigente', origemEntrada: 'html' },
      { origem: 'importacao' },
    );
    const dispositivos = await c('dispositivos').criarLote(
      [1, 2, 3, 4, 5].map((n) => ({
        id: id(),
        dados: {
          ...camposMinimos('dispositivos', norma.id),
          endereco: `art${String(n)}`,
          ordem: n,
        },
      })),
      { origem: 'importacao' },
    );
    await c('textosDispositivo').criarLote(
      dispositivos.map((d) => ({
        dados: {
          versaoId: versao.id,
          dispositivoId: d.id,
          normaId: norma.id,
          trechos: [{ texto: `Texto do ${d.endereco}.` }],
        },
      })),
      { origem: 'importacao' },
    );
    await c('vinculosDisciplina').criar(
      { normaId: norma.id, disciplinaId: disciplina.id },
      { origem: 'importacao' },
    );
    return {
      normaId: norma.id,
      versaoId: versao.id,
      dispositivoIds: dispositivos.map((d) => d.id),
    };
  });
  const [d1 = '', d2 = ''] = dispositivoIds;
  await c('marcacoes').criar({
    ...camposMinimos('marcacoes', normaId),
    dispositivoId: d1,
    versaoId,
  });
  const estrela = await c('estrelas').criar({ normaId, alvoId: d1, origemTipo: 'direta' });
  await c('estrelas').excluir(estrela.id);
  await c('estrelas').criar({ normaId, alvoId: d2, origemTipo: 'direta' });
  await c('leituras').criar({ normaId, lidoAteId: d2 });
  await c('pendenciasReleitura').criar({
    ...camposMinimos('pendenciasReleitura', normaId),
    versaoId,
  });

  // Catálogo, precedentes, notas, inteligência, calendário, suporte.
  passo();
  const pacote = await c('pacotesIncidencia').criar(camposMinimos('pacotesIncidencia', ''));
  await c('adesoes').criar({ ...camposMinimos('adesoes', ''), pacoteId: pacote.id });
  const precedente = await c('precedentes').criar(camposMinimos('precedentes', ''));
  const outro = await c('precedentes').criar({ tituloTese: 'Outra tese', escopo: 'nacional' });
  await c('vinculosPrecedenteDispositivo').criar({
    ...camposMinimos('vinculosPrecedenteDispositivo', ''),
    precedenteId: precedente.id,
    normaId,
    dispositivoId: d1,
  });
  await c('vinculosEntrePrecedentes').criar({
    de: { tipo: 'precedente', id: precedente.id },
    para: { tipo: 'precedente', id: outro.id },
    deId: precedente.id,
    paraId: outro.id,
    tipoDeVinculo: 'cita',
  });
  const nota = await c('notas').criar({
    ...camposMinimos('notas', ''),
    conteudo: 'Resumo da LEP.',
  });
  await c('notas').atualizar(nota.id, { conteudo: 'Resumo revisto da LEP.' });
  await c('achados').criar(camposMinimos('achados', ''));
  await c('eventosCalendario').criar(camposMinimos('eventosCalendario', ''));
  await c('relatos').criar(camposMinimos('relatos', repo.ctx.aparelhoId));
  await c('fontes').atualizar(fonte.id, { titulo: 'Fonte revista' });
  await c('vinculos').criar({ tipoA: 'tag', idA: tag.id, tipoB: 'norma', idB: normaId });

  // Remoção física com registro no log (como o rascunho de norma descartado).
  const descartada = await c('notas').criar({
    ...camposMinimos('notas', ''),
    titulo: 'Descartada',
  });
  await c('notas').removerFisico([descartada.id]);

  // Só locais: snapshot (com conteúdo), log de importação, espaço separado.
  passo();
  // Bytes fixos: o pacote real carimba a hora no zip e tiraria o determinismo.
  const snapshot = await repo.transacao(async () => {
    const s = await c('snapshots').criar(
      { ...camposMinimos('snapshots', ''), tamanho: 3, versaoEsquema: 8 },
      { origem: 'sistema' },
    );
    await repo.db.snapshotsConteudo.put({ id: s.id, bytes: new Uint8Array([9, 8, 7]) });
    return s;
  });
  await c('logsImportacao').criar(
    { ...camposMinimos('logsImportacao', ''), snapshotId: snapshot.id },
    { origem: 'sistema' },
  );
  await c('espacos').criar(camposMinimos('espacos', ''), { origem: 'sistema' });

  const contagens = {} as Record<NomeColecao, number>;
  for (const nome of NOMES_COLECOES) {
    contagens[nome] = (await c(nome).todosDoUsuario()).length;
  }
  return {
    repo,
    contagens,
    ids: { tagExcluida: tagExcluida.id, anexo: anexo.id, snapshot: snapshot.id },
  };
}
