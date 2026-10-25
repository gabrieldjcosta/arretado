// O traço de seleção (D-D7, "A caneta que desenha"): uma linha fina que se desenha em volta do item
// que acabou de ser escolhido, com a ponta de luz à frente, some e deixa o item como estava. Imperativo
// de propósito: o React só dá o <svg> vazio dentro do item, e esta função enche e esvazia.
import { curva, documentoInativo, movimentoAgora, type Movimento } from '../../movimento';

const NS = 'http://www.w3.org/2000/svg';
/** O <svg> é 3 px maior que o item de cada lado: sobra lugar para a ponta de luz e o contorno dela. */
const MARGEM = 3;
const DESENHA_MS = 240;
const SEGURA_MS = 120;
const SOME_MS = 260;
const ESMAECE_MS = 380;

const nada = () => undefined;

/**
 * Desenha o traço em volta do item (o pai do `svg`). `normal`: o fio se desenha em 240 ms, a ponta
 * anda à frente, o conjunto espera 120 ms e some em 260 ms. `calmo`: o contorno inteiro só aparece e
 * esmaece, sem andar (380 ms). `reduzido`: nada. Devolve quem cancela e deixa o `svg` vazio.
 */
export function tracar(svg: SVGSVGElement, movimento: Movimento = movimentoAgora()): () => void {
  const item = svg.parentElement;
  if (movimento === 'reduzido' || !item) return nada;
  const largura = item.offsetWidth;
  const altura = item.offsetHeight;
  if (largura === 0 || altura === 0 || typeof svg.animate !== 'function') return nada;

  const raio = Math.min(
    Number.parseFloat(getComputedStyle(item).borderTopLeftRadius) || 0,
    altura / 2,
  );
  // O <svg> parte da borda de dentro do item; somar a espessura dela faz o fio rodear a borda toda.
  svg.style.left = `${String(-(MARGEM + item.clientLeft))}px`;
  svg.style.top = `${String(-(MARGEM + item.clientTop))}px`;
  svg.setAttribute('width', String(largura + 2 * MARGEM));
  svg.setAttribute('height', String(altura + 2 * MARGEM));
  // Parado, o <svg> não ocupa lugar nenhum: só existe enquanto o traço se desenha.
  svg.dataset.ativo = '';
  const fio = document.createElementNS(NS, 'rect');
  for (const [nome, valor] of Object.entries({
    x: MARGEM,
    y: MARGEM,
    width: largura,
    height: altura,
    rx: raio,
    ry: raio,
  })) {
    fio.setAttribute(nome, String(valor));
  }
  svg.replaceChildren(fio);

  let quadro = 0;
  let animacao: Animation | undefined;
  const limpar = () => {
    cancelAnimationFrame(quadro);
    animacao?.cancel();
    svg.replaceChildren();
    delete svg.dataset.ativo;
  };

  if (movimento === 'calmo') {
    animacao = svg.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
      duration: ESMAECE_MS,
      easing: 'linear',
    });
    animacao.addEventListener('finish', limpar);
    return limpar;
  }

  const ponta = document.createElementNS(NS, 'circle');
  ponta.setAttribute('r', '3.2');
  const pousar = (distancia: number) => {
    const ponto = fio.getPointAtLength(distancia);
    ponta.setAttribute('cx', String(ponto.x));
    ponta.setAttribute('cy', String(ponto.y));
  };
  let comprimento = 0;
  try {
    comprimento = fio.getTotalLength();
    fio.style.strokeDasharray = String(comprimento);
    fio.style.strokeDashoffset = String(comprimento);
    pousar(0);
  } catch (erro) {
    // A página recarregou entre a escolha e o primeiro quadro: o navegador não mede um documento inativo.
    if (!documentoInativo(erro)) throw erro;
    limpar();
    return nada;
  }
  svg.append(ponta);

  const inicio = performance.now();
  const passo = (agora: number) => {
    const progresso = curva(Math.min(1, (agora - inicio) / DESENHA_MS));
    fio.style.strokeDashoffset = String(comprimento * (1 - progresso));
    try {
      pousar(progresso * comprimento);
    } catch (erro) {
      // A página recarregou no meio do traço: o quadro chegou depois de o documento ficar inativo.
      if (!documentoInativo(erro)) throw erro;
      limpar();
      return;
    }
    if (agora - inicio < DESENHA_MS) {
      quadro = requestAnimationFrame(passo);
      return;
    }
    ponta.remove();
    animacao = svg.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: SOME_MS,
      delay: SEGURA_MS,
      easing: 'ease-out',
      fill: 'forwards',
    });
    animacao.addEventListener('finish', limpar);
  };
  quadro = requestAnimationFrame(passo);
  return limpar;
}
