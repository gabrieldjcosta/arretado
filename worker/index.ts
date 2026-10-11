// Worker do app (T17, T18): só a rota /api/buscar-norma?url=…; o resto do site é arquivo estático
// (`assets.run_worker_first: ["/api/*"]`). Repassa os bytes da página sem interpretá-los.
import { buscarPagina, statusDoMotivo } from './regras';

const CABECALHOS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function erro(motivo: string, status: number): Response {
  return Response.json({ erro: motivo }, { status, headers: CABECALHOS });
}

export default {
  async fetch(pedido: Request): Promise<Response> {
    const rota = new URL(pedido.url);
    if (rota.pathname !== '/api/buscar-norma') return erro('nao_encontrado', 404);
    if (pedido.method !== 'GET') return erro('metodo_nao_permitido', 405);
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
