// A tela de carregamento do index.html (D-D10, Apêndice F do contrato do Zé). O desenho e o CSS vivem no
// index.html e em public/carregamento.css, sem o pacote; aqui mora só a saída, quando o app tem o que mostrar.
import { movimentoAgora } from './movimento';

const ID = 'carregamento';
/** O CSS esmaece a tela em 160 ms; sai da árvore logo depois. */
const SAIDA_MS = 200;

const saidas = new WeakMap<HTMLElement, Promise<void>>();

/**
 * Tira a tela de carregamento: esmaece, deixa passar o toque e sai da árvore. Idempotente (a mesma
 * promessa) e sempre resolve, inclusive sem a tela (testes, `dev`). Com movimento reduzido sai na hora.
 * Quem precisa da tela fora (a Abertura do Zé) espera a promessa.
 */
export function esconderCarregamento(): Promise<void> {
  const tela = document.getElementById(ID);
  if (!tela) return Promise.resolve();
  let saida = saidas.get(tela);
  if (!saida) {
    saida = new Promise<void>((pronto) => {
      const tirar = () => {
        tela.remove();
        pronto();
      };
      tela.dataset.saindo = '';
      if (movimentoAgora() === 'reduzido') tirar();
      else window.setTimeout(tirar, SAIDA_MS);
    });
    saidas.set(tela, saida);
  }
  return saida;
}
