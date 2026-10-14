// Registro de contas do aparelho (F4-A, A1; T26): qual banco Dexie abrir, sem rede e sem esperar login.
// Banco minúsculo e separado dos bancos de estudo: guarda só quem já entrou neste aparelho e qual
// conta está ativa. Nenhum dado de estudo passa por aqui.
import Dexie, { type Table } from 'dexie';
import { NOME_BANCO_PRINCIPAL } from './banco';
import { Repositorio, type OpcoesRepositorio } from './repositorio';

export const NOME_REGISTRO_DE_CONTAS = 'arretado-registro';
const PREFIXO_BANCO_DA_CONTA = `${NOME_BANCO_PRINCIPAL}-c-`;
const CHAVE_CONTA_ATIVA = 'contaAtiva';

export interface ContaDoAparelho {
  /** `auth.users.id` da conta: é o `usuarioId` de todo registro do banco dela. */
  uid: string;
  nomeBanco: string;
  email?: string;
  /** ISO 8601 UTC do último uso da conta neste aparelho. */
  ultimoUso: string;
}

interface EntradaMeta {
  chave: string;
  valor: unknown;
}

class BancoDoRegistro extends Dexie {
  contas!: Table<ContaDoAparelho, string>;
  meta!: Table<EntradaMeta, string>;

  constructor(nome: string) {
    super(nome);
    this.version(1).stores({ contas: 'uid, ultimoUso', meta: 'chave' });
  }
}

/** Nome do banco Dexie de uma conta: um por `uid`, nunca compartilhado (T26). */
export function nomeBancoDaConta(uid: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(uid)) throw new Error('Identificador de conta inválido.');
  return `${PREFIXO_BANCO_DA_CONTA}${uid.toLowerCase()}`;
}

/** Lista e conta ativa do aparelho. Abre o banco do registro a cada operação e o fecha em seguida. */
export class RegistroDeContas {
  constructor(private readonly nome: string = NOME_REGISTRO_DE_CONTAS) {}

  private async com<T>(fn: (db: BancoDoRegistro) => Promise<T>): Promise<T> {
    const db = new BancoDoRegistro(this.nome);
    try {
      return await fn(db);
    } finally {
      db.close();
    }
  }

  listar(): Promise<ContaDoAparelho[]> {
    return this.com((db) => db.contas.orderBy('ultimoUso').reverse().toArray());
  }

  async contaAtiva(): Promise<ContaDoAparelho | null> {
    return this.com(async (db) => {
      const uid = (await db.meta.get(CHAVE_CONTA_ATIVA))?.valor;
      if (typeof uid !== 'string') return null;
      return (await db.contas.get(uid)) ?? null;
    });
  }

  /** Cria ou atualiza a conta e a torna ativa. */
  ativar(uid: string, opcoes: { email?: string; agora?: Date } = {}): Promise<ContaDoAparelho> {
    const conta: ContaDoAparelho = {
      uid: uid.toLowerCase(),
      nomeBanco: nomeBancoDaConta(uid),
      ...(opcoes.email === undefined ? {} : { email: opcoes.email }),
      ultimoUso: (opcoes.agora ?? new Date()).toISOString(),
    };
    return this.com(async (db) => {
      await db.transaction('rw', db.contas, db.meta, async () => {
        const antiga = await db.contas.get(conta.uid);
        await db.contas.put({ ...antiga, ...conta });
        await db.meta.put({ chave: CHAVE_CONTA_ATIVA, valor: conta.uid });
      });
      return conta;
    });
  }

  /** Sair: nenhuma conta ativa (o banco da conta fica no aparelho; apagar é decisão à parte). */
  desativar(): Promise<void> {
    return this.com(async (db) => {
      await db.meta.delete(CHAVE_CONTA_ATIVA);
    });
  }

  /** Esquece a conta no registro (depois de apagar o banco dela). */
  esquecer(uid: string): Promise<void> {
    return this.com(async (db) => {
      await db.transaction('rw', db.contas, db.meta, async () => {
        await db.contas.delete(uid.toLowerCase());
        if ((await db.meta.get(CHAVE_CONTA_ATIVA))?.valor === uid.toLowerCase()) {
          await db.meta.delete(CHAVE_CONTA_ATIVA);
        }
      });
    });
  }
}

export interface OpcoesAbrirAtivo extends OpcoesRepositorio {
  /** Falso (padrão do build, `VITE_CONTA=0`): não toca no registro; abre o banco de sempre. */
  contasHabilitadas?: boolean;
  registro?: RegistroDeContas;
}

/** Nome do banco a abrir agora: o da conta ativa, ou o principal (sem conta). Não usa rede. */
export async function nomeDoBancoAtivo(
  opcoes: Pick<OpcoesAbrirAtivo, 'contasHabilitadas' | 'registro'> = {},
): Promise<string> {
  if (!opcoes.contasHabilitadas) return NOME_BANCO_PRINCIPAL;
  const ativa = await (opcoes.registro ?? new RegistroDeContas()).contaAtiva();
  return ativa?.nomeBanco ?? NOME_BANCO_PRINCIPAL;
}

/** Abre o repositório do aparelho: conta ativa se houver e a F4-A estiver ligada, senão o de hoje. */
export async function abrirRepositorioAtivo(opcoes: OpcoesAbrirAtivo = {}): Promise<Repositorio> {
  const { contasHabilitadas, registro, ...resto } = opcoes;
  const nomeBanco = resto.nomeBanco ?? (await nomeDoBancoAtivo({ contasHabilitadas, registro }));
  return Repositorio.abrir({ ...resto, nomeBanco });
}
