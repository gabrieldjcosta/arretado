// Ordem de leitura (`Dispositivo.ordem`, decidida na 8.4; glossário §12): a posição do nó na
// pré-ordem da árvore do rascunho (o nó, depois os filhos, na ordem do texto), de 1 em diante. O
// sufixo e o bloco com numeração própria não entram na conta, porque a posição já os ordena: a lei
// traz o 9 antes do 9-A e o 9-A antes do 10, e o ADCT depois do corpo. Uma ordem calculada do
// número colidiria (9-A = 9.1 e 9-J = 9.10; o art. 1º do ADCT e o do corpo). A 9.2 grava esta ordem
// e o pai (índice `[normaId+ordem]`, leitura por janela na 9.4); a F6, que acrescenta dispositivo
// entre dois, usa um valor entre os vizinhos (`ordem` é número) ou renumera ao publicar.
import type { NoRascunho } from './rascunho';

export interface NaOrdem {
  no: NoRascunho;
  /** Ausente na raiz (preâmbulo, nó de topo, artigo sem estrutura, anexo, bloco). */
  pai?: NoRascunho;
  ordem: number;
}

/** Os nós em ordem de leitura, com o pai e a `ordem` (1, 2, 3…). */
export function emOrdemDeLeitura(nos: readonly NoRascunho[]): NaOrdem[] {
  const saida: NaOrdem[] = [];
  // Pilha explícita: a profundidade é pequena, mas a largura (filhos de um nó) não tem limite.
  const pilha: { no: NoRascunho; pai?: NoRascunho }[] = [];
  for (let k = nos.length - 1; k >= 0; k--) {
    const no = nos[k];
    if (no) pilha.push({ no });
  }
  while (pilha.length > 0) {
    const item = pilha.pop();
    if (!item) break;
    saida.push({ ...item, ordem: saida.length + 1 });
    const { filhos } = item.no;
    for (let k = filhos.length - 1; k >= 0; k--) {
      const filho = filhos[k];
      if (filho) pilha.push({ no: filho, pai: item.no });
    }
  }
  return saida;
}
