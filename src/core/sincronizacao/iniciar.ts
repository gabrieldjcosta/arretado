// Liga o envio e a recepção do log ao Repositório (F4-B, B2 e B3). Dormente sem o aceite
// `v4:sincronizar` e sem conta liberada: nada é enviado, nada é puxado e nenhum timer nasce. O estudo
// local nunca espera por isto.
import {
  VERSAO_ESQUEMA,
  type Alteracao,
  type Reidratador,
  type Repositorio,
} from '../persistencia';
import { temConsentimento } from '../preferencias';
import { VERSAO_APP } from '../versao';
import { criarAgendador, type OpcoesDoAgendador } from './agendador';
import { registrarDivergencias } from './divergencias';
import { enviarPendentes, type ResultadoDoEnvio } from './envio';
import {
  lerSeqRecebido,
  receberNovidades,
  type ContextoDeRecepcao,
  resultadoVazioDaRecepcao,
  type ResultadoDaRecepcao,
} from './receber';
import { recargaNecessaria, recarregarDaConta } from './recarga';
import type { ServidorDeSincronizacao } from './tipos';

export interface OpcoesDeSincronizacao {
  repo: Repositorio;
  servidor: ServidorDeSincronizacao;
  usuarioId: string;
  /**
   * Chamado a cada rodada que enviou, recebeu, encontrou divergência ou abriu Conflito (a tela de
   * estado, B4, assina).
   */
  aoTerminar?: (resultado: ResultadoDoEnvio, recebido: ResultadoDaRecepcao) => void;
  /** Toda rodada, inclusive as que falharam (a tela de estado mostra a causa como Problema). */
  aoRodada?: (resultado: ResultadoDaRodada) => void;
  /** Fonte do acervo para refazer as adesões recebidas de outro aparelho. */
  prepararReidratacao?: (log: readonly Alteracao[]) => Promise<Reidratador>;
  agendador?: Pick<OpcoesDoAgendador, 'atrasoMs' | 'esperaInicialMs' | 'maxEsperaMs'>;
  /** Puxada periódica com a aba visível (plano §5: 60 s); 0 desliga. */
  intervaloDePuxadaMs?: number;
  /** A aba está à vista? Sem `document` (testes, workers) conta como sim. */
  visivel?: () => boolean;
}

export type ResultadoDaRodada =
  | { ok: true; envio: ResultadoDoEnvio; recebido: ResultadoDaRecepcao }
  | { ok: false; falha: unknown };

export interface Sincronizacao {
  /** Pede uma rodada (envia, puxa; junta com gravações próximas). `agora` pula a espera de juntar. */
  pedir(agora?: boolean): void;
  parar(): void;
}

const NADA: Sincronizacao = { pedir: () => undefined, parar: () => undefined };

const INTERVALO_PADRAO_MS = 60_000;

function abaVisivel(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

/**
 * Uma rodada: (recarga se faltar o fio do log) → enviar → abrir Conflito das divergências →
 * receber → avisar o servidor até onde chegamos. Qualquer falha propaga: o agendador repete.
 */
export async function rodadaDeSincronizacao(
  repo: Repositorio,
  servidor: ServidorDeSincronizacao,
  ctx: ContextoDeRecepcao,
): Promise<{ envio: ResultadoDoEnvio; recebido: ResultadoDaRecepcao }> {
  let recebido = resultadoVazioDaRecepcao();
  // Sobras de uma rodada que caiu entre o envio e a abertura do Conflito (antes de qualquer recepção).
  const deAntes = await registrarDivergencias(repo, servidor, ctx);
  if (await recargaNecessaria(repo)) recebido = await recarregarDaConta(repo, servidor, ctx);
  const envio = await enviarPendentes(repo.db, servidor, ctx);
  const novosConflitos =
    deAntes + (await registrarDivergencias(repo, servidor, ctx, envio.divergentes));
  const puxado = await receberNovidades(repo, servidor, ctx);
  if (puxado.precisaRecarga) {
    const refeito = await recarregarDaConta(repo, servidor, ctx);
    puxado.aplicadas += refeito.aplicadas;
    puxado.conflitos += refeito.conflitos;
    puxado.quarentena += refeito.quarentena;
  }
  recebido = {
    aplicadas: recebido.aplicadas + puxado.aplicadas,
    conflitos: recebido.conflitos + puxado.conflitos + novosConflitos,
    ignoradas: recebido.ignoradas + puxado.ignoradas,
    quarentena: recebido.quarentena + puxado.quarentena,
    paradaPorVersao: puxado.paradaPorVersao,
    precisaRecarga: false,
  };
  // Melhor esforço: o servidor só usa isto para podar; não vale repetir a rodada por causa dele.
  await servidor
    .registrarSincronia(ctx.aparelhoId, await lerSeqRecebido(repo), ctx.versaoEsquema)
    .catch(() => undefined);
  return { envio, recebido };
}

/** Devolve um controle inerte se a pessoa não aceitou a sincronização neste aparelho. */
export async function iniciarSincronizacao(opcoes: OpcoesDeSincronizacao): Promise<Sincronizacao> {
  const { repo, servidor, usuarioId } = opcoes;
  if (!(await temConsentimento(repo, 'sincronizar'))) return NADA;

  const ctx = {
    usuarioId,
    aparelhoId: repo.ctx.aparelhoId,
    versaoEsquema: VERSAO_ESQUEMA,
    versaoApp: VERSAO_APP,
    prepararReidratacao: opcoes.prepararReidratacao,
  };

  const rodada = async () => {
    const { envio, recebido } = await rodadaDeSincronizacao(repo, servidor, ctx);
    if (
      envio.enviadas > 0 ||
      envio.divergentes.length > 0 ||
      recebido.aplicadas > 0 ||
      recebido.conflitos > 0 ||
      recebido.quarentena > 0 ||
      recebido.paradaPorVersao
    ) {
      opcoes.aoTerminar?.(envio, recebido);
    }
    opcoes.aoRodada?.({ ok: true, envio, recebido });
  };

  const agendador = criarAgendador({
    ...opcoes.agendador,
    executar: rodada,
    aoFalhar: (falha) => opcoes.aoRodada?.({ ok: false, falha }),
  });
  const cancelar = repo.eventos.assinar('*', () => {
    agendador.pedir();
  });
  agendador.pedir(); // o que ficou pendente desde a última vez

  const intervalo = opcoes.intervaloDePuxadaMs ?? INTERVALO_PADRAO_MS;
  const visivel = opcoes.visivel ?? abaVisivel;
  const periodico =
    intervalo > 0
      ? setInterval(() => {
          if (visivel()) agendador.pedir();
        }, intervalo)
      : null;

  return {
    pedir: (agora) => {
      agendador.pedir(agora);
    },
    parar: () => {
      cancelar();
      if (periodico !== null) clearInterval(periodico);
      agendador.parar();
    },
  };
}
