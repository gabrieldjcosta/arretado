// O item do passo "Ache o erro": um dispositivo lido da matéria, com uma palavra trocada (como o `achar` do
// mockup). A frase falsa vive só na tela: nunca vira Frase nem Cartão.
import type { Repositorio } from '../../../core/persistencia';
import { montarItem, type ItemDoAcheOErro } from '../../../dominios/legislacao/ache-o-erro';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { fontesDoArtigo } from '../../../dominios/legislacao/lembrar';
import { gerarTrocas } from '../../../dominios/legislacao/trocas';
import type { AlvoDaPorteira } from './alvo-da-porteira';
import { referenciaDe } from './carregar';

/** O primeiro dispositivo dos artigos lidos em que a troca cabe, tentando uma semente por dispositivo. */
export async function itemDoAche(
  repo: Repositorio,
  alvo: AlvoDaPorteira,
  semente: number,
): Promise<ItemDoAcheOErro | undefined> {
  const aberta = await abrirNorma(repo, alvo.normaId);
  let n = 0;
  for (const artigo of alvo.artigos) {
    for (const fonte of await fontesDoArtigo(repo, aberta, artigo, referenciaDe)) {
      n += 1;
      const item = montarItem(fonte, 0, semente + n);
      if (item?.troca) return item;
    }
  }
  return undefined;
}

export interface Pedaco {
  texto: string;
  inicio: number;
  fim: number;
  /** É a palavra trocada (ou parte dela)? */
  troca: boolean;
}

/** O texto em palavras tocáveis; a troca fica num pedaço só, mesmo colada a pontuação. */
export function pedacos(item: ItemDoAcheOErro): Pedaco[] {
  const t = item.troca;
  const cortes = new Set<number>();
  if (t) {
    cortes.add(t.inicio);
    cortes.add(t.inicio + t.substituto.length);
  }
  const saida: Pedaco[] = [];
  for (const m of item.mostrado.matchAll(/\S+/g)) {
    let ini = m.index;
    const fimDoToken = ini + m[0].length;
    for (const corte of [...cortes].sort((a, b) => a - b)) {
      if (corte > ini && corte < fimDoToken) {
        saida.push(fatia(item, ini, corte));
        ini = corte;
      }
    }
    saida.push(fatia(item, ini, fimDoToken));
  }
  return saida;
}

function fatia(item: ItemDoAcheOErro, inicio: number, fim: number): Pedaco {
  const t = item.troca;
  const dentro = t !== undefined && inicio < t.inicio + t.substituto.length && fim > t.inicio;
  return { texto: item.mostrado.slice(inicio, fim), inicio, fim, troca: dentro };
}

/** Quantos dispositivos dos artigos têm troca segura: a lei nem sempre tem (nem toda frase tem um "todo" a virar "algum"). */
export async function trechosDoAche(
  repo: Repositorio,
  normaId: string,
  artigos: readonly { endereco: string; rotulo: string }[],
): Promise<number> {
  try {
    const aberta = await abrirNorma(repo, normaId);
    let n = 0;
    for (const artigo of artigos) {
      for (const fonte of await fontesDoArtigo(repo, aberta, artigo, referenciaDe)) {
        if (gerarTrocas(fonte.texto).length > 0) n += 1;
      }
    }
    return n;
  } catch {
    return 0;
  }
}
