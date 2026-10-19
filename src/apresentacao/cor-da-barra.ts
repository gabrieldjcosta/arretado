import type { Tema } from '../core/modelo';

/**
 * A cor da barra do navegador e da moldura do app instalado (meta theme-color): o chão de cada tema,
 * `--areia` e `--noite` em estilos.css. O index.html traz uma meta por `prefers-color-scheme`, para a
 * barra já nascer certa; com o tema escolhido à mão (Conta › Aparência) a escolha vale nas duas, e
 * "Igual ao aparelho" devolve a cada uma a sua cor.
 */
export const COR_DA_BARRA = { claro: '#f1e6d3', escuro: '#0b1b33' } as const;

export function aplicarCorDaBarra(tema: Tema): void {
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const escuro =
      tema === 'sistema'
        ? meta.getAttribute('media')?.includes('dark') === true
        : tema === 'escuro';
    meta.setAttribute('content', COR_DA_BARRA[escuro ? 'escuro' : 'claro']);
  }
}
