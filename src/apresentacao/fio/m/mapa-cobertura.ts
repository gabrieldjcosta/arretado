// O teste de quem se cobre no mapa do Destino (o que o mockup aprovado faz em `pos()`, a cada quadro da câmera): vários
// textos disputam o mesmo pedaço da caixa, e o que chega depois de outro já posto, sobre ele, fica escondido.

/** Quem tem lugar primeiro quando dois textos se cobrem (a ordem do mockup, de quem fala de onde a pessoa está). */
const PRIORIDADE = [
  '.m-ne-lugar.m-com-voce span',
  '.m-ne-fim',
  '.m-aqui',
  '.m-ne-lugar.m-aberto span',
  '.m-rotulo-porteira',
  '.m-ne-lugar.m-fechado span',
];
/** De longe entram os nomes das matérias: primeiro a de agora e a seguinte, depois as outras. */
const PRIORIDADE_DE_LONGE = [
  '.m-ne-rotulo.m-uf-agora',
  '.m-ne-rotulo.m-uf-seguinte',
  '.m-ne-rotulo',
];

/**
 * Esconde o texto que cobriria outro já escolhido (o teste que o mockup faz em `pos()`): na ordem de prioridade, o que
 * bate com um retângulo já ocupado (3 px de folga ao lado, 1 em cima e embaixo) fica com `visibility: hidden`. Mede
 * tudo de uma vez e só depois escreve, para o navegador calcular o desenho uma vez só por quadro.
 */
export function esconderOQueSeCobre(camada: Element, longe: boolean): void {
  const vistos = new Set<HTMLElement>();
  const fila: HTMLElement[] = [];
  for (const consulta of longe ? [...PRIORIDADE, ...PRIORIDADE_DE_LONGE] : PRIORIDADE) {
    for (const el of camada.querySelectorAll<HTMLElement>(consulta)) {
      if (vistos.has(el)) continue;
      vistos.add(el);
      fila.push(el);
    }
  }
  const medidas = fila.map((el) => el.getBoundingClientRect());
  const ocupados: DOMRect[] = [];
  fila.forEach((el, i) => {
    const q = medidas[i];
    if (!q?.width) {
      el.style.visibility = '';
      return;
    }
    const bate = ocupados.some(
      (o) =>
        q.left < o.right + 3 &&
        q.right > o.left - 3 &&
        q.top < o.bottom + 1 &&
        q.bottom > o.top - 1,
    );
    el.style.visibility = bate ? 'hidden' : '';
    if (!bate) ocupados.push(q);
  });
}
