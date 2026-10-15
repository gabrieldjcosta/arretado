// Gerador de banco sintético para testes da migração (A4c).
// Dados inteiramente inventados, determinísticos (mesma semente = mesmo banco),
// nenhum dado real do usuário. Preenche todas as coleções do esquema v8.
import { Repositorio } from '../../persistencia';
import type { NomeColecao } from '../../modelo';

let seed = 0xc0ff_a4c;
function proximo(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
}
function aleatorio(min: number, max: number): number {
  return Math.floor(proximo() * (max - min + 1)) + min;
}
function novoId(): string {
  const h = () => Math.floor(proximo() * 16).toString(16);
  return `${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}-${h()}${h()}${h()}${h()}-4${h()}${h()}${h()}-8${h()}${h()}${h()}-${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}`;
}
function instante(): string {
  return new Date(1_700_000_000_000 + Math.floor(proximo() * 10_000_000_000)).toISOString();
}
function dataCivil(): string {
  return instante().slice(0, 10);
}
function tsLogico(): string {
  const ms = String(1_700_000_000_000 + Math.floor(proximo() * 10_000_000_000)).padStart(13, '0');
  const seq = String(Math.floor(proximo() * 1_000_000)).padStart(6, '0');
  const h = Math.floor(proximo() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  return `${ms}-${seq}-${h}`;
}

function camposComuns(usuarioId: string): Record<string, unknown> {
  return {
    id: novoId(),
    usuarioId,
    criadoEm: instante(),
    atualizadoEm: instante(),
    tsLogico: tsLogico(),
    origem: 'sistema',
    excluidoEm: null,
  };
}

function de<T extends Record<string, unknown>>(base: T, extras: Record<string, unknown>): T {
  return { ...base, ...extras };
}

const TIPOS_ITEM: (
  | 'ponto'
  | 'norma'
  | 'dispositivo'
  | 'nota'
  | 'frase'
  | 'tarefa'
  | 'precedente'
  | 'erro'
  | 'cartao'
  | 'achado'
  | 'tag'
  | 'anexo'
)[] = [
  'ponto',
  'norma',
  'dispositivo',
  'nota',
  'frase',
  'tarefa',
  'precedente',
  'erro',
  'cartao',
  'achado',
  'tag',
  'anexo',
];
const STATUS_ERRO: ('aberto' | 'com_cartao' | 'resolvido' | 'descartado')[] = [
  'aberto',
  'com_cartao',
  'resolvido',
  'descartado',
];
const ESTADO_CARTAO: ('ativo' | 'suspenso' | 'arquivado')[] = ['ativo', 'suspenso', 'arquivado'];
const RESPOSTA_REVISAO: ('errei' | 'dificil' | 'facil')[] = ['errei', 'dificil', 'facil'];
const RESPOSTA_FRAME: ('li' | 'de_novo')[] = ['li', 'de_novo'];
const ESTADO_FRAME: ('ativa' | 'arquivada')[] = ['ativa', 'arquivada'];
const STATUS_NORMA: (
  'vigente' | 'revogado' | 'eficacia_cessada' | 'renumerado' | 'novo' | 'vetado'
)[] = ['vigente', 'novo'];
const TIPO_DISPOSITIVO = [
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'artigo',
  'caput',
  'paragrafo',
  'inciso',
  'alinea',
];
const ESCOPO_NORMA: ('pessoal' | 'catalogo')[] = ['pessoal', 'catalogo'];
const STATUS_VERSAO: ('rascunho' | 'vigente' | 'arquivada')[] = ['vigente', 'rascunho'];
const STATUS_MARCACAO: ('valida' | 'reancorada' | 'pendente')[] = ['valida'];
const ORIGEM_ESTRELA: ('direta' | 'herdada' | 'pacote' | 'excecao')[] = ['direta'];
const STATUS_SESSAO: ('ativa' | 'pausada' | 'interrompida' | 'encerrada')[] = ['encerrada'];
const TIPO_SESSAO: ('estudo' | 'livre' | 'simulado')[] = ['estudo'];
const ESTADO_TAREFA: ('aberta' | 'feita' | 'adiada' | 'dividida')[] = ['aberta'];
const TIPO_PONTO: ('fase' | 'prazo')[] = ['fase'];
const TIPO_ITEM_VINCULO = TIPOS_ITEM;
const MODOS_IMPORTACAO: (1 | 2 | 3 | 4 | 5 | 6 | 7)[] = [1, 2, 3, 4, 5, 6];
const RESULTADOS_IMPORTACAO: ('concluida' | 'desfeita' | 'falhou')[] = ['concluida'];
const STATUS_RELATO: ('aguardando_envio' | 'enviado' | 'respondido')[] = ['aguardando_envio'];
const MOTIVOS_SNAPSHOT: ('importacao' | 'migracao' | 'manual' | 'rollback')[] = ['migracao'];
const TEMA: ('sistema' | 'claro' | 'escuro')[] = ['sistema'];
const TIPO_FONTE: ('url' | 'livro' | 'curso' | 'prova' | 'outro')[] = ['livro'];
const TIPO_ADICAO: ('total' | 'parcial')[] = ['total'];
const STATUS_LEITURA: ('nao_lido' | 'lido' | 'para_revisar')[] = ['lido'];
const TIPO_PRECEDENTE: (
  | 'acordao'
  | 'sumula'
  | 'sumula_vinculante'
  | 'tese_repercussao_geral'
  | 'tese_repetitivo'
  | 'opiniao_consultiva'
  | 'outro'
)[] = ['acordao'];
const STATUS_LINK: ('valida' | 'pendente')[] = ['valida'];
const TIPO_VINCULO_PRECEDENTE: ('relacionado' | 'cita' | 'supera')[] = ['relacionado'];
const TIPO_NOTA: ('resumo' | 'esquema' | 'anotacao')[] = ['resumo'];
const TIPO_ACHADO = [
  'padrao_cobranca',
  'norma_mais_cobrada',
  'artigo_mais_cobrado',
  'precedente_recorrente',
  'autor_teoria',
  'armadilha',
  'sinal_alerta',
  'novidade_normativa',
  'alteracao_edital',
];
const CONFIANCA: ('baixa' | 'media' | 'alta')[] = ['alta'];
const STATUS_ACHADO: ('novo' | 'aceito' | 'aceito_sem_aplicacao' | 'descartado')[] = ['aceito'];
const TIPO_EVENTO: ('simulado' | 'marco' | 'outro')[] = ['simulado'];
const ORIGEM_FRAME_TIPO: ('erro' | 'trecho' | 'manual' | 'ia')[] = ['erro'];
const ORIGEM_CARTAO: (
  'erro' | 'dispositivo' | 'nota' | 'precedente' | 'manual' | 'frase' | 'ia'
)[] = ['erro'];

function pick<T>(lista: readonly T[]): T {
  return lista[aleatorio(0, lista.length - 1)] as T;
}

/** Gera todos os registros do banco sintético e grava no repositório informado. Retorna as contagens por coleção. */
export async function gerarBancoSintetico(repo: Repositorio): Promise<Record<NomeColecao, number>> {
  const u = repo.ctx.usuarioId;
  const aparelhoId = repo.ctx.aparelhoId;
  const r = (nome: string, itens: unknown[]) => repo.colecao(nome as NomeColecao).gravarLote(itens);

  const contagens: Record<string, number> = {};

  // ── sistema ──
  const usuario = de(camposComuns(u), {
    nomeExibicao: 'Usuário de teste',
    email: 'teste@exemplo.com',
    carreira: 'Defensoria',
    consentimentos: [],
  });
  contagens.usuarios = await r('usuarios', [usuario]);

  const aparelho = de(camposComuns(u), {
    id: aparelhoId,
    nome: 'Aparelho de teste',
    plataforma: 'desktop',
  });
  contagens.aparelhos = await r('aparelhos', [aparelho]);

  contagens.preferencias = await r('preferencias', [
    de(camposComuns(u), {
      tema: pick(TEMA),
      fonteLeitura: 'serifa',
      tamanhoFonte: 18,
      mostrarRedacoesAnteriores: false,
      modulosDesabilitados: [],
      retencaoSnapshots: 5,
    }),
  ]);

  contagens.fontes = await r('fontes', [
    de(camposComuns(u), {
      tipo: pick(TIPO_FONTE),
      titulo: 'Manual de Direito Constitucional',
    }),
  ]);

  contagens.anexos = await r('anexos', [
    de(camposComuns(u), {
      nomeArquivo: 'lei.pdf',
      tipoMime: 'application/pdf',
      tamanho: 12345,
      hash: '0'.repeat(64),
    }),
  ]);

  contagens.tags = await r('tags', [
    de(camposComuns(u), { nome: 'Direito' }),
    de(camposComuns(u), { nome: 'Processual' }),
  ]);

  const idErro = novoId();
  const idPonto = novoId();
  const idNorma = novoId();
  const idDispositivo = novoId();
  const idVersao = novoId();
  const idCartao = novoId();
  const idFrase = novoId();
  const idPrecedente = novoId();

  contagens.vinculos = await r('vinculos', [
    de(camposComuns(u), {
      tipoA: pick(TIPO_ITEM_VINCULO),
      idA: idErro,
      tipoB: pick(TIPO_ITEM_VINCULO),
      idB: idPonto,
    }),
  ]);

  // ── plano ──
  const idConcurso = novoId();
  contagens.concursos = await r('concursos', [
    de(camposComuns(u), {
      id: idConcurso,
      nome: 'Concurso Defensoria 2026',
      banca: 'FCC',
    }),
  ]);

  contagens.fasesPrazos = await r('fasesPrazos', [
    de(camposComuns(u), {
      concursoId: idConcurso,
      titulo: 'Fase 1',
      tipo: pick(TIPO_PONTO),
      dataInicio: dataCivil(),
    }),
  ]);

  contagens.editais = await r('editais', [
    de(camposComuns(u), {
      concursoId: idConcurso,
      titulo: 'Edital 01/2026',
      versao: 1,
    }),
  ]);

  const idEdital = novoId();
  contagens.disciplinas = await r('disciplinas', [
    de(camposComuns(u), {
      nome: 'Direito Constitucional',
      editalId: idEdital,
    }),
  ]);

  const idDisciplina = novoId();
  contagens.pontos = await r('pontos', [
    de(camposComuns(u), {
      id: idPonto,
      titulo: 'Princípios',
      disciplinaId: idDisciplina,
      editalId: idEdital,
      faixa: 'alta',
    }),
  ]);

  contagens.tarefasDeEstudo = await r('tarefasDeEstudo', [
    de(camposComuns(u), {
      titulo: 'Ler arts. 1 a 5',
      estado: pick(ESTADO_TAREFA),
      ordem: 1,
      pontoId: idPonto,
      autoria: 'manual',
    }),
  ]);

  // ── execução ──
  contagens.dias = await r('dias', [
    de(camposComuns(u), {
      data: dataCivil(),
      pontoId: idPonto,
      resultadoPonto: 'concluido',
    }),
  ]);

  contagens.sessoes = await r('sessoes', [
    de(camposComuns(u), {
      tipo: pick(TIPO_SESSAO),
      data: dataCivil(),
      inicio: instante(),
      estado: pick(STATUS_SESSAO),
      pontoId: idPonto,
      pausas: [],
    }),
  ]);

  // ── recall ──
  contagens.erros = await r('erros', [
    de(camposComuns(u), {
      id: idErro,
      resultado: 'errou',
      status: pick(STATUS_ERRO),
      oQueFoi: 'Prazo do art. 112',
      fraseCorreta: 'O prazo é de 15 dias.',
      disciplinaId: idDisciplina,
      pontoId: idPonto,
    }),
  ]);

  contagens.cartoes = await r('cartoes', [
    de(camposComuns(u), {
      id: idCartao,
      frente: 'Qual o prazo?',
      verso: null,
      origemTipo: pick(ORIGEM_CARTAO),
      erroId: idErro,
      fraseId: idFrase,
      estado: pick(ESTADO_CARTAO),
      caixa: 1,
      proximaRevisao: dataCivil(),
    }),
  ]);

  contagens.revisoes = await r('revisoes', [
    de(camposComuns(u), {
      cartaoId: idCartao,
      em: instante(),
      data: dataCivil(),
      resposta: pick(RESPOSTA_REVISAO),
      caixaAntes: 1,
      caixaDepois: 2,
      proximaAntes: dataCivil(),
      proximaDepois: dataCivil(),
      atrasoDias: 3,
    }),
  ]);

  contagens.frases = await r('frases', [
    de(camposComuns(u), {
      id: idFrase,
      texto: 'O prazo é de 15 dias.',
      origemTipo: pick(ORIGEM_FRAME_TIPO),
      erroId: idErro,
      estado: pick(ESTADO_FRAME),
      proximaRevisao: dataCivil(),
    }),
  ]);

  contagens.revisoesFrase = await r('revisoesFrase', [
    de(camposComuns(u), {
      fraseId: idFrase,
      em: instante(),
      data: dataCivil(),
      resposta: pick(RESPOSTA_FRAME),
      proximaAntes: dataCivil(),
      proximaDepois: dataCivil(),
      atrasoDias: 1,
    }),
  ]);

  // ── legislação ──
  contagens.normas = await r('normas', [
    de(camposComuns(u), {
      id: idNorma,
      tituloCurto: 'CF/88',
      escopo: pick(ESCOPO_NORMA),
    }),
  ]);

  contagens.versoesNorma = await r('versoesNorma', [
    de(camposComuns(u), {
      id: idVersao,
      normaId: idNorma,
      status: pick(STATUS_VERSAO),
      capturadaEm: instante(),
      origemEntrada: 'texto',
      hash: 'a'.repeat(64),
    }),
  ]);

  contagens.dispositivos = await r('dispositivos', [
    de(camposComuns(u), {
      id: idDispositivo,
      normaId: idNorma,
      endereco: 'art5',
      categoria: 'normativo',
      tipo: pick(TIPO_DISPOSITIVO),
      ordem: 1,
      status: pick(STATUS_NORMA),
      confianca: 'alta',
    }),
  ]);

  contagens.textosDispositivo = await r('textosDispositivo', [
    de(camposComuns(u), {
      versaoId: idVersao,
      dispositivoId: idDispositivo,
      normaId: idNorma,
      trechos: [{ texto: 'Todos são iguais perante a lei.', tachado: false }],
    }),
  ]);

  contagens.marcacoes = await r('marcacoes', [
    de(camposComuns(u), {
      normaId: idNorma,
      dispositivoId: idDispositivo,
      versaoId: idVersao,
      tipo: 'grifo',
      ancora: { texto: 'Todos são iguais', inicio: 0, fim: 18 },
      status: pick(STATUS_MARCACAO),
    }),
  ]);

  contagens.estrelas = await r('estrelas', [
    de(camposComuns(u), {
      normaId: idNorma,
      alvoId: idDispositivo,
      origemTipo: pick(ORIGEM_ESTRELA),
    }),
  ]);

  contagens.leituras = await r('leituras', [
    de(camposComuns(u), {
      normaId: idNorma,
      lidoAteId: idDispositivo,
    }),
  ]);

  contagens.vinculosDisciplina = await r('vinculosDisciplina', [
    de(camposComuns(u), {
      normaId: idNorma,
      disciplinaId: idDisciplina,
    }),
  ]);

  contagens.pendenciasReleitura = await r('pendenciasReleitura', [
    de(camposComuns(u), {
      normaId: idNorma,
      versaoId: idVersao,
      tipo: 'estrela',
      enderecoAntigo: 'art5',
    }),
  ]);

  // ── catálogo ──
  const idPacote = novoId();
  contagens.pacotesIncidencia = await r('pacotesIncidencia', [
    de(camposComuns(u), {
      id: idPacote,
      titulo: 'Pacote de normas',
      versao: 1,
    }),
  ]);

  contagens.adesoes = await r('adesoes', [
    de(camposComuns(u), {
      pacoteId: idPacote,
      tipo: pick(TIPO_ADICAO),
      versaoAderida: 1,
      receberAtualizacoes: true,
    }),
  ]);

  // ── precedentes ──
  contagens.precedentes = await r('precedentes', [
    de(camposComuns(u), {
      id: idPrecedente,
      tituloTese: 'Tese de teste',
      escopo: 'nacional',
      tipo: pick(TIPO_PRECEDENTE),
      statusLeitura: pick(STATUS_LEITURA),
    }),
  ]);

  contagens.vinculosPrecedenteDispositivo = await r('vinculosPrecedenteDispositivo', [
    de(camposComuns(u), {
      precedenteId: idPrecedente,
      normaId: idNorma,
      dispositivoId: idDispositivo,
      endereco: 'art5',
      status: pick(STATUS_LINK),
    }),
  ]);

  contagens.vinculosEntrePrecedentes = await r('vinculosEntrePrecedentes', [
    de(camposComuns(u), {
      de: { tipo: 'precedente', id: idPrecedente },
      para: { tipo: 'dispositivo', id: idDispositivo, normaId: idNorma },
      deId: idPrecedente,
      paraId: idDispositivo,
      tipoDeVinculo: pick(TIPO_VINCULO_PRECEDENTE),
    }),
  ]);

  // ── notas ──
  contagens.notas = await r('notas', [
    de(camposComuns(u), {
      titulo: 'Nota de teste',
      tipo: pick(TIPO_NOTA),
      conteudo: 'Conteúdo da nota.',
    }),
  ]);

  // ── inteligência ──
  contagens.achados = await r('achados', [
    de(camposComuns(u), {
      banca: 'FCC',
      tipo: pick(TIPO_ACHADO),
      descricao: 'Achado de teste.',
      confianca: pick(CONFIANCA),
      status: pick(STATUS_ACHADO),
    }),
  ]);

  // ── calendário ──
  contagens.eventosCalendario = await r('eventosCalendario', [
    de(camposComuns(u), {
      tipo: pick(TIPO_EVENTO),
      titulo: 'Evento de teste',
      data: dataCivil(),
    }),
  ]);

  // ── suporte ──
  contagens.relatos = await r('relatos', [
    de(camposComuns(u), {
      data: dataCivil(),
      descricao: 'Relato de teste.',
      tela: 'home',
      versaoApp: '0.1.0',
      aparelhoId,
      status: pick(STATUS_RELATO),
    }),
  ]);

  // ── só local ──
  contagens.logsImportacao = await r('logsImportacao', [
    de(camposComuns(u), {
      em: instante(),
      modo: pick(MODOS_IMPORTACAO),
      hashPacote: 'b'.repeat(64),
      contagens: {
        usuarios: { criados: 1, atualizados: 0, ignorados: 0, conflitos: 0, excluidos: 0 },
      },
      resultado: pick(RESULTADOS_IMPORTACAO),
    }),
  ]);

  contagens.snapshots = await r('snapshots', [
    de(camposComuns(u), {
      motivo: pick(MOTIVOS_SNAPSHOT),
      tamanho: 100,
      hash: 'c'.repeat(64),
      versaoEsquema: 8,
    }),
  ]);

  contagens.espacos = await r('espacos', [
    de(camposComuns(u), {
      nome: 'Espaço de teste',
      nomeBanco: 'arretado-espaco-teste',
      hashPacote: 'd'.repeat(64),
    }),
  ]);

  // ── registros excluídos logicamente ──
  const excluido = de(camposComuns(u), { nome: 'Excluído' }) as { id: string };
  await repo.colecao('tags').gravarLote([excluido]);
  await repo.colecao('tags').excluir(excluido.id);

  return contagens;
}
