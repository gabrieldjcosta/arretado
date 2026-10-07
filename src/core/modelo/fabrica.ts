// Registros mínimos válidos por coleção. Usado em testes, carga sintética e verificação do modelo.
import type { CamposComuns } from './comum';
import type { NomeColecao, RegistroDe } from './index';

const HASH_ZERO = '0'.repeat(64);

type Especificos = { [N in NomeColecao]: Omit<RegistroDe<N>, keyof CamposComuns> };

/** Campos específicos mínimos de cada coleção; `ref` preenche ids obrigatórios. */
export function camposMinimos<N extends NomeColecao>(nome: N, ref: string): Especificos[N] {
  const m: Especificos = {
    usuarios: { consentimentos: [] },
    aparelhos: { nome: 'Notebook', plataforma: 'teste' },
    preferencias: {
      tema: 'sistema',
      fonteLeitura: 'serifa',
      tamanhoFonte: 18,
      mostrarRedacoesAnteriores: false,
      modulosDesabilitados: [],
      retencaoSnapshots: 5,
    },
    fontes: { tipo: 'outro', titulo: 'Fonte' },
    anexos: { nomeArquivo: 'print.png', tipoMime: 'image/png', tamanho: 0, hash: HASH_ZERO },
    tags: { nome: 'tag' },
    vinculos: { tipoA: 'ponto', idA: ref, tipoB: 'norma', idB: ref },
    concursos: { nome: 'DPE-SP', banca: 'FCC' },
    fasesPrazos: {
      concursoId: ref,
      titulo: 'Prova objetiva',
      tipo: 'fase',
      dataInicio: '2027-03-01',
    },
    editais: { titulo: 'Edital', versao: 1 },
    disciplinas: { nome: 'Direito Penal' },
    pontos: { titulo: 'Execução penal' },
    dias: { data: '2026-09-23' },
    sessoes: {
      tipo: 'livre',
      data: '2026-09-23',
      inicio: '2026-09-23T12:00:00.000Z',
      estado: 'encerrada',
      pausas: [],
    },
    erros: { resultado: 'errou', oQueFoi: 'Prazo do art. 112 da LEP', status: 'aberto' },
    cartoes: {
      frente: 'Prazo do art. 112?',
      verso: null,
      origemTipo: 'manual',
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: '2026-09-24',
    },
    revisoes: {
      cartaoId: ref,
      em: '2026-09-24T12:00:00.000Z',
      data: '2026-09-24',
      resposta: 'facil',
      caixaAntes: 1,
      caixaDepois: 2,
      proximaAntes: '2026-09-24',
      proximaDepois: '2026-09-27',
      atrasoDias: 0,
    },
    normas: { tituloCurto: 'LEP', escopo: 'pessoal' },
    versoesNorma: {
      normaId: ref,
      status: 'rascunho',
      capturadaEm: '2026-09-23T12:00:00.000Z',
      origemEntrada: 'html',
      hash: HASH_ZERO,
    },
    dispositivos: {
      normaId: ref,
      endereco: 'art9A',
      categoria: 'normativo',
      tipo: 'artigo',
      ordem: 9.1,
      status: 'vigente',
      confianca: 'alta',
    },
    textosDispositivo: {
      versaoId: ref,
      dispositivoId: ref,
      normaId: ref,
      trechos: [{ texto: 'Texto' }],
    },
    marcacoes: {
      normaId: ref,
      dispositivoId: ref,
      versaoId: ref,
      tipo: 'grifo',
      ancora: { texto: 'Texto', inicio: 0, fim: 5 },
      status: 'valida',
    },
    estrelas: { normaId: ref, alvoId: ref, origemTipo: 'direta' },
    leituras: { normaId: ref },
    pacotesIncidencia: { titulo: 'Defensoria', versao: 1 },
    adesoes: { tipo: 'total', versaoAderida: 1, receberAtualizacoes: true },
    precedentes: { tituloTese: 'Tese', escopo: 'nacional' },
    notas: { titulo: 'Resumo', tipo: 'resumo', conteudo: '' },
    achados: {
      banca: 'FCC',
      tipo: 'armadilha',
      descricao: 'Troca de prazo',
      confianca: 'media',
      status: 'novo',
    },
    eventosCalendario: { tipo: 'simulado', titulo: 'Simulado 1', data: '2026-10-01' },
    relatos: {
      data: '2026-09-23',
      descricao: 'Botão não responde',
      tela: 'recall',
      versaoApp: '0.1.0',
      aparelhoId: ref,
      status: 'aguardando_envio',
    },
    logsImportacao: {
      em: '2026-09-23T12:00:00.000Z',
      modo: 1,
      hashPacote: HASH_ZERO,
      contagens: {},
      resultado: 'concluida',
    },
    snapshots: { motivo: 'manual', tamanho: 0, hash: HASH_ZERO, versaoEsquema: 1 },
    espacos: { nome: 'Acervo antigo', nomeBanco: 'arretado-espaco-x', hashPacote: HASH_ZERO },
  };
  return m[nome];
}
