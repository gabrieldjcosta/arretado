// O quadro do Fio (`#conteudo`, o `<main class="app">` do mockup): quem desenha por cima dele (a entrada do Destino, as
// folhas que sobem) o acha por aqui. Na primeira carga do app ele ainda não existe quando a tela renderiza, e aparece logo
// depois: por isso a leitura é uma assinatura vazia, que o React refaz a cada renderização.
import { useSyncExternalStore } from 'react';

const semAssinar = () => () => undefined;
const acharQuadro = () => document.getElementById('conteudo');
const semQuadro = () => null;

/** O elemento do quadro, ou `null` enquanto ele não existe. */
export function useQuadroDoFio(): HTMLElement | null {
  return useSyncExternalStore(semAssinar, acharQuadro, semQuadro);
}
