import { FonteDeIncidencia, IncidenciaIndisponivel } from './incidencia-fonte';

const INDICE = {
  versao: 1,
  recortes: [
    { id: 'fcc-defensor-sp', titulo: 'FCC × Defensor Público (SP)', questoes: 829, normas: ['cp'] },
  ],
};
const MAPA = {
  versao: 1,
  recorte: 'fcc-defensor-sp',
  norma: 'cp',
  artigos: [['157', 2.5, 'altissima']],
};

/** Um Cache de brinquedo: guarda por endereço. */
function guardadoFalso() {
  const itens = new Map<string, string>();
  const cache = {
    put: async (url: string, r: Response) => {
      itens.set(url, await r.text());
    },
    match: (url: string) => {
      const corpo = itens.get(url);
      return Promise.resolve(corpo === undefined ? undefined : new Response(corpo));
    },
  } as unknown as Cache;
  return { cache, itens };
}

const servidor =
  (arquivos: Record<string, unknown>, falhar = false): typeof fetch =>
  (entrada) => {
    if (falhar) return Promise.reject(new TypeError('sem rede'));
    const url =
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const corpo = arquivos[url];
    return Promise.resolve(
      corpo === undefined
        ? new Response('não', { status: 404 })
        : new Response(JSON.stringify(corpo), { status: 200 }),
    );
  };

describe('fonte de incidência', () => {
  const arquivos = {
    '/incidencia/indice.json': INDICE,
    '/incidencia/fcc-defensor-sp/cp.json': MAPA,
  };

  it('lê o índice e o mapa da rede, guarda no aparelho e volta de lá sem rede', async () => {
    const { cache, itens } = guardadoFalso();
    const comRede = new FonteDeIncidencia('/incidencia', servidor(arquivos), () =>
      Promise.resolve(cache),
    );
    const mapa = await comRede.mapaDaNorma('cp');
    expect(mapa?.origem).toBe('rede');
    expect(mapa?.recorte.titulo).toBe('FCC × Defensor Público (SP)');
    expect(mapa?.dados.artigos).toEqual([['157', 2.5, 'altissima']]);
    expect([...itens.keys()].sort()).toEqual([
      '/incidencia/fcc-defensor-sp/cp.json',
      '/incidencia/indice.json',
    ]);

    const semRede = new FonteDeIncidencia('/incidencia', servidor(arquivos, true), () =>
      Promise.resolve(cache),
    );
    const guardado = await semRede.mapaDaNorma('cp');
    expect(guardado?.origem).toBe('aparelho');
    expect(guardado?.dados.norma).toBe('cp');
  });

  it('sem rede e sem cópia, diz sem_rede; norma fora do índice fica sem mapa, sem erro', async () => {
    const semNada = new FonteDeIncidencia('/incidencia', servidor(arquivos, true), () =>
      Promise.resolve(undefined),
    );
    await expect(semNada.indice()).rejects.toMatchObject({ motivo: 'sem_rede' });
    const comRede = new FonteDeIncidencia('/incidencia', servidor(arquivos), () =>
      Promise.resolve(undefined),
    );
    expect(await comRede.mapaDaNorma('outra')).toBeUndefined();
    expect(await comRede.recorteDaNorma('cp')).toMatchObject({ id: 'fcc-defensor-sp' });
  });

  it('recusa arquivo fora do formato, id estranho e mapa de outra norma', async () => {
    const torto = new FonteDeIncidencia(
      '/incidencia',
      servidor({
        '/incidencia/indice.json': { versao: 2 },
        '/incidencia/r/n.json': { ...MAPA, recorte: 'r', norma: 'x' },
      }),
      () => Promise.resolve(undefined),
    );
    await expect(torto.indice()).rejects.toBeInstanceOf(IncidenciaIndisponivel);
    await expect(torto.mapa('r', 'n')).rejects.toMatchObject({ motivo: 'formato_invalido' });
    await expect(torto.mapa('../r', 'n')).rejects.toMatchObject({ motivo: 'nao_encontrado' });
    await expect(torto.mapa('r', 'faltando')).rejects.toMatchObject({ motivo: 'nao_encontrado' });
  });
});
