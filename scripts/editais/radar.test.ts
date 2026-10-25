// @vitest-environment node
import { comparar, extrairLinks, rodar } from './radar.mjs';

const fonte = {
  id: 'fcc-dpeba',
  orgao: 'DPE-BA',
  banca: 'FCC',
  url: 'https://x.org/c/',
  tipo: 'edital' as const,
};
const pagina = (...hrefs: string[]) => hrefs.map((h) => `<a href="${h}">x</a>`).join('');

describe('radar de editais', () => {
  it('extrai só PDFs, absolutiza e tira duplicata', () => {
    const html = pagina('a.pdf', '/b.PDF?v=1', 'a.pdf', 'index.html', '#topo');
    expect(extrairLinks(html, 'https://x.org/c/')).toEqual([
      'https://x.org/b.PDF?v=1',
      'https://x.org/c/a.pdf',
    ]);
  });

  it('primeira leitura é linha de base e não alerta', () => {
    const r = comparar({}, [{ fonte, links: ['https://x.org/a.pdf'] }], '2026-10-25');
    expect(r.fila).toEqual([]);
    expect(r.novoEstado[fonte.id].links).toEqual(['https://x.org/a.pdf']);
  });

  it('link novo vira retificado (edital) ou novo (indice)', () => {
    const estado = { [fonte.id]: { links: ['https://x.org/a.pdf'], lidoEm: '2026-10-24' } };
    const leitura = { fonte, links: ['https://x.org/a.pdf', 'https://x.org/ret.pdf'] };
    expect(comparar(estado, [leitura], '2026-10-25').fila[0]).toMatchObject({
      tipo: 'retificado',
      url: 'https://x.org/ret.pdf',
    });
    const indice = { ...fonte, tipo: 'indice' as const };
    expect(comparar(estado, [{ ...leitura, fonte: indice }], '2026-10-25').fila[0].tipo).toBe(
      'novo',
    );
  });

  it('fonte que falha vira aviso e mantém o estado anterior', async () => {
    const estado = { [fonte.id]: { links: ['https://x.org/a.pdf'], lidoEm: '2026-10-24' } };
    const r = await rodar({
      fontes: [fonte],
      estado,
      hoje: '2026-10-25',
      buscar: () => Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('') }),
    });
    expect(r.avisos).toEqual(['fcc-dpeba: HTTP 403']);
    expect(r.novoEstado).toEqual(estado);
  });
});
