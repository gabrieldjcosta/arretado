import Dexie, { cmp, type IndexableType } from 'dexie';
import {
  eAppendOnly,
  ENTIDADES,
  NOMES_CAMPOS_COMUNS,
  type CamposComuns,
  type NomeColecao,
  type OrigemRegistro,
  type RegistroDe,
} from '../modelo';
import { iguais } from '../util/json-canonico';
import type { Alteracao, BancoArretado } from './banco';
import type { Contexto } from './contexto';

/** Campos que o usuário (ou o domínio) fornece; os comuns são controlados aqui. */
export type Dados<N extends NomeColecao> = Omit<RegistroDe<N>, keyof CamposComuns>;
export type Alteracoes<N extends NomeColecao> = Partial<Dados<N>>;

export const LIMITE_MAXIMO_PAGINA = 200;

export interface ConsultaPagina<N extends NomeColecao> {
  /** Índice declarado em ENTIDADES (ou `id`). Padrão: `id`. */
  indice?: string;
  /** Faixa inclusiva sobre o índice; ausente = índice inteiro. */
  de?: IndexableType;
  ate?: IndexableType;
  ordem?: 'asc' | 'desc';
  limite: number;
  cursor?: string | null;
  filtro?: (registro: RegistroDe<N>) => boolean;
  incluirExcluidos?: boolean;
}

export interface Pagina<T> {
  itens: T[];
  proximoCursor: string | null;
}

export class ErroDeValidacao extends Error {
  constructor(
    readonly colecao: NomeColecao,
    readonly problemas: readonly { path: readonly PropertyKey[]; message: string }[],
  ) {
    super(
      `Registro inválido em ${colecao}: ${problemas.map((p) => `${p.path.join('.')}: ${p.message}`).join('; ')}`,
    );
    this.name = 'ErroDeValidacao';
  }
}

interface Cursor {
  k: IndexableType;
  id: string;
}

/**
 * Acesso a uma coleção do usuário atual: toda escrita é validada, carimbada e
 * registrada no log na mesma transação; listagens são sempre paginadas.
 */
export class Colecao<N extends NomeColecao> {
  constructor(
    private readonly ctx: Contexto,
    readonly nome: N,
  ) {}

  private get db(): BancoArretado {
    return this.ctx.db;
  }

  private get tabela() {
    return this.db.tabela(this.nome);
  }

  private validar(registro: unknown): RegistroDe<N> {
    const res = ENTIDADES[this.nome].esquema.safeParse(registro);
    if (!res.success) throw new ErroDeValidacao(this.nome, res.error.issues);
    return res.data as RegistroDe<N>;
  }

  private escrever<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction('rw', [this.tabela, this.db.alteracoes], fn);
  }

  private registrarNoLog(alteracao: Omit<Alteracao, 'aparelhoId' | 'usuarioId' | 'colecao'>) {
    return this.db.alteracoes.add({
      ...alteracao,
      aparelhoId: this.ctx.aparelhoId,
      usuarioId: this.ctx.usuarioId,
      colecao: this.nome,
    });
  }

  /** Emite o evento quando a transação de nível mais alto for confirmada. */
  private aposConfirmar(nome: string, payload: Record<string, unknown>) {
    const idb = Dexie.currentTransaction.idbtrans;
    idb.addEventListener('complete', () => {
      this.ctx.eventos.emitir(nome, payload);
    });
  }

  async criar(
    dados: Dados<N>,
    opcoes: { id?: string; origem?: OrigemRegistro } = {},
  ): Promise<RegistroDe<N>> {
    const instante = this.ctx.agora().toISOString();
    const registro = this.validar({
      ...dados,
      id: opcoes.id ?? this.ctx.novoId(),
      usuarioId: this.ctx.usuarioId,
      criadoEm: instante,
      atualizadoEm: instante,
      tsLogico: this.ctx.relogio.tick(),
      origem: opcoes.origem ?? 'manual',
      excluidoEm: null,
    });
    return this.escrever(async () => {
      if (await this.tabela.get(registro.id)) {
        throw new Error(`Id já existe em ${this.nome}: ${registro.id}`);
      }
      await this.tabela.add(registro);
      await this.registrarNoLog({
        ts: registro.tsLogico,
        registroId: registro.id,
        operacao: 'gravar',
        dados: { ...registro },
      });
      this.aposConfirmar('registro.criado', { colecao: this.nome, id: registro.id });
      return registro;
    });
  }

  async atualizar(id: string, alteracoes: Alteracoes<N>): Promise<RegistroDe<N>> {
    this.proibirSeAppendOnly('atualizar');
    for (const campo of NOMES_CAMPOS_COMUNS) {
      if (campo in alteracoes) throw new Error(`Campo controlado pelo sistema: ${campo}`);
    }
    return this.aplicarAlteracao(id, alteracoes, 'registro.atualizado');
  }

  /** Exclusão lógica (Parte 1 §5.1). */
  async excluir(id: string): Promise<void> {
    this.proibirSeAppendOnly('excluir');
    await this.aplicarAlteracao(
      id,
      { excluidoEm: this.ctx.agora().toISOString() },
      'registro.excluido',
    );
  }

  /** Desfaz a exclusão lógica. */
  async restaurar(id: string): Promise<RegistroDe<N>> {
    this.proibirSeAppendOnly('restaurar');
    return this.aplicarAlteracao(id, { excluidoEm: null }, 'registro.atualizado', true);
  }

  private proibirSeAppendOnly(acao: string) {
    if (eAppendOnly(this.nome))
      throw new Error(`${this.nome} é append-only; não é possível ${acao}.`);
  }

  private aplicarAlteracao(
    id: string,
    alteracoes: Record<string, unknown>,
    evento: string,
    permitirExcluido = false,
  ): Promise<RegistroDe<N>> {
    return this.escrever(async () => {
      const atual = await this.tabela.get(id);
      if (!atual || atual.usuarioId !== this.ctx.usuarioId) {
        throw new Error(`Registro não encontrado em ${this.nome}: ${id}`);
      }
      if (atual.excluidoEm !== null && !permitirExcluido) {
        throw new Error(`Registro excluído em ${this.nome}: ${id}`);
      }
      const carimbos = {
        atualizadoEm: this.ctx.agora().toISOString(),
        tsLogico: this.ctx.relogio.tick(),
      };
      const mesclado: Record<string, unknown> = { ...atual, ...alteracoes, ...carimbos };
      const removidos = Object.keys(alteracoes).filter((k) => alteracoes[k] === undefined);
      for (const k of removidos) Reflect.deleteProperty(mesclado, k);
      const registro = this.validar(mesclado);
      await this.tabela.put(registro);
      const dados: Record<string, unknown> = { ...carimbos };
      for (const [k, v] of Object.entries(alteracoes)) if (v !== undefined) dados[k] = v;
      await this.registrarNoLog({
        ts: carimbos.tsLogico,
        registroId: id,
        operacao: 'atualizar',
        dados,
        ...(removidos.length > 0 ? { removidos } : {}),
      });
      this.aposConfirmar(evento, { colecao: this.nome, id });
      return registro;
    });
  }

  /**
   * Grava registros completos como vieram (importação, restauração, carga sintética):
   * valida cada um, exige que sejam do usuário atual, registra no log e emite um
   * único `registro.lote` após a confirmação. Uso exclusivo do core.
   */
  async gravarLote(registros: readonly unknown[]): Promise<number> {
    const validos = registros.map((r) => this.validar(r));
    for (const r of validos) {
      if (r.usuarioId !== this.ctx.usuarioId) {
        throw new Error(`Registro de outro usuário em ${this.nome}: ${r.id}`);
      }
      this.ctx.relogio.observar(r.tsLogico);
    }
    if (validos.length === 0) return 0;
    return this.escrever(async () => {
      if (eAppendOnly(this.nome)) {
        const existentes = await this.tabela.bulkGet(validos.map((r) => r.id));
        existentes.forEach((e, i) => {
          if (e && !iguais(e, validos[i])) {
            throw new Error(`${this.nome} é append-only; registro ${e.id} não pode mudar.`);
          }
        });
      }
      await this.tabela.bulkPut(validos);
      await this.db.alteracoes.bulkAdd(
        validos.map((r) => ({
          ts: this.ctx.relogio.tick(),
          aparelhoId: this.ctx.aparelhoId,
          usuarioId: this.ctx.usuarioId,
          colecao: this.nome,
          registroId: r.id,
          operacao: 'gravar' as const,
          dados: { ...r },
        })),
      );
      this.aposConfirmar('registro.lote', { colecao: this.nome, quantidade: validos.length });
      return validos.length;
    });
  }

  async obter(
    id: string,
    opcoes: { incluirExcluidos?: boolean } = {},
  ): Promise<RegistroDe<N> | undefined> {
    const r = await this.tabela.get(id);
    if (!r || r.usuarioId !== this.ctx.usuarioId) return undefined;
    if (r.excluidoEm !== null && !opcoes.incluirExcluidos) return undefined;
    return r;
  }

  /** Única forma de listar: sempre paginada, estável e retomável por cursor. */
  async listarPagina(consulta: ConsultaPagina<N>): Promise<Pagina<RegistroDe<N>>> {
    const limite = Math.min(Math.max(1, Math.floor(consulta.limite)), LIMITE_MAXIMO_PAGINA);
    const indice = consulta.indice ?? 'id';
    this.verificarIndice(indice);
    const cursor = consulta.cursor ? (JSON.parse(consulta.cursor) as Cursor) : null;
    const usuarioId = this.ctx.usuarioId;
    const aceitar = (r: RegistroDe<N>) =>
      r.usuarioId === usuarioId &&
      (r.excluidoEm === null || consulta.incluirExcluidos === true) &&
      (consulta.filtro ? consulta.filtro(r) : true);

    const itens =
      consulta.ordem === 'desc'
        ? await this.lerDecrescente(indice, consulta, cursor, limite, aceitar)
        : await this.lerCrescente(indice, consulta, cursor, limite, aceitar);
    const temMais = itens.length > limite;
    if (temMais) itens.pop();
    const ultimo = itens.at(-1);
    return {
      itens,
      proximoCursor:
        temMais && ultimo
          ? JSON.stringify({ k: chaveNoIndice(ultimo, indice), id: ultimo.id } satisfies Cursor)
          : null,
    };
  }

  private onde(indice: string) {
    return this.tabela.where(indice === 'id' ? ':id' : indice);
  }

  /**
   * Ordem crescente em lotes (`getAll`, rápido em qualquer IndexedDB). Registros com a
   * mesma chave de índice ficam em ordem de id; o resto de um grupo de mesma chave é
   * lido pelas chaves primárias, o que garante avanço mesmo quando todas as chaves são iguais.
   */
  private async lerCrescente(
    indice: string,
    consulta: ConsultaPagina<N>,
    cursor: Cursor | null,
    limite: number,
    aceitar: (r: RegistroDe<N>) => boolean,
  ): Promise<RegistroDe<N>[]> {
    const itens: RegistroDe<N>[] = [];
    const cheio = () => itens.length > limite;
    const lote = Math.max(limite + 1, 50);
    let posicao = cursor;
    let de: IndexableType = consulta.de ?? Dexie.minKey;
    let incluirDe = true;
    const ate: IndexableType = consulta.ate ?? Dexie.maxKey;

    for (;;) {
      if (posicao) {
        const { k, id } = posicao;
        const ids = (await this.onde(indice).equals(k).primaryKeys()).filter((x) => x > id);
        for (let i = 0; i < ids.length && !cheio(); i += lote) {
          const regs = await this.tabela.bulkGet(ids.slice(i, i + lote));
          for (const r of regs) {
            if (r && aceitar(r)) itens.push(r);
            if (cheio()) break;
          }
        }
        if (cheio()) break;
        if (cmp(k, ate) >= 0) break;
        de = k;
        incluirDe = false;
      }
      const regs = await this.onde(indice).between(de, ate, incluirDe, true).limit(lote).toArray();
      for (const r of regs) {
        if (aceitar(r)) itens.push(r);
        if (cheio()) break;
      }
      const ultimo = regs.at(-1);
      if (cheio() || !ultimo || regs.length < lote) break;
      posicao = { k: chaveNoIndice(ultimo, indice), id: ultimo.id };
    }
    return itens;
  }

  /** Ordem decrescente por cursor reverso do IndexedDB. */
  private async lerDecrescente(
    indice: string,
    consulta: ConsultaPagina<N>,
    cursor: Cursor | null,
    limite: number,
    aceitar: (r: RegistroDe<N>) => boolean,
  ): Promise<RegistroDe<N>[]> {
    const de = consulta.de ?? Dexie.minKey;
    const ate = cursor ? cursor.k : (consulta.ate ?? Dexie.maxKey);
    return this.onde(indice)
      .between(de, ate, true, true)
      .reverse()
      .filter((r) => {
        if (cursor && cmp(chaveNoIndice(r, indice), cursor.k) === 0 && r.id >= cursor.id) {
          return false;
        }
        return aceitar(r);
      })
      .limit(limite + 1)
      .toArray();
  }

  /** Contagem de registros ativos numa faixa de índice (para contadores discretos). */
  async contar(
    consulta: Pick<ConsultaPagina<N>, 'indice' | 'de' | 'ate' | 'filtro'> = {},
  ): Promise<number> {
    // Percorre em páginas (leitura em lote), mais rápido que cursor com filtro.
    let total = 0;
    let cursor: string | null = null;
    do {
      const p: Pagina<RegistroDe<N>> = await this.listarPagina({
        ...consulta,
        limite: LIMITE_MAXIMO_PAGINA,
        cursor,
      });
      total += p.itens.length;
      cursor = p.proximoCursor;
    } while (cursor);
    return total;
  }

  private verificarIndice(indice: string) {
    const indices: readonly string[] = ENTIDADES[this.nome].indices;
    if (indice !== 'id' && !indices.includes(indice)) {
      throw new Error(`Índice não declarado em ${this.nome}: ${indice}`);
    }
  }
}

/** Valor da chave de um registro num índice simples ou composto (`[a+b]`). */
export function chaveNoIndice(registro: object, indice: string): IndexableType {
  const r = registro as Record<string, unknown>;
  if (indice.startsWith('[')) {
    return indice
      .slice(1, -1)
      .split('+')
      .map((c) => r[c]) as IndexableType;
  }
  return r[indice] as IndexableType;
}
