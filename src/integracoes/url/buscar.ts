// Cliente da rota /api/buscar-norma (T17, 12.3): pede a página ao Worker do app, decodifica no
// aparelho e devolve o HTML. Sanitização e hash ficam com quem importa (mesmo caminho do colar).
import { decodificarPagina } from './decodificar';

export const ROTA_BUSCA = '/api/buscar-norma';

export interface PaginaBuscada {
  html: string;
  /** Endereço final, depois dos redirecionamentos permitidos pelo Worker. */
  urlFinal: string;
}

/** Falha da busca; `message` é frase de interface e a tela sempre oferece colar. */
export class FalhaNaBusca extends Error {
  constructor(
    message: string,
    readonly motivo: string,
  ) {
    super(message);
    this.name = 'FalhaNaBusca';
  }
}

const MENSAGENS: Record<string, string> = {
  url_ausente: 'Digite o endereço da lei.',
  url_invalida: 'Esse endereço não parece válido. Confira e tente de novo.',
  protocolo_nao_https: 'O endereço precisa começar com https://.',
  host_nao_permitido:
    'Só é possível buscar páginas do Planalto (planalto.gov.br) e da ALESP (al.sp.gov.br).',
  porta_nao_permitida: 'Esse endereço não é aceito. Use o endereço normal da página da lei.',
  credenciais_na_url: 'Esse endereço não é aceito. Use o endereço normal da página da lei.',
  redirecionamento_invalido: 'A página mandou para um endereço que não é aceito.',
  redirecionamentos_demais: 'A página mandou de um endereço para outro vezes demais.',
  status_erro: 'A página oficial não respondeu como esperado.',
  grande_demais: 'A página é grande demais para buscar.',
  tempo_esgotado: 'A página oficial demorou demais para responder.',
  falha_de_rede: 'Não foi possível falar com a página oficial.',
};

const SEM_REDE = 'Sem conexão com o servidor do app.';
const COLAR = ' Copie a lei na página oficial e cole abaixo.';

export function mensagemDoMotivo(motivo: string): string {
  return (MENSAGENS[motivo] ?? 'A busca não funcionou.') + COLAR;
}

type Buscar = (entrada: string) => Promise<Response>;

/** `buscar` entra por parâmetro para os testes (o padrão é o `fetch` da própria origem). */
export async function buscarPagina(
  endereco: string,
  buscar: Buscar = (e) =>
    fetch(`${ROTA_BUSCA}?url=${encodeURIComponent(e)}`, { cache: 'no-store' }),
): Promise<PaginaBuscada> {
  const entrada = endereco.trim();
  if (entrada === '') throw new FalhaNaBusca(mensagemDoMotivo('url_ausente'), 'url_ausente');
  let resposta: Response;
  try {
    resposta = await buscar(entrada);
  } catch {
    throw new FalhaNaBusca(SEM_REDE + COLAR, 'sem_rede');
  }
  if (!resposta.ok) {
    let motivo = 'falha_de_rede';
    try {
      const corpo = (await resposta.json()) as { erro?: unknown };
      if (typeof corpo.erro === 'string') motivo = corpo.erro;
    } catch {
      // Resposta que não é do Worker (ex.: o servidor de desenvolvimento): motivo genérico.
    }
    throw new FalhaNaBusca(mensagemDoMotivo(motivo), motivo);
  }
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  const html = decodificarPagina(bytes, resposta.headers.get('X-Tipo-Origem') ?? '');
  if (html.trim() === '') throw new FalhaNaBusca(mensagemDoMotivo('status_erro'), 'status_erro');
  return { html, urlFinal: resposta.headers.get('X-Url-Final') ?? entrada };
}
