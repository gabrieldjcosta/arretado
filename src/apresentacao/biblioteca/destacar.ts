// Destaque automático no leitor (F2, 9.8): o texto em que o detector casa e os trechos partidos
// nos limites dos destaques, para desenhar. Puro; calculado por dispositivo desenhado e guardado
// enquanto o texto existir (o mesmo objeto, na janela já lida), nunca gravado.
import type { TextoDeDispositivo } from '../../core/modelo';
import {
  detectarDestaques,
  type CategoriaDestaque,
  type Destaque,
} from '../../dominios/legislacao/destaques';

type Trechos = TextoDeDispositivo['trechos'];
type Trecho = Trechos[number];

/** Um pedaço de trecho, com a formatação dele e, se aceso, a categoria. */
export interface PedacoDoTrecho {
  trecho: Trecho;
  categoria?: CategoriaDestaque;
}

/**
 * O texto vigente em que o detector casa: os trechos juntos, com o tachado (a redação anterior no
 * meio do texto, 8.6) trocado por espaços do mesmo comprimento. Os índices continuam valendo nos
 * trechos, o tachado nunca acende, e o que vem antes e depois dele se lê junto, como na lei.
 */
export function textoParaDestacar(trechos: Trechos): string {
  return trechos.map((t) => (t.tachado ? ' '.repeat(t.texto.length) : t.texto)).join('');
}

/**
 * Parte os trechos nos limites dos destaques sem mudar o texto: cada pedaço leva a ênfase, o
 * tachado e o link do trecho de onde veio. Os destaques vêm em ordem e sem sobreposição.
 */
export function partirTrechos(trechos: Trechos, destaques: readonly Destaque[]): PedacoDoTrecho[] {
  const pedacos: PedacoDoTrecho[] = [];
  let k = 0;
  let base = 0;
  for (const trecho of trechos) {
    const fimDoTrecho = base + trecho.texto.length;
    // O destaque pode atravessar o tachado ("prazo de [30] 60 dias" lê "prazo de 60 dias"), mas o
    // tachado mesmo nunca acende.
    if (trecho.tachado) {
      pedacos.push({ trecho });
      base = fimDoTrecho;
      continue;
    }
    let cursor = base;
    while (cursor < fimDoTrecho) {
      while (k < destaques.length && (destaques[k]?.fim ?? 0) <= cursor) k++;
      const d = destaques[k];
      if (d === undefined || d.inicio >= fimDoTrecho) {
        pedacos.push(pedaco(trecho, cursor - base, fimDoTrecho - base));
        break;
      }
      if (d.inicio > cursor) {
        pedacos.push(pedaco(trecho, cursor - base, d.inicio - base));
        cursor = d.inicio;
      }
      const fim = Math.min(d.fim, fimDoTrecho);
      pedacos.push({ ...pedaco(trecho, cursor - base, fim - base), categoria: d.categoria });
      cursor = fim;
    }
    base = fimDoTrecho;
  }
  return pedacos;
}

function pedaco(trecho: Trecho, de: number, ate: number): PedacoDoTrecho {
  const inteiro = de === 0 && ate === trecho.texto.length;
  return { trecho: inteiro ? trecho : { ...trecho, texto: trecho.texto.slice(de, ate) } };
}

const guardados = new WeakMap<Trechos, PedacoDoTrecho[]>();

/** Os pedaços do texto vigente com os destaques, calculados uma vez por texto. */
export function pedacosDestacados(trechos: Trechos): PedacoDoTrecho[] {
  let pedacos = guardados.get(trechos);
  if (!pedacos) {
    pedacos = partirTrechos(trechos, detectarDestaques(textoParaDestacar(trechos)));
    guardados.set(trechos, pedacos);
  }
  return pedacos;
}
