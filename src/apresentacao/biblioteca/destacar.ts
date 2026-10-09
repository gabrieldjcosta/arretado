// Os trechos do texto vigente partidos para desenhar (F2, 9.8 e 11.4): o destaque automático e as
// marcações do usuário (grifos e notas) numa partição só, sobre os mesmos índices (os do texto
// gravado: os trechos juntos, o tachado com o comprimento dele). Puro; o destaque é calculado uma
// vez por texto (o mesmo objeto, na janela já lida) e nunca gravado.
import type { TextoDeDispositivo } from '../../core/modelo';
import {
  detectarDestaques,
  type CategoriaDestaque,
  type Destaque,
} from '../../dominios/legislacao/destaques';

type Trechos = TextoDeDispositivo['trechos'];
type Trecho = Trechos[number];

/** Um grifo no texto: os offsets da âncora e a cor (11.4). */
export interface GrifoNoTexto {
  id: string;
  cor: number;
  inicio: number;
  fim: number;
}

/** Uma nota no texto: o marcador vai logo depois do fim da âncora (11.4). */
export interface NotaNoTexto {
  id: string;
  fim: number;
  /** O começo do texto anotado, para o nome do marcador. */
  rotulo?: string;
}

/** Uma remissão que a norma resolve (11.9): o trecho citado e o nó que ela aponta. */
export interface RemissaoNoTexto {
  inicio: number;
  fim: number;
  /** O índice, em `NormaAberta.nos`, do dispositivo citado. */
  alvo: number;
}

/** As marcações do usuário num texto, na ordem de criação (a mais nova por cima). */
export interface MarcasDoTexto {
  grifos: readonly GrifoNoTexto[];
  notas: readonly NotaNoTexto[];
}

/**
 * Um pedaço de trecho, com a formatação dele; se aceso, a categoria do destaque; se grifado, o
 * grifo de cima; e as notas que terminam logo depois dele (o marcador vem a seguir).
 */
export interface PedacoDoTrecho {
  trecho: Trecho;
  categoria?: CategoriaDestaque;
  grifo?: { id: string; cor: number; primeiro: boolean };
  notas?: string[];
  /** Pedaço de uma remissão: o nó citado; só o primeiro pedaço é ponto de parada do teclado. */
  remissao?: { alvo: number; primeiro: boolean };
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
 * Parte os trechos nos limites de todas as camadas sem mudar o texto: cada pedaço leva a ênfase, o
 * tachado e o link do trecho de onde veio. Os destaques vêm em ordem e sem sobreposição e nunca
 * acendem o tachado; os grifos podem se sobrepor (vale o mais novo) e cobrem também o tachado.
 */
export function partirTrechos(
  trechos: Trechos,
  destaques: readonly Destaque[],
  marcas: MarcasDoTexto = { grifos: [], notas: [] },
  remissoes: readonly RemissaoNoTexto[] = [],
): PedacoDoTrecho[] {
  const total = trechos.reduce((soma, t) => soma + t.texto.length, 0);
  const limitar = (n: number) => Math.max(0, Math.min(n, total));
  const grifos = marcas.grifos
    .map((g) => ({ ...g, inicio: limitar(g.inicio), fim: limitar(g.fim) }))
    .filter((g) => g.fim > g.inicio);
  // Nota com o fim no zero (âncora vazia) iria antes do texto: vai ao primeiro pedaço.
  const notas = marcas.notas.map((n) => ({ ...n, fim: Math.max(1, limitar(n.fim)) }));
  // Em ordem e sem sobreposição: a que começa dentro da anterior fica de fora.
  const citacoes: RemissaoNoTexto[] = [];
  for (const r of [...remissoes].sort((a, b) => a.inicio - b.inicio)) {
    const ultima = citacoes[citacoes.length - 1];
    if (r.fim > r.inicio && (!ultima || r.inicio >= ultima.fim)) {
      citacoes.push({ ...r, inicio: limitar(r.inicio), fim: limitar(r.fim) });
    }
  }
  const remissaoVista = new Set<RemissaoNoTexto>();
  const grifoVisto = new Set<string>();
  const pedacos: PedacoDoTrecho[] = [];
  let base = 0;
  for (const trecho of trechos) {
    const fimDoTrecho = base + trecho.texto.length;
    const cortes = new Set<number>([base, fimDoTrecho]);
    const dentro = (n: number) => {
      if (n > base && n < fimDoTrecho) cortes.add(n);
    };
    // O destaque pode atravessar o tachado ("prazo de [30] 60 dias" lê "prazo de 60 dias"), mas o
    // tachado mesmo nunca acende.
    if (!trecho.tachado) {
      for (const d of destaques) {
        dentro(d.inicio);
        dentro(d.fim);
      }
    }
    for (const g of grifos) {
      dentro(g.inicio);
      dentro(g.fim);
    }
    for (const r of citacoes) {
      dentro(r.inicio);
      dentro(r.fim);
    }
    for (const n of notas) dentro(n.fim);
    const pontos = [...cortes].sort((a, b) => a - b);
    for (let i = 0; i + 1 < pontos.length; i++) {
      const de = pontos[i] ?? base;
      const ate = pontos[i + 1] ?? fimDoTrecho;
      const novo = pedaco(trecho, de - base, ate - base);
      const categoria = trecho.tachado
        ? undefined
        : destaques.find((d) => d.inicio <= de && d.fim >= ate)?.categoria;
      if (categoria) novo.categoria = categoria;
      const grifo = grifos.findLast((g) => g.inicio <= de && g.fim >= ate);
      if (grifo) {
        novo.grifo = { id: grifo.id, cor: grifo.cor, primeiro: !grifoVisto.has(grifo.id) };
        grifoVisto.add(grifo.id);
      }
      const citacao = citacoes.find((r) => r.inicio <= de && r.fim >= ate);
      if (citacao) {
        novo.remissao = { alvo: citacao.alvo, primeiro: !remissaoVista.has(citacao) };
        remissaoVista.add(citacao);
      }
      const aqui = notas.filter((n) => n.fim === ate).map((n) => n.id);
      if (aqui.length > 0) novo.notas = aqui;
      pedacos.push(novo);
    }
    base = fimDoTrecho;
  }
  return pedacos;
}

function pedaco(trecho: Trecho, de: number, ate: number): PedacoDoTrecho {
  const inteiro = de === 0 && ate === trecho.texto.length;
  return { trecho: inteiro ? trecho : { ...trecho, texto: trecho.texto.slice(de, ate) } };
}

const destaquesGuardados = new WeakMap<Trechos, Destaque[]>();
const guardados = new WeakMap<Trechos, PedacoDoTrecho[]>();

function destaquesDe(trechos: Trechos): Destaque[] {
  let destaques = destaquesGuardados.get(trechos);
  if (!destaques) {
    destaques = detectarDestaques(textoParaDestacar(trechos));
    destaquesGuardados.set(trechos, destaques);
  }
  return destaques;
}

/** Os pedaços do texto vigente com os destaques, calculados uma vez por texto. */
export function pedacosDestacados(trechos: Trechos): PedacoDoTrecho[] {
  let pedacos = guardados.get(trechos);
  if (!pedacos) {
    pedacos = partirTrechos(trechos, destaquesDe(trechos));
    guardados.set(trechos, pedacos);
  }
  return pedacos;
}

const comCamadas = new WeakMap<
  object,
  {
    trechos: Trechos;
    destacar: boolean;
    remissoes?: readonly RemissaoNoTexto[];
    pedacos: PedacoDoTrecho[];
  }
>();
const SEM_MARCAS: MarcasDoTexto = { grifos: [], notas: [] };

/**
 * Os pedaços do texto vigente com as camadas pedidas: o destaque (se ligado), as marcações e as
 * remissões (11.9). Sem marcação nem remissão, os do destaque guardados por texto; com elas,
 * guardados pelas camadas (o mesmo objeto enquanto as marcações e as remissões do dispositivo não
 * mudam), para o mesmo texto e o mesmo destaque.
 */
export function pedacosDoTexto(
  trechos: Trechos,
  destacar: boolean,
  marcas: MarcasDoTexto | undefined,
  remissoes?: readonly RemissaoNoTexto[],
): PedacoDoTrecho[] {
  const semMarcas = !marcas || (marcas.grifos.length === 0 && marcas.notas.length === 0);
  const semRemissoes = !remissoes || remissoes.length === 0;
  if (semMarcas && semRemissoes)
    return destacar ? pedacosDestacados(trechos) : trechos.map((trecho) => ({ trecho }));
  // A chave é a camada que muda mais de uma vez por texto: as marcações; sem elas, as remissões.
  const chave = (semMarcas ? remissoes : marcas) as object;
  const guardado = comCamadas.get(chave);
  if (
    guardado?.trechos === trechos &&
    guardado.destacar === destacar &&
    guardado.remissoes === remissoes
  )
    return guardado.pedacos;
  const pedacos = partirTrechos(
    trechos,
    destacar ? destaquesDe(trechos) : [],
    marcas ?? SEM_MARCAS,
    remissoes,
  );
  comCamadas.set(chave, { trechos, destacar, remissoes, pedacos });
  return pedacos;
}
