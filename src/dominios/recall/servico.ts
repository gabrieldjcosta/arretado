// Serviço do Recall (Parte 1 §6; Parte 2 §8.2 e §10.4–10.5). Recall é totalmente isolado:
// só depende do core. Eventos saem depois da escrita confirmada.
import { dataCivil, somarDias } from '../../core/datas';
import type {
  Cartao,
  Erro,
  Faixa,
  Frase,
  Intervalo,
  RespostaFrase,
  RespostaRevisao,
  Revisao,
} from '../../core/modelo';
import type { Alteracoes, Dados, Pagina, Repositorio } from '../../core/persistencia';
import { agendar, agendarFrase } from './agendamento';
import { ordenarPorValor } from './ordem-de-valor';
import { ACAO_RECOMENDADA, completude, sugerirCausa } from './causa';

export function hoje(repo: Repositorio): string {
  return dataCivil(repo.ctx.agora());
}

// ── Erros ─────────────────────────────────────────────────────────────────

/**
 * Só a frase correta é obrigatória (D25); `resultado` vale `errou` quando não informado e o resto
 * é complemento opcional.
 */
export type EntradaErro = { fraseCorreta: string } & Partial<
  Omit<Dados<'erros'>, 'fraseCorreta' | 'status' | 'causaSugerida'>
>;

const CAMPOS_DA_SUGESTAO = ['oQueFoi', 'resultado', 'justificativa', 'conviccao'] as const;

/**
 * Recalcula a causa sugerida quando mudam os campos que a determinam. Numa edição
 * (`base` presente), sugestão que deixou de valer é apagada.
 */
function comSugestao<T extends Partial<Erro>>(erro: T, base?: Partial<Erro>): T {
  if (base && !CAMPOS_DA_SUGESTAO.some((c) => c in erro)) return erro;
  const junto = { ...base, ...erro };
  if (!junto.oQueFoi || !junto.resultado) {
    return base?.causaSugerida ? { ...erro, causaSugerida: undefined } : erro;
  }
  const sugerida = sugerirCausa({
    oQueFoi: junto.oQueFoi,
    resultado: junto.resultado,
    ...(junto.justificativa ? { justificativa: junto.justificativa } : {}),
    ...(junto.conviccao ? { conviccao: junto.conviccao } : {}),
  });
  if (sugerida) return { ...erro, causaSugerida: sugerida };
  return base?.causaSugerida ? { ...erro, causaSugerida: undefined } : erro;
}

/** Texto vazio ou só espaço vira ausente (campo opcional não guarda string vazia). */
const preenchido = (t: string | undefined) => (t?.trim() ? t : undefined);

/** Registra o erro e a Frase dele, juntos (D25, T22). */
export async function registrarErro(repo: Repositorio, entrada: EntradaErro): Promise<Erro> {
  const fraseCorreta = entrada.fraseCorreta.trim();
  if (!fraseCorreta) throw new Error('Escreva a frase correta.');
  const oQueFoi = preenchido(entrada.oQueFoi);
  const base = { ...entrada, fraseCorreta, resultado: entrada.resultado ?? ('errou' as const) };
  if (!oQueFoi) delete base.oQueFoi;
  const dados = comSugestao({ ...base, status: 'aberto' as const });
  const r = await repo.transacao(async () => {
    const erro = await repo.colecao('erros').criar({
      ...dados,
      ...(dados.causa ? { acaoRecomendada: ACAO_RECOMENDADA[dados.causa] } : {}),
    });
    const frase = await repo.colecao('frases').criar({
      texto: fraseCorreta,
      origemTipo: 'erro',
      erroId: erro.id,
      ...(erro.disciplinaId ? { disciplinaId: erro.disciplinaId } : {}),
      ...(erro.pontoId ? { pontoId: erro.pontoId } : {}),
      estado: 'ativa',
      proximaRevisao: somarDias(hoje(repo), 1),
    });
    return { erro, frase };
  });
  repo.eventos.emitir('erro.registrado', {
    erroId: r.erro.id,
    pontoId: r.erro.pontoId,
    sessaoId: r.erro.sessaoId,
  });
  repo.eventos.emitir('frase.criada', { fraseId: r.frase.id, erroId: r.erro.id });
  return r.erro;
}

/** O link de volta à fonte de uma Frase de trecho (T22): dispositivo, versão e intervalo. */
export interface TrechoDaFonte {
  dispositivoId: string;
  versaoId?: string;
  /** O texto da fonte no intervalo, como estava ao enviar. */
  texto: string;
  inicio: number;
  fim: number;
}

/** "Enviar às frases" (Frases 3): a Frase de origem `trecho`, com o link de volta à fonte. */
export async function criarFraseDeTrecho(
  repo: Repositorio,
  entrada: { texto: string; trecho: TrechoDaFonte; disciplinaId?: string; pontoId?: string },
): Promise<Frase> {
  const texto = entrada.texto.trim();
  if (!texto) throw new Error('Escreva a frase.');
  const t = entrada.trecho;
  const frase = await repo.colecao('frases').criar({
    texto,
    origemTipo: 'trecho',
    ...(entrada.disciplinaId ? { disciplinaId: entrada.disciplinaId } : {}),
    ...(entrada.pontoId ? { pontoId: entrada.pontoId } : {}),
    trecho: {
      dispositivoId: t.dispositivoId,
      ...(t.versaoId ? { versaoId: t.versaoId } : {}),
      texto: t.texto.slice(0, 5_000),
      inicio: t.inicio,
      fim: t.fim,
    },
    estado: 'ativa',
    proximaRevisao: somarDias(hoje(repo), 1),
  });
  repo.eventos.emitir('frase.criada', { fraseId: frase.id });
  return frase;
}

/** A Frase nascida do erro (a primeira, mesmo arquivada); `undefined` em erro antigo sem frase. */
export async function fraseDoErro(repo: Repositorio, erroId: string): Promise<Frase | undefined> {
  return (
    await repo
      .colecao('frases')
      .listarPagina({ indice: 'erroId', de: erroId, ate: erroId, limite: 1 })
  ).itens[0];
}

/**
 * Mantém a Frase do erro igual ao erro: texto, disciplina e ponto. Frase correta apagada arquiva
 * a Frase (não some: volta se a frase for escrita de novo); erro antigo ganha a Frase ao recebê-la.
 */
async function sincronizarFrase(repo: Repositorio, erro: Erro): Promise<void> {
  const frase = await fraseDoErro(repo, erro.id);
  const texto = erro.fraseCorreta?.trim();
  if (!frase) {
    if (!texto) return;
    await repo.colecao('frases').criar({
      texto,
      origemTipo: 'erro',
      erroId: erro.id,
      ...(erro.disciplinaId ? { disciplinaId: erro.disciplinaId } : {}),
      ...(erro.pontoId ? { pontoId: erro.pontoId } : {}),
      estado: 'ativa',
      proximaRevisao: somarDias(hoje(repo), 1),
    });
    return;
  }
  const mudanca: Partial<Frase> = {};
  if (texto && texto !== frase.texto) mudanca.texto = texto;
  const estado = texto ? 'ativa' : 'arquivada';
  if (estado !== frase.estado) mudanca.estado = estado;
  if (erro.disciplinaId !== frase.disciplinaId) mudanca.disciplinaId = erro.disciplinaId;
  if (erro.pontoId !== frase.pontoId) mudanca.pontoId = erro.pontoId;
  if (Object.keys(mudanca).length > 0) await repo.colecao('frases').atualizar(frase.id, mudanca);
}

/** "Completar depois": qualquer campo, a qualquer momento; causa confirmada entra no histórico. */
export async function completarErro(
  repo: Repositorio,
  id: string,
  alteracoes: Alteracoes<'erros'>,
): Promise<Erro> {
  const erros = repo.colecao('erros');
  const atual = await erros.obter(id);
  if (!atual) throw new Error('Este erro não existe mais.');
  // Texto opcional apagado sai do registro (não fica string vazia).
  for (const campo of ['oQueFoi', 'fraseCorreta'] as const) {
    if (campo in alteracoes && !alteracoes[campo]?.trim()) {
      alteracoes = { ...alteracoes, [campo]: undefined };
    }
  }
  let mudanca: Alteracoes<'erros'> = comSugestao(alteracoes, atual);
  if ('causa' in alteracoes && alteracoes.causa !== atual.causa) {
    mudanca = {
      ...mudanca,
      acaoRecomendada: alteracoes.causa ? ACAO_RECOMENDADA[alteracoes.causa] : undefined,
      historicoCausa: [
        ...(atual.historicoCausa ?? []),
        {
          em: repo.ctx.agora().toISOString(),
          ...(atual.causaSugerida ? { sugerida: atual.causaSugerida } : {}),
          ...(alteracoes.causa ? { confirmada: alteracoes.causa } : {}),
        },
      ],
    };
  }
  const erro = await repo.transacao(async () => {
    const e = await erros.atualizar(id, mudanca);
    if (['fraseCorreta', 'disciplinaId', 'pontoId'].some((c) => c in alteracoes)) {
      await sincronizarFrase(repo, e);
    }
    return e;
  });
  repo.eventos.emitir('erro.atualizado', { erroId: id, pontoId: erro.pontoId });
  return erro;
}

export async function excluirErro(repo: Repositorio, id: string): Promise<void> {
  // O cartão criado a partir do erro continua existindo (Parte 2 §8.2, exemplo 2); a Frase do erro
  // sai junto (era o que se registrou).
  await repo.transacao(async () => {
    await repo.colecao('erros').excluir(id);
    const frase = await fraseDoErro(repo, id);
    if (frase) await repo.colecao('frases').excluir(frase.id);
  });
  repo.eventos.emitir('erro.excluido', { erroId: id });
}

export interface FiltroErros {
  resultado?: Erro['resultado'];
  status?: Erro['status'];
  soACompletar?: boolean;
  disciplinaId?: string;
  pontoId?: string;
}

function passaNoFiltro(e: Erro, f: FiltroErros): boolean {
  if (f.resultado && e.resultado !== f.resultado) return false;
  if (f.status && e.status !== f.status) return false;
  if (f.soACompletar && completude(e) !== 'rapido') return false;
  if (f.disciplinaId && e.disciplinaId !== f.disciplinaId) return false;
  if (f.pontoId && e.pontoId !== f.pontoId) return false;
  return true;
}

/** Erros por recência, paginados. */
export function listarErros(
  repo: Repositorio,
  filtro: FiltroErros = {},
  cursor: string | null = null,
  limite = 50,
): Promise<Pagina<Erro>> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('erros').listarPagina({
    indice: '[usuarioId+criadoEm]',
    de: [u, ''],
    ate: [u, '\uffff'],
    ordem: 'desc',
    limite,
    cursor,
    filtro: (e) => passaNoFiltro(e, filtro),
  });
}

export interface FiltroFrases {
  disciplinaId?: string;
  pontoId?: string;
}

/** Lista passiva (D9, D25): Frases ativas por recência. */
export function listarFrases(
  repo: Repositorio,
  filtro: FiltroFrases = {},
  cursor: string | null = null,
  limite = 100,
): Promise<Pagina<Frase>> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('frases').listarPagina({
    indice: '[usuarioId+criadoEm]',
    de: [u, ''],
    ate: [u, '\uffff'],
    ordem: 'desc',
    limite,
    cursor,
    filtro: (f) =>
      f.estado === 'ativa' &&
      (!filtro.disciplinaId || f.disciplinaId === filtro.disciplinaId) &&
      (!filtro.pontoId || f.pontoId === filtro.pontoId),
  });
}

// ── Cartões ───────────────────────────────────────────────────────────────

/** Cria o cartão do erro; se já existe um (duplo clique, outra aba), devolve o existente. */
export async function criarCartaoDeErro(repo: Repositorio, erroId: string): Promise<Cartao> {
  const { cartao, novo } = await repo.transacao(async () => {
    const erro = await repo.colecao('erros').obter(erroId);
    if (!erro) throw new Error('Este erro não existe mais.');
    const existente = (
      await repo
        .colecao('cartoes')
        .listarPagina({ indice: 'erroId', de: erroId, ate: erroId, limite: 1 })
    ).itens[0];
    if (existente) return { cartao: existente, novo: false };
    // Sem "o que foi" não há pergunta: o cartão da frase (lacuna) vem nas Frases 2.
    if (!erro.oQueFoi) throw new Error('Escreva "o que foi" para criar o cartão deste erro.');
    const frase = await fraseDoErro(repo, erroId);
    const c = await repo.colecao('cartoes').criar({
      frente: erro.oQueFoi,
      // Verso nulo = frase correta do erro, até ser editado à parte (suposição 3).
      verso: null,
      origemTipo: 'erro',
      origemId: erro.id,
      erroId: erro.id,
      ...(frase ? { fraseId: frase.id } : {}),
      ...(erro.pontoId ? { pontoId: erro.pontoId } : {}),
      estado: 'ativo',
      caixa: 1,
      proximaRevisao: somarDias(hoje(repo), 1),
    });
    if (erro.status === 'aberto')
      await repo.colecao('erros').atualizar(erroId, { status: 'com_cartao' });
    return { cartao: c, novo: true };
  });
  if (novo) repo.eventos.emitir('cartao.criado', { cartaoId: cartao.id, erroId });
  return cartao;
}

export async function criarCartaoManual(
  repo: Repositorio,
  entrada: { frente: string; verso: string; pontoId?: string },
): Promise<Cartao> {
  const cartao = await repo.colecao('cartoes').criar({
    frente: entrada.frente,
    verso: entrada.verso,
    origemTipo: 'manual',
    ...(entrada.pontoId ? { pontoId: entrada.pontoId } : {}),
    estado: 'ativo',
    caixa: 1,
    proximaRevisao: somarDias(hoje(repo), 1),
  });
  repo.eventos.emitir('cartao.criado', { cartaoId: cartao.id });
  return cartao;
}

/**
 * Cartão de um trecho da lei (11.5): frente e verso escritos pela tela, com a origem no dispositivo.
 * O Recall não conhece a Legislação: recebe o id do dispositivo e os textos prontos.
 */
export async function criarCartaoDeDispositivo(
  repo: Repositorio,
  entrada: { dispositivoId: string; frente: string; verso: string },
): Promise<Cartao> {
  const cartao = await repo.colecao('cartoes').criar({
    frente: entrada.frente,
    verso: entrada.verso,
    origemTipo: 'dispositivo',
    origemId: entrada.dispositivoId,
    estado: 'ativo',
    caixa: 1,
    proximaRevisao: somarDias(hoje(repo), 1),
  });
  repo.eventos.emitir('cartao.criado', { cartaoId: cartao.id });
  return cartao;
}

export async function editarCartao(
  repo: Repositorio,
  id: string,
  alteracoes: Pick<Alteracoes<'cartoes'>, 'frente' | 'verso' | 'pontoId'>,
): Promise<Cartao> {
  const c = await repo.colecao('cartoes').atualizar(id, alteracoes);
  repo.eventos.emitir('cartao.atualizado', { cartaoId: id });
  return c;
}

/** Verso exibido: o próprio, se editado; senão a frase correta do erro de origem. */
export function versoEfetivo(cartao: Cartao, erro: Erro | undefined): string {
  return cartao.verso ?? erro?.fraseCorreta ?? '';
}

export async function suspenderCartao(repo: Repositorio, id: string, motivo?: string) {
  await repo.colecao('cartoes').atualizar(id, {
    estado: 'suspenso',
    ...(motivo?.trim() ? { motivoSuspensao: motivo.trim() } : {}),
  });
  repo.eventos.emitir('cartao.suspenso', { cartaoId: id });
}

export async function arquivarCartao(repo: Repositorio, id: string) {
  await repo.colecao('cartoes').atualizar(id, { estado: 'arquivado' });
  repo.eventos.emitir('cartao.arquivado', { cartaoId: id });
}

/** Volta à fila sem perder a caixa. */
export async function reativarCartao(repo: Repositorio, id: string) {
  await repo.colecao('cartoes').atualizar(id, { estado: 'ativo', motivoSuspensao: undefined });
  repo.eventos.emitir('cartao.reativado', { cartaoId: id });
}

export function listarCartoes(
  repo: Repositorio,
  estado: Cartao['estado'],
  cursor: string | null = null,
  limite = 50,
): Promise<Pagina<Cartao>> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('cartoes').listarPagina({
    indice: '[usuarioId+estado+proximaRevisao]',
    de: [u, estado, ''],
    ate: [u, estado, '\uffff'],
    limite,
    cursor,
  });
}

// ── Fila e revisão ────────────────────────────────────────────────────────

/**
 * Fila do dia: cartões ativos com revisão até hoje, do mais atrasado para o menos
 * atrasado e, no mesmo dia, da caixa menor para a maior (Parte 2 §10.5). Não é
 * entidade: é consulta. Suspensos e arquivados nunca entram.
 */
export async function filaDoDia(repo: Repositorio, maximo = 1_000): Promise<Cartao[]> {
  const u = repo.ctx.usuarioId;
  const itens: Cartao[] = [];
  let cursor: string | null = null;
  do {
    const p: Pagina<Cartao> = await repo.colecao('cartoes').listarPagina({
      indice: '[usuarioId+estado+proximaRevisao]',
      de: [u, 'ativo', ''],
      ate: [u, 'ativo', hoje(repo)],
      limite: 200,
      cursor,
    });
    itens.push(...p.itens);
    cursor = p.proximoCursor;
  } while (cursor && itens.length < maximo);
  return itens
    .slice(0, maximo)
    .sort((a, b) =>
      a.proximaRevisao === b.proximaRevisao
        ? a.caixa - b.caixa
        : a.proximaRevisao < b.proximaRevisao
          ? -1
          : 1,
    );
}

/** Um cartão da fila já com a faixa do Ponto (ou nenhuma), pronto para `ordenarPorValor`. */
export type CartaoComFaixa = Cartao & { faixa?: Faixa; erroComCerteza?: boolean };

/**
 * A fila de hoje do mais para o menos valioso (AP-01). Mesmos cartões de `filaDoDia`, outra ordem;
 * nenhuma data de Revisão é tocada. O Hoje e o Drill chamam esta, e por isso o lote que um mostra
 * é o que o outro entrega.
 */
export async function filaPorValor(repo: Repositorio): Promise<CartaoComFaixa[]> {
  const fila = await filaDoDia(repo);
  const faixas = new Map<string, Faixa | undefined>();
  for (const id of new Set(fila.flatMap((c) => (c.pontoId ? [c.pontoId] : [])))) {
    faixas.set(id, (await repo.colecao('pontos').obter(id))?.faixa);
  }
  const hipercorrecao = await cartoesErradosComCerteza(repo);
  const comFaixa = fila.map((c): CartaoComFaixa => {
    const faixa = c.pontoId ? faixas.get(c.pontoId) : undefined;
    return {
      ...c,
      ...(faixa ? { faixa } : {}),
      ...(hipercorrecao.has(c.id) ? { erroComCerteza: true } : {}),
    };
  });
  return ordenarPorValor(comFaixa, hoje(repo));
}

/** Quantas Revisões recentes a consulta de certeza olha (a mais nova de cada cartão decide). */
const REVISOES_RECENTES = 500;

/**
 * Cartões cuja Revisão mais recente foi um Errei com certeza 3: quem errou tendo certeza é quem mais
 * corrige depois do feedback (AP-02), então volta na frente na Sessão seguinte. Só olha as últimas
 * as últimas 500 Revisões; sem certeza informada, nada muda.
 */
async function cartoesErradosComCerteza(repo: Repositorio): Promise<Set<string>> {
  const u = repo.ctx.usuarioId;
  const p: Pagina<Revisao> = await repo.colecao('revisoes').listarPagina({
    indice: '[usuarioId+em]',
    de: [u, ''],
    ate: [u, '\uffff'],
    ordem: 'desc',
    limite: REVISOES_RECENTES,
    cursor: null,
  });
  const vistos = new Set<string>();
  const marcados = new Set<string>();
  for (const r of p.itens) {
    if (vistos.has(r.cartaoId)) continue;
    vistos.add(r.cartaoId);
    if (r.resposta === 'errei' && r.certeza === 3) marcados.add(r.cartaoId);
  }
  return marcados;
}

/**
 * Os últimos `janela` dias (padrão 7; do mais antigo ao de hoje) em que houve Revisão, pela data
 * civil local gravada na revisão. Janela móvel: nunca zera na virada da semana. Consulta, não entidade.
 */
export async function diasComRevisao(repo: Repositorio, janela = 7): Promise<boolean[]> {
  const u = repo.ctx.usuarioId;
  const fim = hoje(repo);
  const inicio = somarDias(fim, -(janela - 1));
  const com = new Set<string>();
  let cursor: string | null = null;
  scan: do {
    const p: Pagina<Revisao> = await repo.colecao('revisoes').listarPagina({
      indice: '[usuarioId+em]',
      de: [u, ''],
      ate: [u, '\uffff'],
      ordem: 'desc',
      limite: 200,
      cursor,
    });
    for (const r of p.itens) {
      // Mais recentes primeiro: ao passar do início da janela, nada mais conta.
      if (r.em < inicio) break scan;
      if (r.data >= inicio && r.data <= fim) com.add(r.data);
    }
    cursor = p.proximoCursor;
  } while (cursor);
  return Array.from({ length: janela }, (_, i) => com.has(somarDias(inicio, i)));
}

export async function contarVencidos(repo: Repositorio): Promise<number> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('cartoes').contar({
    indice: '[usuarioId+estado+proximaRevisao]',
    de: [u, 'ativo', ''],
    ate: [u, 'ativo', hoje(repo)],
  });
}

/** Registra a Revisão (append-only) e reagenda o cartão, atomicamente. */
export async function revisar(
  repo: Repositorio,
  cartaoId: string,
  resposta: RespostaRevisao,
  opcoes: { duracaoMs?: number; certeza?: 1 | 2 | 3 } = {},
): Promise<{ cartao: Cartao; revisao: Revisao }> {
  const dia = hoje(repo);
  const resultado = await repo.transacao(async () => {
    const cartao = await repo.colecao('cartoes').obter(cartaoId);
    if (!cartao) throw new Error('Este cartão não existe mais.');
    if (cartao.estado !== 'ativo') throw new Error('Este cartão não está na fila.');
    const a = agendar(cartao, resposta, dia);
    const em = repo.ctx.agora().toISOString();
    const revisao = await repo.colecao('revisoes').criar({
      cartaoId,
      em,
      data: dia,
      resposta,
      caixaAntes: cartao.caixa,
      caixaDepois: a.caixaDepois,
      proximaAntes: cartao.proximaRevisao,
      proximaDepois: a.proximaDepois,
      atrasoDias: a.atrasoDias,
      ...(opcoes.duracaoMs !== undefined ? { duracaoMs: Math.round(opcoes.duracaoMs) } : {}),
      ...(opcoes.certeza !== undefined ? { certeza: opcoes.certeza } : {}),
    });
    const atualizado = await repo.colecao('cartoes').atualizar(cartaoId, {
      caixa: a.caixaDepois,
      proximaRevisao: a.proximaDepois,
      ultimaRevisao: em,
    });
    return { cartao: atualizado, revisao };
  });
  repo.eventos.emitir('cartao.revisado', {
    cartaoId,
    revisaoId: resultado.revisao.id,
    pontoId: resultado.cartao.pontoId,
  });
  return resultado;
}

/** Quantos cartões vencem amanhã (para o fim do drill: "Amanhã: N"). */
export async function vencemAmanha(repo: Repositorio): Promise<number> {
  const u = repo.ctx.usuarioId;
  const amanha = somarDias(hoje(repo), 1);
  return repo.colecao('cartoes').contar({
    indice: '[usuarioId+estado+proximaRevisao]',
    de: [u, 'ativo', amanha],
    ate: [u, 'ativo', amanha],
  });
}

export function historicoRevisoes(
  repo: Repositorio,
  cursor: string | null = null,
  limite = 50,
): Promise<Pagina<Revisao>> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('revisoes').listarPagina({
    indice: '[usuarioId+em]',
    de: [u, ''],
    ate: [u, '\uffff'],
    ordem: 'desc',
    limite,
    cursor,
  });
}

// ── Aviso de fila projetada (Parte 2 §10.5) ───────────────────────────────

export const LIMITE_FILA_DIARIA = 40;

/**
 * Maior fila prevista nos próximos 7 dias (vencidos contam no dia de hoje). Acima de
 * 40/dia, o Recall avisa que você está criando mais cartões do que revisa — só informa.
 */
export async function maiorFilaProjetada(repo: Repositorio): Promise<number> {
  const u = repo.ctx.usuarioId;
  const dia0 = hoje(repo);
  const ultimo = somarDias(dia0, 6);
  const porDia = new Map<string, number>();
  let cursor: string | null = null;
  do {
    const p: Pagina<Cartao> = await repo.colecao('cartoes').listarPagina({
      indice: '[usuarioId+estado+proximaRevisao]',
      de: [u, 'ativo', ''],
      ate: [u, 'ativo', ultimo],
      limite: 200,
      cursor,
    });
    for (const c of p.itens) {
      const dia = c.proximaRevisao < dia0 ? dia0 : c.proximaRevisao;
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    }
    cursor = p.proximoCursor;
  } while (cursor);
  return Math.max(0, ...porDia.values());
}

// ── Revisar frases e cartão com lacuna (Frases 2) ─────────────────────────

/** Fila de Revisar frases: Frases ativas com revisão até hoje, da mais atrasada para a menos. */
export async function filaDeFrases(repo: Repositorio, maximo = 1_000): Promise<Frase[]> {
  const u = repo.ctx.usuarioId;
  const itens: Frase[] = [];
  let cursor: string | null = null;
  do {
    const p: Pagina<Frase> = await repo.colecao('frases').listarPagina({
      indice: '[usuarioId+estado+proximaRevisao]',
      de: [u, 'ativa', ''],
      ate: [u, 'ativa', hoje(repo)],
      limite: 200,
      cursor,
    });
    itens.push(...p.itens);
    cursor = p.proximoCursor;
  } while (cursor && itens.length < maximo);
  return itens.slice(0, maximo);
}

export function contarFrasesVencidas(repo: Repositorio): Promise<number> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('frases').contar({
    indice: '[usuarioId+estado+proximaRevisao]',
    de: [u, 'ativa', ''],
    ate: [u, 'ativa', hoje(repo)],
  });
}

/** Registra a revisão da Frase (append-only) e a reagenda, atomicamente. */
export async function revisarFrase(
  repo: Repositorio,
  fraseId: string,
  resposta: RespostaFrase,
  opcoes: { duracaoMs?: number } = {},
) {
  const dia = hoje(repo);
  const resultado = await repo.transacao(async () => {
    const frase = await repo.colecao('frases').obter(fraseId);
    if (!frase) throw new Error('Esta frase não existe mais.');
    if (frase.estado !== 'ativa') throw new Error('Esta frase não está na fila.');
    const a = agendarFrase(frase, resposta, dia);
    const em = repo.ctx.agora().toISOString();
    const revisao = await repo.colecao('revisoesFrase').criar({
      fraseId,
      em,
      data: dia,
      resposta,
      proximaAntes: frase.proximaRevisao,
      proximaDepois: a.proximaDepois,
      atrasoDias: a.atrasoDias,
      ...(opcoes.duracaoMs !== undefined ? { duracaoMs: Math.round(opcoes.duracaoMs) } : {}),
    });
    const atualizada = await repo.colecao('frases').atualizar(fraseId, {
      proximaRevisao: a.proximaDepois,
      ultimaRevisao: em,
    });
    return { frase: atualizada, revisao };
  });
  repo.eventos.emitir('frase.revisada', { fraseId, revisaoId: resultado.revisao.id });
  return resultado;
}

export const MARCA_DE_LACUNA = '[…]';

/** Une intervalos que se tocam ou se sobrepõem, em ordem, limitados ao texto. */
export function normalizarOcultos(texto: string, ocultos: readonly Intervalo[]): Intervalo[] {
  const ordenados = ocultos
    .map((i) => ({ inicio: Math.max(0, i.inicio), fim: Math.min(texto.length, i.fim) }))
    .filter((i) => i.fim > i.inicio)
    .sort((a, b) => a.inicio - b.inicio);
  const unidos: Intervalo[] = [];
  for (const i of ordenados) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && i.inicio <= ultimo.fim) ultimo.fim = Math.max(ultimo.fim, i.fim);
    else unidos.push({ ...i });
  }
  return unidos;
}

/** O texto com cada trecho oculto trocado por `[…]` (a frente do cartão com lacuna). */
export function textoComLacunas(texto: string, ocultos: readonly Intervalo[]): string {
  let saida = '';
  let pos = 0;
  for (const i of normalizarOcultos(texto, ocultos)) {
    saida += texto.slice(pos, i.inicio) + MARCA_DE_LACUNA;
    pos = i.fim;
  }
  return saida + texto.slice(pos);
}

/**
 * Cartão com lacuna a partir de uma Frase: a frente é o texto com os trechos escondidos, o verso é
 * o texto inteiro. Todos os trechos escolhidos somem de uma vez, num só cartão (suposição das
 * Frases 2); para esconder um de cada vez, crie um cartão por trecho.
 */
export async function criarCartaoDeLacuna(
  repo: Repositorio,
  fraseId: string,
  ocultos: readonly Intervalo[],
): Promise<Cartao> {
  const frase = await repo.colecao('frases').obter(fraseId);
  if (!frase) throw new Error('Esta frase não existe mais.');
  const unidos = normalizarOcultos(frase.texto, ocultos);
  if (unidos.length === 0) throw new Error('Selecione o trecho que você quer esconder.');
  const cartao = await repo.colecao('cartoes').criar({
    frente: textoComLacunas(frase.texto, unidos),
    verso: frase.texto,
    origemTipo: 'frase',
    origemId: frase.id,
    fraseId: frase.id,
    tipo: 'lacuna',
    ocultos: unidos,
    ...(frase.pontoId ? { pontoId: frase.pontoId } : {}),
    estado: 'ativo',
    caixa: 1,
    proximaRevisao: somarDias(hoje(repo), 1),
  });
  repo.eventos.emitir('cartao.criado', { cartaoId: cartao.id });
  return cartao;
}

/**
 * Os trechos escolhidos viram cartões: um só com todos escondidos, ou, com `separados`, um cartão
 * por trecho (esconde um de cada vez).
 */
export async function criarCartoesDeLacuna(
  repo: Repositorio,
  fraseId: string,
  ocultos: readonly Intervalo[],
  separados = false,
): Promise<Cartao[]> {
  if (!separados) return [await criarCartaoDeLacuna(repo, fraseId, ocultos)];
  const frase = await repo.colecao('frases').obter(fraseId);
  if (!frase) throw new Error('Esta frase não existe mais.');
  const unidos = normalizarOcultos(frase.texto, ocultos);
  if (unidos.length === 0) throw new Error('Selecione o trecho que você quer esconder.');
  const cartoes: Cartao[] = [];
  for (const o of unidos) cartoes.push(await criarCartaoDeLacuna(repo, fraseId, [o]));
  return cartoes;
}
