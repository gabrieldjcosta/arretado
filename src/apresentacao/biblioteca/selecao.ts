// A seleção do usuário no texto do leitor (F2, 11.4) em offsets sobre o texto gravado do
// dispositivo. O texto vigente de cada dispositivo fica num `.texto-vigente` com o id dele; os
// pedaços desenhados são exatamente os trechos gravados, então somar o comprimento dos nós de
// texto dá o offset. O que não é texto da lei (o marcador da nota) leva `data-fora-do-texto`.

/** O trecho escolhido, num dispositivo só. */
export interface SelecaoNoTexto {
  dispositivoId: string;
  inicio: number;
  fim: number;
  /** A seleção passava deste dispositivo: ficou só a parte dele (a primeira). */
  cortada: boolean;
}

export const CLASSE_DO_TEXTO = 'texto-vigente';
export const ATRIBUTO_FORA_DO_TEXTO = 'data-fora-do-texto';

function textosDe(raiz: Element): Text[] {
  const textos: Text[] = [];
  const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let no = andar.nextNode(); no; no = andar.nextNode()) {
    const fora = no.parentElement?.closest(`[${ATRIBUTO_FORA_DO_TEXTO}]`);
    if (fora && raiz.contains(fora)) continue;
    textos.push(no as Text);
  }
  return textos;
}

/** O offset do ponto (nó, offset) dentro do texto do dispositivo, contando só o texto da lei. */
function deslocamento(textos: readonly Text[], no: Node, offset: number): number {
  const ponto = document.createRange();
  ponto.setStart(no, offset);
  let total = 0;
  for (const texto of textos) {
    if (texto === no) return total + offset;
    // O nó termina antes do ponto (ou nele): conta inteiro; depois dele, acabou.
    if (ponto.comparePoint(texto, texto.length) <= 0) total += texto.length;
    else break;
  }
  return total;
}

/**
 * O trecho da seleção dentro do texto vigente de um dispositivo. A seleção que atravessa
 * dispositivos fica só no primeiro em que tem texto (`cortada`): no celular, a alça da seleção
 * passa do fim com facilidade, e recusar perderia o gesto. Fora do texto vigente (rótulo, rubrica,
 * nota de vigência, redação anterior), ou só com espaços, não há trecho.
 */
export function lerSelecao(
  selecao: Selection | null,
  raiz: Element | null,
): SelecaoNoTexto | undefined {
  if (!selecao || !raiz || selecao.rangeCount === 0 || selecao.isCollapsed) return undefined;
  const faixa = selecao.getRangeAt(0);
  const achados: { dispositivoId: string; inicio: number; fim: number }[] = [];
  for (const el of raiz.querySelectorAll<HTMLElement>(`.${CLASSE_DO_TEXTO}`)) {
    if (!faixa.intersectsNode(el)) continue;
    const dispositivoId = el.dataset.dispositivo;
    if (!dispositivoId) continue;
    const textos = textosDe(el);
    const completo = textos.map((t) => t.data).join('');
    const inicio = el.contains(faixa.startContainer)
      ? deslocamento(textos, faixa.startContainer, faixa.startOffset)
      : 0;
    const fim = el.contains(faixa.endContainer)
      ? deslocamento(textos, faixa.endContainer, faixa.endOffset)
      : completo.length;
    // A faixa que só encosta no dispositivo (o clique triplo termina no começo do seguinte) ou
    // que só pega espaços não conta.
    if (fim > inicio && completo.slice(inicio, fim).trim() !== '') {
      achados.push({ dispositivoId, inicio, fim });
    }
  }
  const [primeiro] = achados;
  return primeiro && { ...primeiro, cortada: achados.length > 1 };
}
