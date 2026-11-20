/**
 * Põe o indicador das navs dos lugares sobre o item aceso. Na pílula (celular) ele desliza de lado (`left` e `width`); no
 * menu lateral (PC e tablet), de cima para baixo (`--ind-y` e `--ind-h`, lidos pelo CSS do menu). As duas medidas vão
 * sempre: quem decide qual vale é o CSS da largura. Mede de novo quando a nav muda de tamanho (o menu abrindo ou
 * recolhendo, a janela passando de celular a tablet). Devolve a limpeza para o efeito.
 */
export function medirIndicador(
  nav: HTMLElement | null,
  marca: HTMLElement | null,
  seletor: string,
  opcoes: { imediato?: boolean; semAlvoSome?: boolean } = {},
): (() => void) | undefined {
  if (!nav || !marca) return undefined;
  const medir = () => {
    const alvo = nav.querySelector<HTMLElement>(seletor);
    if (!alvo) {
      if (opcoes.semAlvoSome) marca.style.opacity = '0';
      return;
    }
    if (opcoes.semAlvoSome) marca.style.opacity = '1';
    marca.style.left = `${String(alvo.offsetLeft)}px`;
    marca.style.width = `${String(alvo.offsetWidth)}px`;
    marca.style.setProperty('--ind-y', `${String(alvo.offsetTop)}px`);
    marca.style.setProperty('--ind-h', `${String(alvo.offsetHeight)}px`);
  };
  let quadro = 0;
  if (opcoes.imediato) medir();
  else quadro = window.requestAnimationFrame(medir);
  const vigia = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : undefined;
  vigia?.observe(nav);
  return () => {
    window.cancelAnimationFrame(quadro);
    vigia?.disconnect();
  };
}
