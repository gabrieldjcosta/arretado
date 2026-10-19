import indexHtml from '../../index.html?raw';
import { COR_DA_BARRA, aplicarCorDaBarra } from './cor-da-barra';

/** As metas theme-color do index.html de verdade, copiadas para o documento do teste. */
function metasDoIndex(): HTMLMetaElement[] {
  const pagina = new DOMParser().parseFromString(indexHtml, 'text/html');
  return Array.from(pagina.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'), (m) => {
    const copia = document.importNode(m, true);
    document.head.append(copia);
    return copia;
  });
}

const cores = (metas: HTMLMetaElement[]) => metas.map((m) => m.content);

afterEach(() => {
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.remove();
});

describe('cor da barra (theme-color)', () => {
  it('o index.html traz uma meta por esquema do aparelho, com essas cores', () => {
    const metas = metasDoIndex();
    expect(metas.map((m) => [m.getAttribute('media'), m.content])).toEqual([
      ['(prefers-color-scheme: light)', COR_DA_BARRA.claro],
      ['(prefers-color-scheme: dark)', COR_DA_BARRA.escuro],
    ]);
  });

  it('tema escolhido à mão vale nas duas metas; "Igual ao aparelho" devolve cada cor', () => {
    const metas = metasDoIndex();
    aplicarCorDaBarra('escuro');
    expect(cores(metas)).toEqual([COR_DA_BARRA.escuro, COR_DA_BARRA.escuro]);
    aplicarCorDaBarra('claro');
    expect(cores(metas)).toEqual([COR_DA_BARRA.claro, COR_DA_BARRA.claro]);
    aplicarCorDaBarra('sistema');
    expect(cores(metas)).toEqual([COR_DA_BARRA.claro, COR_DA_BARRA.escuro]);
  });

  it('sem meta no documento não faz nada', () => {
    expect(() => {
      aplicarCorDaBarra('escuro');
    }).not.toThrow();
  });
});
