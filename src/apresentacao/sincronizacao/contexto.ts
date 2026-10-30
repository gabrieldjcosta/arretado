import { createContext, useContext } from 'react';
import type { EstadoDePosse } from '../../core/sincronizacao';

/** Por que a sincronização não liga nesta abertura (a tela explica cada um). */
export type MotivoParada = 'sem-conta' | 'sem-aceite';

export interface RodadaVista {
  ok: boolean;
  em: string;
  /** Texto curto da causa, só quando `ok` é falso (vira Problema na tela). */
  falha?: string;
}

export interface EstadoDaTelaDeSincronizacao {
  /** `null` enquanto ainda não se sabe (sessão e aceite sendo lidos). */
  ligada: boolean | null;
  parada: MotivoParada | null;
  pendentes: number;
  conflitos: number;
  /** Entradas recebidas que não puderam ser aplicadas (quarentena). */
  emQuarentena: number;
  ultimaRodada: RodadaVista | null;
  posse: EstadoDePosse;
  /** Última escrita recusada pela trava (ms); a faixa de posse avisa por alguns segundos. */
  bloqueioEm: number | null;
}

export interface ControleDeSincronizacao {
  estado: EstadoDaTelaDeSincronizacao;
  /** "Sincronizar agora": uma rodada sem esperar o atraso de juntar. */
  sincronizarAgora(): void;
  /** Registra o aceite v4 (servidor primeiro) e liga. Rejeita com `FalhaDeConta` se a conta não foi liberada. */
  ligar(): Promise<void>;
  /** Para de enviar e receber neste Aparelho; o que já subiu fica na conta. Religa em "Ligar". */
  desligar(): void;
  /** "Passar a editar aqui": assume a posse de um aparelho em uso. */
  editarAqui(): Promise<void>;
}

export const ContextoSincronizacao = createContext<ControleDeSincronizacao | null>(null);

/** `null` fora do provedor (build sem conta, rota da migração). */
export function useSincronizacao(): ControleDeSincronizacao | null {
  return useContext(ContextoSincronizacao);
}
