// A fonte dos arquivos do Mapa da norma: estáticos, servidos pelo app como o acervo
// (`/incidencia/indice.json` e `/incidencia/<recorte>/<item do acervo>.json`). O que a rede entrega
// fica guardado no aparelho (Cache Storage, sem service worker) e volta de lá quando a rede falta:
// depois do primeiro download, o mapa abre sem rede. Nada aqui grava no banco da pessoa.
import { IndiceDeIncidencia, MapaDeIncidencia, type RecorteDeIncidencia } from './mapa-da-norma';

export type MotivoIncidenciaIndisponivel = 'sem_rede' | 'nao_encontrado' | 'formato_invalido';

export class IncidenciaIndisponivel extends Error {
  constructor(
    readonly motivo: MotivoIncidenciaIndisponivel,
    detalhe?: string,
  ) {
    super(detalhe === undefined ? motivo : `${motivo}: ${detalhe}`);
    this.name = 'IncidenciaIndisponivel';
  }
}

export interface Carregado<T> {
  dados: T;
  /** De onde veio: da rede agora, ou do que ficou guardado no aparelho. */
  origem: 'rede' | 'aparelho';
}

export interface MapaDaNormaCarregado extends Carregado<MapaDeIncidencia> {
  recorte: RecorteDeIncidencia;
}

const NOME_DO_GUARDADO = 'arretado-incidencia-v1';
const ID = /^[a-z0-9][a-z0-9-]{0,127}$/;

/** O guardado do aparelho, se o navegador o tem (não em janela privada antiga nem no jsdom). */
async function guardadoDoAparelho(): Promise<Cache | undefined> {
  try {
    return typeof caches === 'undefined' ? undefined : await caches.open(NOME_DO_GUARDADO);
  } catch {
    return undefined;
  }
}

export class FonteDeIncidencia {
  constructor(
    private readonly base: string = '/incidencia',
    private readonly buscar: typeof fetch = (...a) => fetch(...a),
    private readonly guardado: () => Promise<Cache | undefined> = guardadoDoAparelho,
  ) {}

  private endereco(caminho: string): string {
    return `${this.base.replace(/\/$/, '')}/${caminho}`;
  }

  /** Rede primeiro (e guarda a cópia); sem rede, a cópia guardada; sem as duas, `sem_rede`. */
  private async json(caminho: string): Promise<Carregado<unknown>> {
    const endereco = this.endereco(caminho);
    let resposta: Response | undefined;
    try {
      resposta = await this.buscar(endereco);
    } catch {
      resposta = undefined;
    }
    if (resposta?.status === 404) throw new IncidenciaIndisponivel('nao_encontrado', caminho);
    if (resposta?.ok) {
      const copia = resposta.clone();
      let dados: unknown;
      try {
        dados = await resposta.json();
      } catch {
        throw new IncidenciaIndisponivel('formato_invalido', caminho);
      }
      // Guardar é conveniência: se falhar, o mapa de agora não muda.
      const guardado = await this.guardado();
      await guardado?.put(endereco, copia).catch(() => undefined);
      return { dados, origem: 'rede' };
    }
    const guardado = await this.guardado();
    const copia = await guardado?.match(endereco).catch(() => undefined);
    if (!copia) throw new IncidenciaIndisponivel('sem_rede', caminho);
    try {
      return { dados: await copia.json(), origem: 'aparelho' };
    } catch {
      throw new IncidenciaIndisponivel('formato_invalido', caminho);
    }
  }

  async indice(): Promise<Carregado<IndiceDeIncidencia>> {
    const { dados, origem } = await this.json('indice.json');
    const r = IndiceDeIncidencia.safeParse(dados);
    if (!r.success) throw new IncidenciaIndisponivel('formato_invalido', 'indice.json');
    return { dados: r.data, origem };
  }

  async mapa(recorte: string, norma: string): Promise<Carregado<MapaDeIncidencia>> {
    if (!ID.test(recorte) || !ID.test(norma)) {
      throw new IncidenciaIndisponivel('nao_encontrado', `${recorte}/${norma}`);
    }
    const caminho = `${recorte}/${norma}.json`;
    const { dados, origem } = await this.json(caminho);
    const r = MapaDeIncidencia.safeParse(dados);
    if (!r.success || r.data.norma !== norma || r.data.recorte !== recorte) {
      throw new IncidenciaIndisponivel('formato_invalido', caminho);
    }
    return { dados: r.data, origem };
  }

  /**
   * O recorte que tem a norma (hoje um só; com vários, o primeiro do índice), sem baixar o mapa.
   * `undefined` quando nenhum recorte a cita: a norma fica sem mapa, sem erro.
   */
  async recorteDaNorma(normaDoAcervo: string): Promise<RecorteDeIncidencia | undefined> {
    const { dados } = await this.indice();
    return dados.recortes.find((r) => r.normas.includes(normaDoAcervo));
  }

  /** O mapa da norma no recorte que a tem, ou `undefined` se nenhum tem. */
  async mapaDaNorma(normaDoAcervo: string): Promise<MapaDaNormaCarregado | undefined> {
    const recorte = await this.recorteDaNorma(normaDoAcervo);
    if (!recorte) return undefined;
    const mapa = await this.mapa(recorte.id, normaDoAcervo);
    return { ...mapa, recorte };
  }
}
