// Liga o envio do log ao Repositório (F4-B, B2). Dormente sem o aceite `v4:sincronizar` e sem
// conta liberada: nada é enviado e nenhum timer nasce. O estudo local nunca espera por isto.
import { VERSAO_ESQUEMA, type Repositorio } from '../persistencia';
import { temConsentimento } from '../preferencias';
import { criarAgendador, type OpcoesDoAgendador } from './agendador';
import { enviarPendentes, type ResultadoDoEnvio } from './envio';
import type { ServidorDeSincronizacao } from './tipos';

export interface OpcoesDeSincronizacao {
  repo: Repositorio;
  servidor: ServidorDeSincronizacao;
  usuarioId: string;
  /** Chamado a cada rodada que enviou ou encontrou divergência (a tela de estado, B4, assina). */
  aoTerminar?: (resultado: ResultadoDoEnvio) => void;
  agendador?: Pick<OpcoesDoAgendador, 'atrasoMs' | 'esperaInicialMs' | 'maxEsperaMs'>;
}

export interface Sincronizacao {
  /** Pede um envio agora (junta com gravações próximas). */
  pedir(): void;
  parar(): void;
}

const NADA: Sincronizacao = { pedir: () => undefined, parar: () => undefined };

/** Devolve um controle inerte se a pessoa não aceitou a sincronização neste aparelho. */
export async function iniciarSincronizacao(opcoes: OpcoesDeSincronizacao): Promise<Sincronizacao> {
  const { repo, servidor, usuarioId } = opcoes;
  if (!(await temConsentimento(repo, 'sincronizar'))) return NADA;

  const ctx = { usuarioId, aparelhoId: repo.ctx.aparelhoId, versaoEsquema: VERSAO_ESQUEMA };
  const agendador = criarAgendador({
    ...opcoes.agendador,
    executar: async () => {
      const resultado = await enviarPendentes(repo.db, servidor, ctx);
      if (resultado.enviadas > 0 || resultado.divergentes.length > 0)
        opcoes.aoTerminar?.(resultado);
    },
  });
  const cancelar = repo.eventos.assinar('*', () => {
    agendador.pedir();
  });
  agendador.pedir(); // o que ficou pendente desde a última vez
  return {
    pedir: () => {
      agendador.pedir();
    },
    parar: () => {
      cancelar();
      agendador.parar();
    },
  };
}
