import { buscarPagina, FalhaNaBusca } from './buscar';

const resposta = (corpo: BodyInit | null, init?: ResponseInit) =>
  Promise.resolve(new Response(corpo, init));

describe('buscarPagina (12.3)', () => {
  it('decodifica windows-1252 e devolve o endereço final', async () => {
    const bytes = Uint8Array.from([
      0x3c, 0x70, 0x3e, 0x41, 0x72, 0x74, 0x2e, 0x20, 0xba, 0x3c, 0x2f, 0x70, 0x3e,
    ]);
    const r = await buscarPagina(' https://www.planalto.gov.br/x.htm ', (e) => {
      expect(e).toBe('https://www.planalto.gov.br/x.htm');
      return resposta(bytes, {
        headers: {
          'X-Tipo-Origem': 'text/html',
          'X-Url-Final': 'https://www.planalto.gov.br/y.htm',
        },
      });
    });
    expect(r).toEqual({ html: '<p>Art. º</p>', urlFinal: 'https://www.planalto.gov.br/y.htm' });
  });

  it('motivo do Worker vira frase com o caminho de colar', async () => {
    const f = buscarPagina('https://exemplo.com/', () =>
      resposta(JSON.stringify({ erro: 'host_nao_permitido' }), { status: 403 }),
    );
    await expect(f).rejects.toThrow(FalhaNaBusca);
    await expect(f).rejects.toMatchObject({
      motivo: 'host_nao_permitido',
      message: expect.stringContaining('cole') as unknown,
    });
  });

  it('sem rede, resposta que não é do Worker e endereço vazio falham sem exceção solta', async () => {
    await expect(
      buscarPagina('https://a.b', () => Promise.reject(new Error('x'))),
    ).rejects.toMatchObject({ motivo: 'sem_rede' });
    await expect(
      buscarPagina('https://a.b', () => resposta('<html>', { status: 404 })),
    ).rejects.toMatchObject({ motivo: 'falha_de_rede' });
    await expect(buscarPagina('  ', () => resposta('x'))).rejects.toMatchObject({
      motivo: 'url_ausente',
    });
    await expect(buscarPagina('https://a.b', () => resposta(''))).rejects.toMatchObject({
      motivo: 'status_erro',
    });
  });
});
