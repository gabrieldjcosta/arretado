import Dexie, { type Table } from 'dexie';
import { colecoesNaVersao, ENTIDADES, type NomeColecao, type RegistroDe } from '../modelo';

/**
 * Versão do esquema local; sobe a cada migração (Parte 1 §7.2).
 * v1: F0/F1. v2: `leituras` (F2, 9.1), só coleção nova, sem transformar registro.
 * v3: `vetado` em `Dispositivo.status` (F2, 8.10), sem índice nem coleção nova e sem transformar
 * registro (o gravado antes continua `vigente` com "(VETADO)"). Sobe para o app anterior recusar o
 * pacote novo com "atualize o app" (em vez de "arquivo alterado" no primeiro vetado) e para a aba
 * aberta com ele recarregar antes de ler um status que não conhece.
 *
 * v4: `vinculosDisciplina` (acervo, Peça 3) e `Norma.especie` / `Norma.origemAcervo` opcionais; só
 * coleção nova, sem transformar registro. Backup do Gabriel antes do merge; recarregar as abas.
 * v5: `pendenciasReleitura` (acervo, Peça 6a); só coleção nova, sem transformar registro.
 * v6: `frases` e `revisoesFrase` (Frases 1, D25, T22); `Erro.oQueFoi` opcional; `Cartao.tipo`,
 * `ocultos`, `fraseId` e origens `frase`/`ia`. Sem índice novo em coleção antiga e sem
 * transformar registro no upgrade: a Frase de cada erro antigo nasce depois de abrir, pelas
 * coleções (log e relógio lógico), em `migrarFrasesDosErros`. Backup do Gabriel antes do merge.
 *
 * v7: F3 (Hoje, Sessão, Plano acionável): `tarefasDeEstudo`; `Sessao.alvo`, `fronteira`,
 * `proximoPasso`, `estacionamento`, `origemDaAcao`, `tarefaId`, `temporizadorMin`;
 * `Preferencias.perfilDeEstudo`, `perfilAnterior`, `modoSoEstudo`, `temporizadorPadraoMin`;
 * `frase` e `tarefa` em `TipoItem`. Só coleção nova e campos opcionais: sem índice novo em coleção
 * antiga e sem transformar registro. Tudo da F3-A e da F3-B já está aqui, para não subir de novo.
 * Backup do Gabriel antes do merge no `main`; recarregar as abas.
 */
/**
 * v8: F3-C (Precedentes): `vinculosPrecedenteDispositivo` e `vinculosEntrePrecedentes`;
 * `Precedente.trechosChave` e `favorito`. Só coleção nova e campos opcionais: sem índice novo em
 * coleção antiga e sem transformar registro. Backup do Gabriel antes do merge; recarregar as abas.
 */
/**
 * v9: Ciclo de estudo: coleção `ciclos` e `Sessao.cicloId`/`blocoOrdem` (opcionais). Só coleção
 * nova e campos opcionais: sem índice novo em coleção antiga e sem transformar registro. Backup do
 * Gabriel antes do merge no `main`; recarregar as abas.
 */
/**
 * v10: F4-B (B2s), tabela interna `conflitos` (Conta › Conflitos: duas versões do mesmo registro
 * vindas da sincronização, nunca sobrescritas em silêncio). Interna como `alteracoes` e `meta`: não
 * é entidade, não entra no pacote nem sobe ao servidor. Sem coleção nova, índice novo em coleção
 * antiga nem transformação de registro. Backup do Gabriel antes do merge no `main`; recarregar as abas.
 */
export const VERSAO_ESQUEMA = 10;

export const NOME_BANCO_PRINCIPAL = 'arretado';

/** Entrada do log de alterações (append-only; base de sync, desfazer e auditoria). */
export interface Alteracao {
  seq?: number;
  ts: string;
  aparelhoId: string;
  usuarioId: string;
  colecao: NomeColecao;
  registroId: string;
  /**
   * `gravar` = registro completo; `atualizar` = campos alterados; `remover` = apagamento físico;
   * `acervo-adesao` = árvore de um item do acervo por referência (`dados` = `ReferenciaDeAcervo`;
   * os registros vêm da fonte do acervo, ver `lote-acervo.ts`).
   */
  operacao: 'gravar' | 'atualizar' | 'remover' | 'acervo-adesao';
  dados?: Record<string, unknown>;
  removidos?: string[];
  /**
   * `ts` do registro como o servidor o tinha quando a pessoa resolveu um Conflito (F4-B, B3). Só a
   * resolução grava; sem ele o envio usa o `ts` da entrada anterior do mesmo registro neste log.
   */
  baseTs?: string | null;
}

/**
 * Divergência recebida na sincronização (plano F4-B §5): o registro local fica como está e a versão
 * do outro aparelho espera aqui até a pessoa escolher. `resolvidoEm` marca o item como decidido.
 */
export interface Conflito {
  id: string;
  colecao: NomeColecao;
  registroId: string;
  /** Registro como está neste aparelho (`null` = apagado aqui). */
  minha: Record<string, unknown> | null;
  /** Versão que veio do outro aparelho (`null` = apagada lá). */
  deles: Record<string, unknown> | null;
  aparelhoDeles: string;
  /** Carimbo lógico (T7) da versão que veio. */
  tsDeles: string;
  criadoEm: string;
  resolvidoEm?: string;
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

/** Esquema completo de uma versão: as coleções que já existiam nela, mais as tabelas internas. */
export function esquemaDaVersao(versao: number): Record<string, string> {
  const stores: Record<string, string> = {};
  for (const nome of colecoesNaVersao(versao)) {
    stores[nome] = ['id', ...ENTIDADES[nome].indices].join(', ');
  }
  stores.alteracoes = '++seq, ts, usuarioId, [colecao+registroId]';
  stores.meta = 'chave';
  if (versao >= 10) stores.conflitos = 'id, [colecao+registroId], resolvidoEm';
  stores.anexosConteudo = 'id';
  stores.snapshotsConteudo = 'id';
  return stores;
}

/** Por que outra aba fechou esta conexão: esquema novo ou banco apagado. */
export type MotivoFechamento = 'versao' | 'apagado';

export class BancoArretado extends Dexie {
  alteracoes!: Table<Alteracao, number>;
  meta!: Table<EntradaMeta, string>;
  conflitos!: Table<Conflito, string>;
  anexosConteudo!: Table<Conteudo, string>;
  snapshotsConteudo!: Table<Conteudo, string>;

  constructor(nome: string = NOME_BANCO_PRINCIPAL) {
    super(nome);
    // Migrações idempotentes: cada versão declara o esquema completo e, se preciso, um upgrade.
    // Coleção nova não pede upgrade: o IndexedDB cria a tabela vazia e mantém as outras.
    for (let v = 1; v <= VERSAO_ESQUEMA; v++) this.version(v).stores(esquemaDaVersao(v));
    // Outra aba subiu o esquema ou apagou o banco: esta conexão fecha para não travar a outra.
    this.on('versionchange', (ev: IDBVersionChangeEvent) => {
      this.close();
      const motivo = ev.newVersion === null ? 'apagado' : 'versao';
      for (const aviso of this.avisosDeTroca) aviso(motivo);
      return false;
    });
  }

  private readonly avisosDeTroca = new Set<(motivo: MotivoFechamento) => void>();

  /** Avisa quando outra aba sobe o esquema ou apaga o banco (esta aba precisa recarregar). */
  aoFecharPorOutraAba(aviso: (motivo: MotivoFechamento) => void): () => void {
    this.avisosDeTroca.add(aviso);
    return () => this.avisosDeTroca.delete(aviso);
  }

  tabela<N extends NomeColecao>(nome: N): Table<RegistroDe<N>, string> {
    return this.table(nome);
  }
}

/** Apaga um banco local inteiro (apagar tudo; remover espaço separado). */
export function apagarBanco(nome: string): Promise<void> {
  return Dexie.delete(nome);
}

/** O banco existe? Sem criá-lo e sem `indexedDB.databases()`, que falta em navegadores antigos. */
export function bancoExiste(nome: string): Promise<boolean> {
  return Dexie.exists(nome);
}
