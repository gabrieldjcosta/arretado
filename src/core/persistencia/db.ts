import Dexie, { type Table } from "dexie";
import type { Aparelho, Usuario } from "../identidade/modelo";
import type { Alteracao } from "../log/modelo";
import type { Preferencia } from "../preferencias/modelo";
import type { EntidadeBase } from "./modelo";

/** Estado deste aparelho (id do aparelho atual etc.). Nunca exportado nem sincronizado. */
export interface Meta {
  chave: string;
  valor: unknown;
}

/** Índices de uma tabela, no formato do Dexie (`"id, campo, [a+b]"`). */
export type IndicesPorTabela = Record<string, string>;

/**
 * Esquema por versão: `{ 1: {...}, 2: {...} }`. Cada versão é aplicada em ordem crescente e é
 * idempotente. Uma versão nova nunca reescreve a anterior: declara só o que muda (regra do Dexie).
 */
export type EsquemaVersionado = Record<number, IndicesPorTabela>;

/** Tabelas do próprio Core. Domínios declaram as suas e a raiz de composição junta tudo. */
export const ESQUEMA_CORE: EsquemaVersionado = {
  1: {
    usuarios: "id, atualizadoEm",
    aparelhos: "id, usuarioId, atualizadoEm",
    alteracoes: "++seq, tsLogico, [entidade+entidadeId], usuarioId",
    preferencias: "[usuarioId+chave], usuarioId",
    meta: "chave",
    anexos: "id, usuarioId, [deTipo+deId], excluidoEm",
    tags: "id, usuarioId, nome, excluidoEm",
    fontes: "id, usuarioId, excluidoEm",
    vinculos: "id, usuarioId, [deTipo+deId], [paraTipo+paraId], excluidoEm",
    logsDeImportacao: "id, usuarioId, criadoEm",
    snapshots: "id, usuarioId, criadoEm",
  },
};

/**
 * Banco local (T3). Único lugar do projeto autorizado a importar `dexie`
 * (regra `dexie-so-na-persistencia` do dependency-cruiser).
 *
 * O Core não conhece os domínios: recebe o esquema montado pela raiz de composição
 * (`src/composicao.ts`), que junta `ESQUEMA_CORE` às contribuições de cada domínio.
 */
export class BancoArretado extends Dexie {
  constructor(
    nome: string,
    private readonly esquema: EsquemaVersionado,
  ) {
    super(nome);
    for (const versao of Object.keys(esquema)
      .map(Number)
      .sort((a, b) => a - b)) {
      this.version(versao).stores(esquema[versao] ?? {});
    }
  }

  /** Tabela tipada por nome. Os repositórios a recebem pronta; domínios não chamam isto. */
  tabela<T extends EntidadeBase>(nome: string): Table<T, string> {
    return this.table(nome) as Table<T, string>;
  }

  /** Nomes de todas as tabelas declaradas, em ordem estável (usado pelo pacote de backup). */
  nomesDeTabelas(): string[] {
    const nomes = new Set<string>();
    for (const versao of Object.keys(this.esquema).map(Number).sort()) {
      for (const nome of Object.keys(this.esquema[versao] ?? {})) nomes.add(nome);
    }
    return [...nomes];
  }

  get usuarios(): Table<Usuario, string> {
    return this.tabela<Usuario>("usuarios");
  }

  get aparelhos(): Table<Aparelho, string> {
    return this.tabela<Aparelho>("aparelhos");
  }

  get alteracoes(): Table<Alteracao, number> {
    return this.table("alteracoes") as Table<Alteracao, number>;
  }

  get preferencias(): Table<Preferencia, [string, string]> {
    return this.table("preferencias") as Table<Preferencia, [string, string]>;
  }

  get meta(): Table<Meta, string> {
    return this.table("meta") as Table<Meta, string>;
  }
}

/**
 * Tabelas que **não** entram no pacote de backup:
 * `meta` é estado deste aparelho; `alteracoes` só vai quando o pacote inclui o log (§12.1);
 * `snapshots` são cópias locais de segurança e não se exportam dentro de outra cópia.
 */
export const TABELAS_FORA_DO_PACOTE = ["meta", "alteracoes", "snapshots"] as const;
