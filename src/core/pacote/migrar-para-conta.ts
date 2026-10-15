// Migração do uso local para a conta (F4-A, A4; plano f4a-contas.md §5).
// Regra: a origem nunca é alterada; só se copia, verifica e, depois, se ativa a conta.
// ESQUELETO: interface fixa dos contratos A4a/A4b/A4c (docs/planos/tarefas/2026-10-15-f4a-a4-migracao.md).
// Mudar a interface exige avisar os três contratos.
import type { NomeColecao } from '../modelo';
import type { RegistroDeContas, Repositorio } from '../persistencia';
import type { PacoteGerado } from './exportar';

export type EtapaMigracao = 'backup' | 'copia' | 'verificacao' | 'ativacao';

export interface PreviaMigracao {
  colecoes: number;
  registros: number;
  /** Tamanho aproximado dos dados, em bytes. */
  bytes: number;
  porColecao: Partial<Record<NomeColecao, number>>;
}

export type ResultadoMigracao =
  | {
      tipo: 'concluida';
      uid: string;
      contagens: Partial<Record<NomeColecao, number>>;
      hash: string;
    }
  /** Falhou: a origem está intacta e o banco novo foi apagado. */
  | { tipo: 'falhou'; etapa: EtapaMigracao; motivo: string };

export interface OpcoesMigracao {
  /** `auth.users.id` da conta de destino. */
  uid: string;
  /** Entrega o backup automático à pessoa (download). Rejeitar impede a migração de começar. */
  baixarBackup: (pacote: PacoteGerado) => Promise<void>;
  aoAvancar?: (etapa: EtapaMigracao) => void;
  /** Só para testes: lança `InterrupcaoSimulada` no início da etapa, como uma aba fechada. */
  interromperEm?: EtapaMigracao;
  registro?: RegistroDeContas;
  agora?: Date;
}

export type EstadoDaMigracao = 'nenhuma' | 'em-andamento' | 'concluida';

export interface CopiaAnterior {
  /** Banco de origem, guardado como "Cópia de antes da conta". */
  nomeBanco: string;
  /** Conta para a qual os dados foram copiados. */
  uid: string;
  /** ISO 8601 UTC. */
  migradoEm: string;
}

/** Interrupção injetada pelos testes (`interromperEm`); não é tratada como falha. */
export class InterrupcaoSimulada extends Error {
  constructor(readonly etapa: EtapaMigracao) {
    super(`Interrupção simulada na etapa ${etapa}.`);
    this.name = 'InterrupcaoSimulada';
  }
}

// Rejeita (não lança), como a implementação real fará em caso de erro inesperado.
function naoImplementado(): Promise<never> {
  return Promise.reject(new Error('migrar-para-conta: não implementado (A4a).'));
}

/** O que será copiado; não escreve nada. */
export const preverMigracao: (origem: Repositorio) => Promise<PreviaMigracao> = naoImplementado;

export const migrarParaConta: (
  origem: Repositorio,
  opcoes: OpcoesMigracao,
) => Promise<ResultadoMigracao> = naoImplementado;

export const estadoDaMigracao: (
  uid: string,
  registro?: RegistroDeContas,
) => Promise<EstadoDaMigracao> = naoImplementado;

export const copiaAnterior: (registro?: RegistroDeContas) => Promise<CopiaAnterior | null> =
  naoImplementado;

export const apagarCopiaAnterior: (registro?: RegistroDeContas) => Promise<void> = naoImplementado;
