// Serviço do Recall (Parte 1 §6; Parte 2 §8.2 e §10.4–10.5). Recall é totalmente isolado:
// só depende do core. Eventos saem depois da escrita confirmada.
import { dataCivil, somarDias } from '../../core/datas';
import type { Cartao, Erro, RespostaRevisao, Revisao } from '../../core/modelo';
import type { Alteracoes, Dados, Pagina, Repositorio } from '../../core/persistencia';
import { agendar } from './agendamento';
import { ACAO_RECOMENDADA, completude, sugerirCausa } from './causa';

export function hoje(repo: Repositorio): string {
  return dataCivil(repo.ctx.agora());
}

// ── Erros ─────────────────────────────────────────────────────────────────

/** Os dois obrigatórios (D9) e, opcionalmente, qualquer complemento. */
export type EntradaErro = Pick<Erro, 'resultado' | 'oQueFoi'> &
  Partial<Omit<Dados<'erros'>, 'resultado' | 'oQueFoi' | 'status' | 'causaSugerida'>>;

const CAMPOS_DA_SUGESTAO = ['oQueFoi', 'resultado', 'justificativa', 'conviccao'] as const;

/**
 * Recalcula a causa sugerida quando mudam os campos que a determinam. Numa edição
 * (`base` presente), sugestão que deixou de valer é apagada.
 */
function comSugestao<T extends Partial<Erro>>(erro: T, base?: Partial<Erro>): T {
  if (base && !CAMPOS_DA_SUGESTAO.some((c) => c in erro)) return erro;
  const junto = { ...base, ...erro };
  if (!junto.oQueFoi || !junto.resultado) return erro;
  const sugerida = sugerirCausa({
    oQueFoi: junto.oQueFoi,
    resultado: junto.resultado,
    ...(junto.justificativa ? { justificativa: junto.justificativa } : {}),
    ...(junto.conviccao ? { conviccao: junto.conviccao } : {}),
  });
  if (sugerida) return { ...erro, causaSugerida: sugerida };
  return base?.causaSugerida ? { ...erro, causaSugerida: undefined } : erro;
}

export async function registrarErro(repo: Repositorio, entrada: EntradaErro): Promise<Erro> {
  const dados = comSugestao({ ...entrada, status: 'aberto' as const });
  const erro = await repo.colecao('erros').criar({
    ...dados,
    ...(dados.causa ? { acaoRecomendada: ACAO_RECOMENDADA[dados.causa] } : {}),
  });
  repo.eventos.emitir('erro.registrado', {
    erroId: erro.id,
    pontoId: erro.pontoId,
    sessaoId: erro.sessaoId,
  });
  return erro;
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
  const erro = await erros.atualizar(id, mudanca);
  repo.eventos.emitir('erro.atualizado', { erroId: id, pontoId: erro.pontoId });
  return erro;
}

export async function excluirErro(repo: Repositorio, id: string): Promise<void> {
  // O cartão criado a partir do erro continua existindo (Parte 2 §8.2, exemplo 2).
  await repo.colecao('erros').excluir(id);
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

/** Lista passiva: frases corretas por recência (D9). */
export function listarFrases(
  repo: Repositorio,
  filtro: Pick<FiltroErros, 'disciplinaId' | 'pontoId'> = {},
  cursor: string | null = null,
  limite = 100,
): Promise<Pagina<Erro>> {
  const u = repo.ctx.usuarioId;
  return repo.colecao('erros').listarPagina({
    indice: '[usuarioId+criadoEm]',
    de: [u, ''],
    ate: [u, '\uffff'],
    ordem: 'desc',
    limite,
    cursor,
    filtro: (e) =>
      Boolean(e.fraseCorreta?.trim()) && e.status !== 'descartado' && passaNoFiltro(e, filtro),
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
    const c = await repo.colecao('cartoes').criar({
      frente: erro.oQueFoi,
      // Verso nulo = frase correta do erro, até ser editado à parte (suposição 3).
      verso: null,
      origemTipo: 'erro',
      origemId: erro.id,
      erroId: erro.id,
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
  opcoes: { duracaoMs?: number } = {},
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
