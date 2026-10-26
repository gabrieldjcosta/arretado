// Serviço da Sessão leve (F3-A, pacote A2). Domínio puro: só o Repositório, sem tela. Pausar não
// declara falha e a duração de uma Sessão nunca é tratada como aprendizado. Eventos `sessao.*`
// saem depois da escrita confirmada, só com ids.
import { dataCivil } from '../../core/datas';
import type { Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { obterPreferencias } from '../../core/preferencias';
import type { EntradaDeSessao, FechamentoDeSessao } from './contrato';

const vazioVira = (t: string | undefined): string | undefined => t?.trim() || undefined;

const aberta = (s: Sessao) => s.estado === 'ativa' || s.estado === 'pausada';

async function obterSessao(repo: Repositorio, id: string): Promise<Sessao> {
  const s = await repo.colecao('sessoes').obter(id);
  if (!s) throw new Error('Sessão não encontrada.');
  return s;
}

/**
 * Sessões abertas do usuário, a mais recente primeiro. Decisão do A2: `interrompida` NÃO restaura.
 * É a Sessão que ficou aberta e não foi retomada no mesmo dia; vira `interrompida` sem fim nem
 * duração (não há como saber quando a pessoa parou, e inventar horas de estudo seria falso). Nada
 * é cobrado por isso.
 */
export async function restaurarSessao(repo: Repositorio): Promise<Sessao | undefined> {
  const hoje = dataCivil(repo.ctx.agora());
  const abertas = (await repo.colecao('sessoes').todosDoUsuario())
    .filter(aberta)
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  let escolhida: Sessao | undefined;
  for (const s of abertas) {
    if (s.data < hoje || escolhida) {
      // Fecha como interrompida a de outro dia e as repetidas (sobra de abas ou de falha antiga).
      const pausas = s.pausas.map((p) => (p.fim ? p : { ...p, fim: p.inicio }));
      // Outro aparelho está editando (posse, D17): a tela só lê e não acende o aviso de bloqueio; a
      // sobra fecha quando a posse voltar.
      if (
        !repo.escritaPermitida({ colecao: 'sessoes', operacao: 'atualizar', dados: { estado: 1 } })
      )
        continue;
      await repo.colecao('sessoes').atualizar(s.id, { estado: 'interrompida', pausas });
      repo.eventos.emitir('sessao.interrompida', { sessaoId: s.id });
    } else escolhida = s;
  }
  return escolhida;
}

/**
 * Começa em um toque: tudo opcional. Há no máximo uma Sessão aberta; se já existe uma do dia, ela
 * é devolvida em vez de criar outra (a entrada é ignorada).
 */
export async function iniciarSessao(repo: Repositorio, entrada: EntradaDeSessao): Promise<Sessao> {
  const existente = await restaurarSessao(repo);
  if (existente) return existente;
  const agora = repo.ctx.agora();
  const alvo = entrada.alvo;
  const fronteira = vazioVira(entrada.fronteira);
  // Sem escolha na entrada, vale o padrão das preferências (opcional, só informativo).
  const temporizadorMin =
    entrada.temporizadorMin ?? (await obterPreferencias(repo)).temporizadorPadraoMin;
  const sessao = await repo.colecao('sessoes').criar({
    tipo: !alvo || alvo.tipo === 'livre' ? 'livre' : 'estudo',
    data: dataCivil(agora),
    inicio: agora.toISOString(),
    estado: 'ativa',
    pausas: [],
    ...(alvo ? { alvo } : {}),
    ...(alvo?.tipo === 'ponto' && alvo.id ? { pontoId: alvo.id } : {}),
    ...(fronteira ? { fronteira } : {}),
    ...(entrada.origemDaAcao ? { origemDaAcao: entrada.origemDaAcao } : {}),
    ...(entrada.tarefaId ? { tarefaId: entrada.tarefaId } : {}),
    ...(entrada.cicloId && entrada.blocoOrdem !== undefined
      ? { cicloId: entrada.cicloId, blocoOrdem: entrada.blocoOrdem }
      : {}),
    ...(temporizadorMin ? { temporizadorMin } : {}),
  });
  repo.eventos.emitir('sessao.iniciada', { sessaoId: sessao.id });
  return sessao;
}

/** Pausa sem falha. Pausar uma Sessão já pausada ou encerrada não muda nada. */
export async function pausarSessao(repo: Repositorio, id: string): Promise<Sessao> {
  const s = await obterSessao(repo, id);
  if (s.estado !== 'ativa') return s;
  const nova = await repo.colecao('sessoes').atualizar(id, {
    estado: 'pausada',
    pausas: [...s.pausas, { inicio: repo.ctx.agora().toISOString() }],
  });
  repo.eventos.emitir('sessao.pausada', { sessaoId: id });
  return nova;
}

const fecharUltimaPausa = (s: Sessao, fim: string) =>
  s.pausas.map((p, i) => (i === s.pausas.length - 1 && !p.fim ? { ...p, fim } : p));

/** Retoma a Sessão pausada. Retomar uma Sessão que não está pausada não muda nada. */
export async function retomarSessao(repo: Repositorio, id: string): Promise<Sessao> {
  const s = await obterSessao(repo, id);
  if (s.estado !== 'pausada') return s;
  const nova = await repo.colecao('sessoes').atualizar(id, {
    estado: 'ativa',
    pausas: fecharUltimaPausa(s, repo.ctx.agora().toISOString()),
  });
  repo.eventos.emitir('sessao.retomada', { sessaoId: id });
  return nova;
}

/** Segundos de estudo: do início ao fim, menos as pausas. Nunca negativo. */
export function duracaoEmSegundos(s: Pick<Sessao, 'inicio' | 'pausas'>, fim: string): number {
  const total = Date.parse(fim) - Date.parse(s.inicio);
  const pausado = s.pausas.reduce(
    (soma, p) => soma + (Date.parse(p.fim ?? fim) - Date.parse(p.inicio)),
    0,
  );
  return Math.max(0, Math.round((total - pausado) / 1000));
}

/** Encerra; o próximo passo é opcional (em branco = não grava). Encerrar de novo não muda nada. */
export async function encerrarSessao(
  repo: Repositorio,
  id: string,
  fechamento?: FechamentoDeSessao,
): Promise<Sessao> {
  const s = await obterSessao(repo, id);
  if (s.estado === 'encerrada' || s.estado === 'interrompida') return s;
  const fim = repo.ctx.agora().toISOString();
  const pausas = fecharUltimaPausa(s, fim);
  const proximoPasso = vazioVira(fechamento?.proximoPasso);
  const feitas = fechamento?.questoesFeitas;
  const acertadas = Math.min(fechamento?.questoesAcertadas ?? 0, feitas ?? 0);
  const nova = await repo.colecao('sessoes').atualizar(id, {
    estado: 'encerrada',
    fim,
    pausas,
    duracaoSegundos: duracaoEmSegundos({ inicio: s.inicio, pausas }, fim),
    ...(proximoPasso ? { proximoPasso } : {}),
    ...(feitas !== undefined && feitas > 0
      ? { questoesFeitas: Math.floor(feitas), questoesAcertadas: Math.floor(acertadas) }
      : {}),
  });
  repo.eventos.emitir('sessao.encerrada', { sessaoId: id });
  return nova;
}

/** Próximo passo pré-preenchido ao fechar (a pessoa edita ou apaga): onde parou, em palavras simples. */
export function sugerirProximoPasso(s: Pick<Sessao, 'alvo' | 'fronteira'>): string {
  const texto = s.fronteira
    ? `Continuar depois de ${s.fronteira}`
    : s.alvo?.rotulo
      ? `Voltar a ${s.alvo.rotulo}`
      : '';
  return texto.slice(0, 500);
}
