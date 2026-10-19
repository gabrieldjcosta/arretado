import { jsonCanonico } from '../../core/util/json-canonico';
import type { EntradaDoIndice, IndiceDoAcervo, ItemDoAcervo, VinculoSugerido } from './esquemas';
import { FonteIndisponivel, type FonteDoAcervo } from './fonte';
import { hashDoItem } from './hash';

/** Fonte falsa para testes e para o E2E: itens em memória, índice montado com hash correto. */
export class FonteEmMemoria implements FonteDoAcervo {
  readonly pedidos: string[] = [];
  /** Ids que `obter` recusa (falha de rede simulada). */
  readonly falhas = new Set<string>();

  private constructor(
    private readonly indice: IndiceDoAcervo,
    private readonly itens: Map<string, ItemDoAcervo>,
    /** Versões guardadas por hash (os arquivos imutáveis da fonte estática). */
    private readonly historico: Map<string, ItemDoAcervo> = new Map(),
  ) {}

  static async criar(
    entradas: readonly {
      item: ItemDoAcervo;
      grupo?: string;
      vinculos?: VinculoSugerido[];
      avisos?: string[];
    }[],
    opcoes: { historico?: readonly ItemDoAcervo[] } = {},
  ): Promise<FonteEmMemoria> {
    const itens = new Map<string, ItemDoAcervo>();
    const lista: EntradaDoIndice[] = [];
    for (const { item, grupo, vinculos, avisos } of entradas) {
      itens.set(item.id, item);
      lista.push({
        id: item.id,
        tipo: item.norma.especie ?? 'norma',
        titulo: item.norma.tituloCurto,
        grupo: grupo ?? 'Leis federais',
        vinculos: vinculos ?? [],
        avisos: avisos ?? [],
        tamanho: new TextEncoder().encode(jsonCanonico(item)).length,
        versao: item.versao,
        hash: await hashDoItem(item),
        coletadoEm: '2026-10-10',
      });
    }
    return new FonteEmMemoria(
      { formato: 'arretado-acervo', versaoIndice: 1, geradoEm: '2026-10-10', itens: lista },
      itens,
      new Map(
        await Promise.all(
          (opcoes.historico ?? []).map(async (i): Promise<[string, ItemDoAcervo]> => [
            await hashDoItem(i),
            i,
          ]),
        ),
      ),
    );
  }

  listar(): Promise<IndiceDoAcervo> {
    this.pedidos.push('indice');
    return Promise.resolve(this.indice);
  }

  obter(id: string): Promise<ItemDoAcervo> {
    this.pedidos.push(id);
    const item = this.itens.get(id);
    if (this.falhas.has(id)) return Promise.reject(new FonteIndisponivel('sem_rede'));
    if (!item) return Promise.reject(new FonteIndisponivel('nao_encontrado', id));
    return Promise.resolve(item);
  }

  obterVersao(id: string, hash: string): Promise<ItemDoAcervo> {
    this.pedidos.push(`${id}@${hash.slice(0, 8)}`);
    const item = this.historico.get(hash);
    if (item?.id !== id) return Promise.reject(new FonteIndisponivel('nao_encontrado', id));
    return Promise.resolve(item);
  }

  /** Troca o corpo de um item sem refazer o índice (hash do índice deixa de bater). */
  adulterar(id: string, item: ItemDoAcervo): void {
    this.itens.set(id, item);
  }
}
