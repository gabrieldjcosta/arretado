// Worker do app (T17, T18): só a rota /api/buscar-norma?url=…; o resto do site é arquivo estático
// (`assets.run_worker_first: ["/api/*"]`). Repassa os bytes da página sem interpretá-los.
import { buscarPagina, statusDoMotivo } from './regras';

const CABECALHOS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

/** Binding de limite de taxa do Cloudflare (wrangler.jsonc, `ratelimits`); ausente em testes. */
interface Ambiente {
  LIMITADOR?: { limit(opcoes: { key: string }): Promise<{ success: boolean }> };
}

function erro(motivo: string, status: number): Response {
  return Response.json({ erro: motivo }, { status, headers: CABECALHOS });
}

export default {
  async fetch(pedido: Request, ambiente: Ambiente = {}): Promise<Response> {
    const rota = new URL(pedido.url);
    if (rota.pathname !== '/api/buscar-norma') return erro('nao_encontrado', 404);
    if (pedido.method !== 'GET') return erro('metodo_nao_permitido', 405);
    // Só o próprio app chama a rota: o navegador marca o fetch do site com same-origin; uso de outro
    // site (hotlink) ou sem o cabeçalho é recusado. Não impede cliente forjado: o limite abaixo cobre.
    if (pedido.headers.get('Sec-Fetch-Site') !== 'same-origin')
      return erro('origem_nao_permitida', 403);
    const ip = pedido.headers.get('CF-Connecting-IP') ?? 'sem-ip';
    if (ambiente.LIMITADOR && !(await ambiente.LIMITADOR.limit({ key: ip })).success) {
      return erro('muitos_pedidos', 429);
    }
    const resultado = await buscarPagina(rota.searchParams.get('url') ?? '', (url, init) =>
      fetch(url, init),
    );
    if (!resultado.ok) return erro(resultado.motivo, statusDoMotivo(resultado.motivo));
    return new Response(resultado.bytes, {
      headers: {
        ...CABECALHOS,
        'Content-Type': 'application/octet-stream',
        'X-Tipo-Origem': resultado.tipo,
        'X-Url-Final': resultado.urlFinal,
      },
    });
  },
};
