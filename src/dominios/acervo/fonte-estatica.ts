import { IndiceDoAcervo, ItemDoAcervo, PacoteDePartida } from './esquemas';
import { FonteIndisponivel, type FonteDoAcervo } from './fonte';

/** Acervo como arquivos estáticos: `<base>/indice.json` e `<base>/<id>.json`. */
export class FonteEstatica implements FonteDoAcervo {
  constructor(
    private readonly base: string = '/acervo',
    private readonly buscar: typeof fetch = (...a) => fetch(...a),
  ) {}

  private async json(caminho: string): Promise<unknown> {
    let resposta: Response;
    try {
      resposta = await this.buscar(`${this.base.replace(/\/$/, '')}/${caminho}`);
    } catch {
      throw new FonteIndisponivel('sem_rede');
    }
    if (resposta.status === 404) throw new FonteIndisponivel('nao_encontrado', caminho);
    if (!resposta.ok) throw new FonteIndisponivel('sem_rede', String(resposta.status));
    try {
      return (await resposta.json()) as unknown;
    } catch {
      throw new FonteIndisponivel('formato_invalido', caminho);
    }
  }

  async listar(): Promise<IndiceDoAcervo> {
    const r = IndiceDoAcervo.safeParse(await this.json('indice.json'));
    if (!r.success) throw new FonteIndisponivel('formato_invalido', 'indice.json');
    return r.data;
  }

  async obter(id: string): Promise<ItemDoAcervo> {
    if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(id)) throw new FonteIndisponivel('nao_encontrado', id);
    const r = ItemDoAcervo.safeParse(await this.json(`${id}.json`));
    if (!r.success) throw new FonteIndisponivel('formato_invalido', `${id}.json`);
    return r.data;
  }

  async pacoteDePartida(): Promise<PacoteDePartida> {
    const r = PacoteDePartida.safeParse(await this.json('pacote-de-partida.json'));
    if (!r.success) throw new FonteIndisponivel('formato_invalido', 'pacote-de-partida.json');
    return r.data;
  }

  /** Versão guardada ao publicar outra: `<base>/historico/<id>.<hash>.json` (imutável). */
  async obterVersao(id: string, hash: string): Promise<ItemDoAcervo> {
    if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(id) || !/^[0-9a-f]{64}$/.test(hash)) {
      throw new FonteIndisponivel('nao_encontrado', id);
    }
    const caminho = `historico/${id}.${hash}.json`;
    const r = ItemDoAcervo.safeParse(await this.json(caminho));
    if (!r.success) throw new FonteIndisponivel('formato_invalido', caminho);
    return r.data;
  }
}
