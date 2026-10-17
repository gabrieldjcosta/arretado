// Migração do uso local para a conta (F4-A, A4; plano f4a-contas.md §5).
// Regra: a origem nunca é alterada; só se copia, verifica e, depois, se ativa a conta.
// Interface fixa dos contratos A4a/A4b/A4c (docs/planos/tarefas/2026-10-15-f4a-a4-migracao.md).
// Mudar a interface exige avisar os três contratos.
//
// Cópia direta, banco a banco, e não pela restauração integral (`importar.ts`, modo 6): aquele
// caminho dá ao banco novo outro `aparelhoId`, reescreve o log com carimbos novos e, com pacote de
// outra identidade, faz o banco adotar o `usuarioId` do pacote. Aqui registros, log (`seq`, `ts`,
// `aparelhoId`) e binários dos anexos passam iguais; só o campo `usuarioId` vira o `uid`.
// As coleções só locais (pontos de restauração, logs de importação, espaços separados) ficam na
// cópia anterior: restaurar um ponto de restauração antigo no banco da conta trocaria a
// identidade dele de volta para a local.
import { ENTIDADES, NOMES_COLECOES, type NomeColecao } from '../modelo';
import {
  apagarBanco,
  BancoArretado,
  CHAVE_ULTIMO_BACKUP,
  NOME_BANCO_PRINCIPAL,
  nomeBancoDaConta,
  reconstruirDoLog,
  RegistroDeContas,
  Repositorio,
  type Alteracao,
} from '../persistencia';
import { iguais, jsonCanonico } from '../util/json-canonico';
import { sha256 } from './bytes';
import { exportarPacote, hashDoConjunto, serializarLista, type PacoteGerado } from './exportar';

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

/** Coleções que vão para o banco da conta: as do pacote integral. */
const COPIADAS = NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo !== null);
const IDENTIDADE: NomeColecao[] = ['usuarios', 'aparelhos', 'preferencias'];

// Chaves no `meta` do registro de contas (a origem fica byte a byte igual; plano §5.6).
const CHAVE_COPIA_ANTERIOR = 'copiaAnterior';
/** Último Problema da migração (falha na verificação), para a tela mostrar e relatar. */
export const CHAVE_PROBLEMA_MIGRACAO = 'problemaMigracao';
const chaveMigracao = (uid: string) => `migracao:${uid.toLowerCase()}`;

type MarcaMigracao =
  | { estado: 'em-andamento'; origem: string; iniciadaEm: string }
  | {
      estado: 'concluida';
      origem: string;
      migradoEm: string;
      resultado: Extract<ResultadoMigracao, { tipo: 'concluida' }>;
    };

async function lerMarca(registro: RegistroDeContas, uid: string): Promise<MarcaMigracao | null> {
  const valor = (await registro.lerMeta(chaveMigracao(uid))) as MarcaMigracao | undefined;
  return valor ?? null;
}

type Registro = Record<string, unknown> & { id: string; usuarioId: string };

/** O que se copia da origem, lido numa transação só (retrato coerente). */
interface Conteudo {
  registros: Map<NomeColecao, Registro[]>;
  log: Alteracao[];
  anexos: { id: string; bytes: Uint8Array }[];
  meta: { chave: string; valor: unknown }[];
}

function porId<T extends { id: string }>(lista: T[]): T[] {
  return lista.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

async function lerConteudo(db: BancoArretado, usuarioId: string): Promise<Conteudo> {
  return db.transaction('r', db.tables, async () => {
    const registros = new Map<NomeColecao, Registro[]>();
    for (const nome of COPIADAS) {
      const lista = (await db
        .tabela(nome)
        .where('usuarioId')
        .equals(usuarioId)
        .toArray()) as unknown as Registro[];
      registros.set(nome, porId(lista));
    }
    const copiadas = new Set<string>(COPIADAS);
    // Mesma chave de índice → ordem de `seq`.
    const log = (await db.alteracoes.where('usuarioId').equals(usuarioId).toArray()).filter((a) =>
      copiadas.has(a.colecao),
    );
    const idsAnexos = (registros.get('anexos') ?? []).map((a) => a.id);
    const anexos = (await db.anexosConteudo.bulkGet(idsAnexos)).filter(
      (a): a is { id: string; bytes: Uint8Array } => a !== undefined,
    );
    const meta = await db.meta.toArray();
    return { registros, log, anexos, meta };
  });
}

function comDono(a: Alteracao, uid: string): Alteracao {
  const trocado: Alteracao = { ...a, usuarioId: uid };
  if (a.dados && 'usuarioId' in a.dados) trocado.dados = { ...a.dados, usuarioId: uid };
  return trocado;
}

function contar(c: Conteudo): Partial<Record<NomeColecao, number>> {
  const contagens: Partial<Record<NomeColecao, number>> = {};
  for (const [nome, lista] of c.registros) if (lista.length > 0) contagens[nome] = lista.length;
  return contagens;
}

/**
 * Hash do conteúdo com o dono normalizado: o mesmo para a origem e para a cópia certa, qualquer
 * que seja o `uid` (registros, log com `seq`, `ts` e `aparelhoId`, binários dos anexos).
 */
async function hashNormalizado(c: Conteudo): Promise<string> {
  const arquivos: Record<string, { sha256: string; bytes: number }> = {};
  const guardar = async (caminho: string, bytes: Uint8Array) => {
    arquivos[caminho] = { sha256: await sha256(bytes), bytes: bytes.length };
  };
  for (const [nome, lista] of c.registros) {
    await guardar(
      `dados/${nome}.json`,
      serializarLista(lista.map((r) => ({ ...r, usuarioId: '' }))),
    );
  }
  await guardar('log.json', serializarLista(c.log.map((a) => comDono(a, ''))));
  for (const a of c.anexos) await guardar(`anexos/${a.id}`, a.bytes);
  return hashDoConjunto(arquivos);
}

/** O que será copiado; não escreve nada. */
export async function preverMigracao(origem: Repositorio): Promise<PreviaMigracao> {
  const c = await lerConteudo(origem.db, origem.ctx.usuarioId);
  const porColecao = contar(c);
  let bytes = 0;
  for (const lista of c.registros.values()) {
    for (const r of lista) bytes += jsonCanonico(r).length;
  }
  for (const a of c.anexos) bytes += a.bytes.length;
  return {
    colecoes: Object.keys(porColecao).length,
    registros: Object.values(porColecao).reduce((s, n) => s + n, 0),
    bytes,
    porColecao,
  };
}

/** O banco da conta já guarda estudo (não só a identidade que nasce ao entrar)? */
async function contaTemDados(nomeBanco: string): Promise<boolean> {
  if (!(await indexedDB.databases()).some((d) => d.name === nomeBanco)) return false;
  const db = new BancoArretado(nomeBanco);
  await db.open();
  try {
    for (const nome of NOMES_COLECOES) {
      if (IDENTIDADE.includes(nome)) continue;
      if ((await db.tabela(nome).count()) > 0) return true;
    }
    return false;
  } finally {
    db.close();
  }
}

/** Cria o banco da conta com o conteúdo da origem, numa transação. */
async function copiar(
  nomeBanco: string,
  c: Conteudo,
  identidade: { usuarioId: string; aparelhoId: string },
  backupEm: string,
): Promise<void> {
  const { usuarioId } = identidade;
  const db = new BancoArretado(nomeBanco);
  await db.open();
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const [nome, lista] of c.registros) {
        await db.tabela(nome).bulkAdd(lista.map((r) => ({ ...r, usuarioId })) as never[]);
      }
      await db.alteracoes.bulkAdd(c.log.map((a) => comDono(a, usuarioId)));
      await db.anexosConteudo.bulkAdd(c.anexos);
      // Meta local da origem (ex.: Frases já migradas), sem a identidade, que é a da conta.
      await db.meta.bulkPut([
        ...c.meta.filter((m) => m.chave !== 'identidade' && m.chave !== CHAVE_ULTIMO_BACKUP),
        { chave: 'identidade', valor: identidade },
        // O backup da migração tem exatamente estes dados.
        { chave: CHAVE_ULTIMO_BACKUP, valor: backupEm },
      ]);
    });
  } finally {
    db.close();
  }
}

class VerificacaoFalhou extends Error {}

/** As três verificações do plano §5.4, mais a identidade do banco novo. */
async function verificar(
  origem: Repositorio,
  nomeBanco: string,
  uid: string,
): Promise<{ contagens: Partial<Record<NomeColecao, number>>; hash: string }> {
  const conta = await Repositorio.abrir({ nomeBanco });
  try {
    if (conta.ctx.usuarioId !== uid || conta.ctx.aparelhoId !== origem.ctx.aparelhoId) {
      throw new VerificacaoFalhou('A identidade do banco novo não confere.');
    }
    // Relida agora: escrita na origem durante a cópia também aparece aqui.
    const deOrigem = await lerConteudo(origem.db, origem.ctx.usuarioId);
    const daConta = await lerConteudo(conta.db, uid);
    const contagens = contar(daConta);
    if (!iguais(contagens, contar(deOrigem))) {
      throw new VerificacaoFalhou('As contagens por coleção não conferem.');
    }
    const hash = await hashNormalizado(daConta);
    if (hash !== (await hashNormalizado(deOrigem))) {
      throw new VerificacaoFalhou('O conteúdo copiado difere do original.');
    }
    let estado;
    try {
      estado = reconstruirDoLog(daConta.log);
    } catch {
      throw new VerificacaoFalhou('O histórico de alterações não pôde ser refeito.');
    }
    for (const [nome, lista] of daConta.registros) {
      const doLog = porId([...(estado.get(nome)?.values() ?? [])] as Registro[]);
      if (!iguais(doLog, lista)) {
        throw new VerificacaoFalhou(`O histórico não reconstrói ${nome}.`);
      }
    }
    for (const nome of estado.keys()) {
      if ((estado.get(nome)?.size ?? 0) > 0 && !daConta.registros.has(nome)) {
        throw new VerificacaoFalhou(`O histórico tem ${nome}, fora da cópia.`);
      }
    }
    return { contagens, hash };
  } finally {
    conta.fechar();
  }
}

function motivoDe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function migrarParaConta(
  origem: Repositorio,
  opcoes: OpcoesMigracao,
): Promise<ResultadoMigracao> {
  const registro = opcoes.registro ?? new RegistroDeContas();
  const agora = (opcoes.agora ?? new Date()).toISOString();
  const uid = opcoes.uid.toLowerCase();
  const nomeBanco = nomeBancoDaConta(uid);
  const etapa = (e: EtapaMigracao) => {
    opcoes.aoAvancar?.(e);
    if (opcoes.interromperEm === e) throw new InterrupcaoSimulada(e);
  };

  const marca = await lerMarca(registro, uid);
  // Já concluída: nada a refazer (rodar de novo não duplica nem regrava).
  if (marca?.estado === 'concluida') return marca.resultado;
  if (origem.db.name === nomeBanco || origem.ctx.usuarioId === uid) {
    return { tipo: 'falhou', etapa: 'backup', motivo: 'Estes dados já são desta conta.' };
  }
  // Banco da conta com estudo próprio não se apaga (A6 decide): sem migração em andamento, ou com
  // ela interrompida e a conta ativada por outro caminho (entrou e estudou nela antes de repetir).
  const emUso = marca === null || (await registro.contaAtiva())?.uid === uid;
  if (emUso && (await contaTemDados(nomeBanco))) {
    return {
      tipo: 'falhou',
      etapa: 'copia',
      motivo: 'Esta conta já tem dados neste aparelho; nada foi alterado.',
    };
  }

  etapa('backup');
  try {
    const pacote = await exportarPacote(origem, { incluirLog: true, incluirAnexos: true });
    await opcoes.baixarBackup(pacote);
  } catch (e) {
    return { tipo: 'falhou', etapa: 'backup', motivo: motivoDe(e) };
  }
  await registro.gravarMeta(chaveMigracao(uid), {
    estado: 'em-andamento',
    origem: origem.db.name,
    iniciadaEm: agora,
  } satisfies MarcaMigracao);

  // Daqui em diante, interrupção (aba fechada) deixa `em-andamento`; a próxima vez refaz do zero.
  etapa('copia');
  await apagarBanco(nomeBanco);
  const identidade = { usuarioId: uid, aparelhoId: origem.ctx.aparelhoId };
  try {
    await copiar(nomeBanco, await lerConteudo(origem.db, origem.ctx.usuarioId), identidade, agora);
  } catch (e) {
    return falhar(registro, uid, nomeBanco, 'copia', motivoDe(e), agora);
  }

  etapa('verificacao');
  let verificado;
  try {
    verificado = await verificar(origem, nomeBanco, uid);
  } catch (e) {
    return falhar(registro, uid, nomeBanco, 'verificacao', motivoDe(e), agora);
  }

  etapa('ativacao');
  const resultado = { tipo: 'concluida' as const, uid, ...verificado };
  await registro.ativar(uid, {
    agora: opcoes.agora,
    meta: {
      [chaveMigracao(uid)]: {
        estado: 'concluida',
        origem: origem.db.name,
        migradoEm: agora,
        resultado,
      } satisfies MarcaMigracao,
      [CHAVE_COPIA_ANTERIOR]: {
        nomeBanco: origem.db.name,
        uid,
        migradoEm: agora,
      } satisfies CopiaAnterior,
    },
  });
  const problema = (await registro.lerMeta(CHAVE_PROBLEMA_MIGRACAO)) as
    { uid?: string } | undefined;
  if (problema?.uid === uid) await registro.apagarMeta(CHAVE_PROBLEMA_MIGRACAO);
  return resultado;
}

/** Falha limpa: apaga o banco novo, tira a marca e registra o Problema no registro de contas. */
async function falhar(
  registro: RegistroDeContas,
  uid: string,
  nomeBanco: string,
  etapa: EtapaMigracao,
  motivo: string,
  em: string,
): Promise<ResultadoMigracao> {
  await apagarBanco(nomeBanco);
  await registro.apagarMeta(chaveMigracao(uid));
  await registro.gravarMeta(CHAVE_PROBLEMA_MIGRACAO, { uid, etapa, motivo, em });
  return { tipo: 'falhou', etapa, motivo };
}

export async function estadoDaMigracao(
  uid: string,
  registro: RegistroDeContas = new RegistroDeContas(),
): Promise<EstadoDaMigracao> {
  return (await lerMarca(registro, uid))?.estado ?? 'nenhuma';
}

/**
 * Depois de entrar: há estudo sem conta a levar para esta conta? Não, se a migração já terminou,
 * se o banco sem conta não existe ou se ele só tem a identidade que nasce ao abrir o app.
 */
export async function haMigracaoPendente(
  uid: string,
  {
    registro = new RegistroDeContas(),
    nomeOrigem = NOME_BANCO_PRINCIPAL,
  }: { registro?: RegistroDeContas; nomeOrigem?: string } = {},
): Promise<boolean> {
  if ((await estadoDaMigracao(uid.toLowerCase(), registro)) === 'concluida') return false;
  // Abrir um banco que não existe o criaria (com identidade nova).
  if (!(await indexedDB.databases()).some((d) => d.name === nomeOrigem)) return false;
  const origem = await Repositorio.abrir({ nomeBanco: nomeOrigem });
  try {
    if (origem.ctx.usuarioId === uid.toLowerCase()) return false;
    const { porColecao } = await preverMigracao(origem);
    return Object.keys(porColecao).some((n) => !IDENTIDADE.includes(n as NomeColecao));
  } finally {
    origem.fechar();
  }
}

export async function copiaAnterior(
  registro: RegistroDeContas = new RegistroDeContas(),
): Promise<CopiaAnterior | null> {
  const valor = (await registro.lerMeta(CHAVE_COPIA_ANTERIOR)) as CopiaAnterior | undefined;
  return valor ?? null;
}

/** Apaga a cópia de antes da conta (só por pedido da pessoa; nunca sozinha). */
export async function apagarCopiaAnterior(
  registro: RegistroDeContas = new RegistroDeContas(),
): Promise<void> {
  const copia = await copiaAnterior(registro);
  if (!copia) return;
  const contas = await registro.listar();
  if (contas.some((c) => c.nomeBanco === copia.nomeBanco)) {
    throw new Error('A cópia anterior aponta para o banco de uma conta; nada foi apagado.');
  }
  // Banco antes da marca: se apagar falhar, a marca fica e dá para tentar de novo.
  await apagarBanco(copia.nomeBanco);
  await registro.apagarMeta(CHAVE_COPIA_ANTERIOR);
}
