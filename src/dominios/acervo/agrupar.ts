// Agrupamento da tela do acervo (Peça 3c): puro, sem repositório nem rede.
import type { EntradaDoIndice, TipoDoAcervo } from './esquemas';
import { nomeComparavel } from './adesao';

export type ModoDeAgrupar = 'disciplina' | 'tipo';

export interface GrupoDoAcervo {
  titulo: string;
  itens: EntradaDoIndice[];
}

export const SEM_DISCIPLINA = 'Sem disciplina';

const UFS = 'ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to';
/** `www.al.sp.gov.br`, `defensoria.sp.def.br`, `www.tjsp.jus.br`: o órgão de um estado. */
const ENDERECO_DE_ESTADO = new RegExp(
  `(?:^|\\.)(?:(${UFS})\\.(?:gov|def|leg)\\.br|tj(${UFS}|dft)\\.jus\\.br)$`,
);

/**
 * A UF do órgão que publica o item, lida do endereço oficial; nada no que é federal, internacional ou
 * sem endereço. O índice ainda não guarda a UF: até guardar, vem daqui. Serve para a lista abrir pelo
 * que vale em todo o país, e não pelas normas de um estado que a pessoa não escolheu.
 */
export function ufDaEntrada(entrada: Pick<EntradaDoIndice, 'urlOficial'>): string | undefined {
  if (entrada.urlOficial === undefined) return undefined;
  let endereco: string;
  try {
    endereco = new URL(entrada.urlOficial).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  const achado = ENDERECO_DE_ESTADO.exec(endereco);
  return achado?.[1] ?? achado?.[2];
}

/** Filtra por tipo e busca (sem acento nem caixa) no título, no grupo e nas disciplinas. */
export function filtrarEntradas(
  itens: readonly EntradaDoIndice[],
  tipo: TipoDoAcervo,
  busca: string,
): EntradaDoIndice[] {
  const q = nomeComparavel(busca);
  return itens.filter((i) => {
    if (i.tipo !== tipo) return false;
    if (q === '') return true;
    const alvo = [i.titulo, i.grupo, ...i.vinculos.map((v) => v.disciplina)].map(nomeComparavel);
    return alvo.some((t) => t.includes(q));
  });
}

/**
 * Por disciplina, um item aparece em cada disciplina a que se vincula; por tipo, no seu grupo. O que é de
 * um estado vem depois do que vale em todo o país, dentro do grupo, e os grupos só de um estado, no fim.
 */
export function agrupar(itens: readonly EntradaDoIndice[], modo: ModoDeAgrupar): GrupoDoAcervo[] {
  const mapa = new Map<string, EntradaDoIndice[]>();
  const pôr = (titulo: string, item: EntradaDoIndice) => {
    const lista = mapa.get(titulo);
    if (lista) lista.push(item);
    else mapa.set(titulo, [item]);
  };
  for (const i of itens) {
    if (modo === 'tipo') pôr(i.grupo, i);
    else if (i.vinculos.length === 0) pôr(SEM_DISCIPLINA, i);
    else for (const d of new Set(i.vinculos.map((v) => v.disciplina))) pôr(d, i);
  }
  const deEstado = (i: EntradaDoIndice) => ufDaEntrada(i) !== undefined;
  const soDeEstado = (g: GrupoDoAcervo) => g.itens.every(deEstado);
  return [...mapa.entries()]
    .map(([titulo, lista]) => ({
      titulo,
      itens: [...lista].sort((a, b) => Number(deEstado(a)) - Number(deEstado(b))),
    }))
    .sort((a, b) => {
      if (a.titulo === SEM_DISCIPLINA) return 1;
      if (b.titulo === SEM_DISCIPLINA) return -1;
      return (
        Number(soDeEstado(a)) - Number(soDeEstado(b)) || a.titulo.localeCompare(b.titulo, 'pt-BR')
      );
    });
}

/**
 * Norma grande: o item passa disto (bytes). A lista só mostra o tamanho das grandes, e a gravação no
 * aparelho leva alguns segundos.
 */
export const NORMA_GRANDE = 500_000;

/** "12 KB", "1,4 MB": o que será baixado. */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** "7.210/1984" → "7210/1984"; só números e o ano, para comparar leis escritas de jeitos diferentes. */
function referenciaComparavel(texto: string): string | undefined {
  const m = /(\d[\d.]*)\s*\/\s*(\d{4})/.exec(texto);
  return m?.[1] && m[2] ? `${m[1].replaceAll('.', '')}/${m[2]}` : undefined;
}

/**
 * A norma já importada por colagem (sem origem no acervo) que parece ser a mesma lei do item:
 * mesma referência (número/ano) e, quando as duas dizem o tipo, o mesmo tipo. Só avisa; não bloqueia.
 */
export function normaParecida<
  N extends { tituloCurto: string; tipo?: string; referencia?: string; origemAcervo?: unknown },
>(entrada: Pick<EntradaDoIndice, 'titulo'>, normas: readonly N[]): N | undefined {
  const ref = referenciaComparavel(entrada.titulo);
  if (ref === undefined) return undefined;
  const titulo = nomeComparavel(entrada.titulo);
  return normas.find(
    (n) =>
      n.origemAcervo === undefined &&
      n.referencia !== undefined &&
      referenciaComparavel(n.referencia) === ref &&
      (n.tipo === undefined || titulo.includes(nomeComparavel(n.tipo))),
  );
}
