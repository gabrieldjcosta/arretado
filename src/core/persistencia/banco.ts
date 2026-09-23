import Dexie, { type Table } from 'dexie';
import { ENTIDADES, NOMES_COLECOES, type NomeColecao, type RegistroDe } from '../modelo';

/** Versão do esquema local; sobe a cada migração (Parte 1 §7.2). */
export const VERSAO_ESQUEMA = 1;

export const NOME_BANCO_PRINCIPAL = 'arretado';

/** Entrada do log de alterações (append-only; base de sync, desfazer e auditoria). */
export interface Alteracao {
  seq?: number;
  ts: string;
  aparelhoId: string;
  usuarioId: string;
  colecao: NomeColecao;
  registroId: string;
  /** `gravar` = registro completo; `atualizar` = campos alterados; `remover` = apagamento físico. */
  operacao: 'gravar' | 'atualizar' | 'remover';
  dados?: Record<string, unknown>;
  removidos?: string[];
}

export interface EntradaMeta {
  chave: string;
  valor: unknown;
}

/** Conteúdo binário fora do registro: anexos e snapshots (não carregados em listagens). */
export interface Conteudo {
  id: string;
  bytes: Uint8Array;
}

function esquemaV1(): Record<string, string> {
  const stores: Record<string, string> = {};
  for (const nome of NOMES_COLECOES) {
    stores[nome] = ['id', ...ENTIDADES[nome].indices].join(', ');
  }
  stores.alteracoes = '++seq, ts, [colecao+registroId]';
  stores.meta = 'chave';
  stores.anexosConteudo = 'id';
  stores.snapshotsConteudo = 'id';
  return stores;
}

export class BancoArretado extends Dexie {
  alteracoes!: Table<Alteracao, number>;
  meta!: Table<EntradaMeta, string>;
  anexosConteudo!: Table<Conteudo, string>;
  snapshotsConteudo!: Table<Conteudo, string>;

  constructor(nome: string = NOME_BANCO_PRINCIPAL) {
    super(nome);
    // Migrações idempotentes: cada versão declara o esquema completo e, se preciso, um upgrade.
    this.version(VERSAO_ESQUEMA).stores(esquemaV1());
  }

  tabela<N extends NomeColecao>(nome: N): Table<RegistroDe<N>, string> {
    return this.table(nome);
  }
}
