/**
 * A tecla não é de atalho de tela: veio com Ctrl, Alt ou Cmd (do navegador e do sistema), no meio
 * de uma composição (acento, teclado do celular), ou o foco está num campo de texto ou num diálogo
 * aberto, a quem ela pertence (ver solucao-de-problemas.md › "Atalho de teclado rouba a tecla").
 */
export function teclaForaDosAtalhos(e: KeyboardEvent): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return true;
  const alvo = e.target instanceof Element ? e.target : null;
  return !!alvo?.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog[open]',
  );
}
