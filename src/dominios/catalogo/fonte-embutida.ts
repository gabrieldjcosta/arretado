import { CarreiraDoCatalogo, IndiceDoCatalogo } from './esquemas';
import { CatalogoIndisponivel, type FonteDoCatalogo } from './fonte';

type Carregador = () => Promise<unknown>;

// Cada carreira vira um bloco separado do pacote (import dinâmico): só baixa a que for aberta.
// Carreira nova = arquivo novo em corpus/catalogo/, sem mexer neste código.
const indiceEmbutido = import.meta.glob('../../../corpus/catalogo/index.json', {
  import: 'default',
}) as Record<string, Carregador>;
const carreirasEmbutidas = import.meta.glob(
  ['../../../corpus/catalogo/*.json', '!../../../corpus/catalogo/index.json'],
  { import: 'default' },
) as Record<string, Carregador>;

function nomeDoArquivo(caminho: string): string {
  return caminho.slice(caminho.lastIndexOf('/') + 1);
}

/** Catálogo versionado no app (local-first): nada depende de rede. */
export class FonteEmbutida implements FonteDoCatalogo {
  constructor(
    private readonly indice: Record<string, Carregador> = indiceEmbutido,
    private readonly carreiras: Record<string, Carregador> = carreirasEmbutidas,
  ) {}

  async listar(): Promise<IndiceDoCatalogo> {
    const carregar = Object.values(this.indice)[0];
    if (!carregar) throw new CatalogoIndisponivel('nao_encontrado', 'index.json');
    const r = IndiceDoCatalogo.safeParse(await carregar());
    if (!r.success) throw new CatalogoIndisponivel('formato_invalido', 'index.json');
    return r.data;
  }

  async obter(slug: string): Promise<CarreiraDoCatalogo> {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
      throw new CatalogoIndisponivel('nao_encontrado', slug);
    }
    const arquivo = `${slug}.json`;
    const caminho = Object.keys(this.carreiras).find((c) => nomeDoArquivo(c) === arquivo);
    const carregar = caminho ? this.carreiras[caminho] : undefined;
    if (!carregar) throw new CatalogoIndisponivel('nao_encontrado', slug);
    let bruto: unknown;
    try {
      bruto = await carregar();
    } catch {
      throw new CatalogoIndisponivel('indisponivel', slug);
    }
    const r = CarreiraDoCatalogo.safeParse(bruto);
    if (!r.success || r.data.slug !== slug)
      throw new CatalogoIndisponivel('formato_invalido', arquivo);
    return r.data;
  }
}
