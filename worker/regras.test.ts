import { describe, expect, it, vi } from 'vitest';
import worker from './index';
import { buscarPagina, LIMITE_BYTES, USER_AGENT, validarUrl } from './regras';

const ok = (corpo: string | Uint8Array<ArrayBuffer>, cabecalhos: Record<string, string> = {}) =>
  new Response(corpo, { status: 200, headers: cabecalhos });
const redireciona = (para: string) =>
  new Response(null, { status: 301, headers: { Location: para } });

describe('validarUrl', () => {
  it.each([
    'https://www.planalto.gov.br/ccivil_03/leis/l7210.htm',
    'https://planalto.gov.br/x',
    'https://www.al.sp.gov.br/repositorio/legislacao/lei.html',
    'https://al.sp.gov.br/x',
  ])('aceita %s', (url) => {
    expect(validarUrl(url).ok).toBe(true);
  });

  it.each([
    ['https://planalto.gov.br.exemplo.com/x', 'host_nao_permitido'],
    ['https://xplanalto.gov.br/x', 'host_nao_permitido'],
    ['https://www.planalto.gov.br.exemplo.com/x', 'host_nao_permitido'],
    ['https://exemplo.com/www.planalto.gov.br', 'host_nao_permitido'],
    ['https://sub.www.planalto.gov.br/x', 'host_nao_permitido'],
    ['https://www.planalto.gov.br@exemplo.com/x', 'credenciais_na_url'],
    ['https://www.planalto.gov.br:8443/x', 'porta_nao_permitida'],
    ['https://usuario:senha@www.planalto.gov.br/x', 'credenciais_na_url'],
    ['http://www.planalto.gov.br/x', 'protocolo_nao_https'],
    ['ftp://www.planalto.gov.br/x', 'protocolo_nao_https'],
    ['not a url', 'url_invalida'],
    ['', 'url_ausente'],
  ])('recusa %s (%s)', (url, motivo) => {
    expect(validarUrl(url)).toEqual({ ok: false, motivo });
  });
});

describe('buscarPagina', () => {
  it('envia User-Agent de navegador e não segue redirecionamento sozinho', async () => {
    const buscar = vi.fn().mockResolvedValue(ok('<html>'));
    await buscarPagina('https://www.planalto.gov.br/x', buscar);
    const init = buscar.mock.calls[0]?.[1] as RequestInit;
    const agente = (init.headers as Record<string, string>)['User-Agent'];
    expect(agente).toBe(USER_AGENT);
    expect(agente?.startsWith('Mozilla/5.0')).toBe(true);
    expect(init.redirect).toBe('manual');
  });

  it('devolve os bytes exatos e o tipo de origem', async () => {
    const bytes = new Uint8Array([0x3c, 0xe7, 0xe3, 0x6f, 0x3e]);
    const buscar = vi.fn().mockResolvedValue(ok(bytes, { 'Content-Type': 'text/html' }));
    const r = await buscarPagina('https://www.planalto.gov.br/x', buscar);
    expect(r).toMatchObject({
      ok: true,
      tipo: 'text/html',
      urlFinal: 'https://www.planalto.gov.br/x',
    });
    expect(r.ok && Array.from(r.bytes)).toEqual(Array.from(bytes));
  });

  it('não chama a rede para host fora da lista ou http', async () => {
    const buscar = vi.fn();
    expect(await buscarPagina('https://exemplo.com/x', buscar)).toEqual({
      ok: false,
      motivo: 'host_nao_permitido',
    });
    expect(await buscarPagina('http://www.planalto.gov.br/x', buscar)).toEqual({
      ok: false,
      motivo: 'protocolo_nao_https',
    });
    expect(buscar).not.toHaveBeenCalled();
  });

  it('segue redirecionamento dentro da lista (inclusive relativo)', async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(redireciona('https://www.planalto.gov.br/novo'))
      .mockResolvedValueOnce(redireciona('/final'))
      .mockResolvedValueOnce(ok('ok'));
    const r = await buscarPagina('https://planalto.gov.br/x', buscar);
    expect(r).toMatchObject({ ok: true, urlFinal: 'https://www.planalto.gov.br/final' });
  });

  it.each([
    ['https://exemplo.com/x', 'host_nao_permitido'],
    ['http://www.planalto.gov.br/x', 'protocolo_nao_https'],
    ['https://planalto.gov.br.exemplo.com/x', 'host_nao_permitido'],
  ])('recusa redirecionamento para %s', async (destino, motivo) => {
    const buscar = vi.fn().mockResolvedValueOnce(redireciona(destino));
    expect(await buscarPagina('https://www.planalto.gov.br/x', buscar)).toEqual({
      ok: false,
      motivo,
    });
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('recusa redirecionamento sem Location e laço de redirecionamentos', async () => {
    const sem = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302 }));
    expect(await buscarPagina('https://www.planalto.gov.br/x', sem)).toEqual({
      ok: false,
      motivo: 'redirecionamento_invalido',
    });
    const laco = vi.fn().mockImplementation(() => Promise.resolve(redireciona('/x')));
    expect(await buscarPagina('https://www.planalto.gov.br/x', laco)).toEqual({
      ok: false,
      motivo: 'redirecionamentos_demais',
    });
  });

  it('recusa corpo acima do limite, com ou sem Content-Length', async () => {
    const grande = new Uint8Array(LIMITE_BYTES + 1);
    const semTamanho = vi.fn().mockResolvedValue(ok(grande));
    expect(await buscarPagina('https://www.planalto.gov.br/x', semTamanho)).toEqual({
      ok: false,
      motivo: 'grande_demais',
    });
    const comTamanho = vi
      .fn()
      .mockResolvedValue(ok('x', { 'Content-Length': String(LIMITE_BYTES + 1) }));
    expect(await buscarPagina('https://www.planalto.gov.br/x', comTamanho)).toEqual({
      ok: false,
      motivo: 'grande_demais',
    });
  });

  it('aceita corpo exatamente no limite', async () => {
    const buscar = vi.fn().mockResolvedValue(ok(new Uint8Array(LIMITE_BYTES)));
    expect((await buscarPagina('https://www.planalto.gov.br/x', buscar)).ok).toBe(true);
  });

  it('mapeia status de erro, falha de rede e tempo esgotado', async () => {
    const e404 = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    expect(await buscarPagina('https://www.planalto.gov.br/x', e404)).toEqual({
      ok: false,
      motivo: 'status_erro',
    });
    const rede = vi.fn().mockRejectedValue(new TypeError('falhou'));
    expect(await buscarPagina('https://www.planalto.gov.br/x', rede)).toEqual({
      ok: false,
      motivo: 'falha_de_rede',
    });
    const tempo = vi.fn().mockRejectedValue(new DOMException('t', 'TimeoutError'));
    expect(await buscarPagina('https://www.planalto.gov.br/x', tempo)).toEqual({
      ok: false,
      motivo: 'tempo_esgotado',
    });
  });
});

describe('rota /api/buscar-norma', () => {
  const rota = (caminho: string, init?: RequestInit) =>
    worker.fetch(new Request(`https://arretado.exemplo.workers.dev${caminho}`, init));

  it('repassa os bytes com tipo neutro e cabeçalhos de segurança', async () => {
    const bytes = new Uint8Array([0x3c, 0xe7, 0x3e]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(ok(bytes, { 'Content-Type': 'text/html; charset=iso-8859-1' })),
    );
    const resposta = await rota(
      `/api/buscar-norma?url=${encodeURIComponent('https://www.planalto.gov.br/x')}`,
    );
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(resposta.headers.get('X-Tipo-Origem')).toBe('text/html; charset=iso-8859-1');
    expect(resposta.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(Array.from(new Uint8Array(await resposta.arrayBuffer()))).toEqual(Array.from(bytes));
    vi.unstubAllGlobals();
  });

  it('recusa host fora da lista (403), sem url (400), método e rota errados', async () => {
    const buscar = vi.fn();
    vi.stubGlobal('fetch', buscar);
    expect(
      (await rota(`/api/buscar-norma?url=${encodeURIComponent('https://exemplo.com/')}`)).status,
    ).toBe(403);
    expect((await rota('/api/buscar-norma')).status).toBe(400);
    expect((await rota('/api/buscar-norma?url=x', { method: 'POST' })).status).toBe(405);
    expect((await rota('/api/outra')).status).toBe(404);
    expect(buscar).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
