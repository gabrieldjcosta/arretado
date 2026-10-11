// Correção por bloco no rascunho (F2, 10.3; Parte 2 §10.6, "Editor de rascunho/correção"): um bloco
// é um trecho da lei (um nó estrutural com tudo o que há dentro) ou um intervalo de artigos (cada
// artigo com o que leva dentro). Sobre o bloco: ver a lista de linhas e corrigi-las pelo editor
// da 10.2, confirmar todas, converter todas as linhas de um tipo em outro e trocar uma palavra ou
// frase em todas. Só no rascunho. Cada operação em lote é uma transação e marca `+manual`.
import type { Dispositivo, TipoDispositivo } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { dispositivosDaNorma } from './consultas';
import { aplicar } from './edicao';
import {
  converterNaLista,
  ESTRUTURAIS,
  EdicaoInvalida,
  segmentoDoRotulo,
  textoDosTrechos,
  trechosSimples,
  type ConverterEm,
} from './edicao-arvore';
import { confirmarDispositivos, itensDe, ITENS_POR_PAGINA, type ListaAConfirmar } from './revisao';
import { rascunhoGravado } from './servico';

/** Um nó estrutural (id do dispositivo) ou artigos de `de` a `ate`, como a pessoa os digita. */
export type Bloco = { noId: string } | { de: string; ate: string };

export interface NoParaEscolher {
  id: string;
  /** "CAPÍTULO II — Dos deveres"; o recuo pelo nível. */
  rotulo: string;
  nivel: number;
}

export interface ResumoDoBloco {
  /** Linhas do bloco (dispositivos, sem contar o que não aparece como linha). */
  total: number;
  aConfirmar: number;
  /** Quantas linhas de cada tipo (para o "converter todos os… em…"). */
  porTipo: Partial<Record<TipoDispositivo, number>>;
  /** O que o bloco cobre, em palavras: "Seção I", "Arts. 5º a 9º". */
  descricao: string;
}

const NIVEL_ESTRUTURAL: Partial<Record<TipoDispositivo, number>> = {
  parte: 1,
  livro: 2,
  titulo: 3,
  capitulo: 4,
  secao: 5,
  subsecao: 6,
  bloco: 1,
};

/** "5", "5º", "art. 9-A", "9º-A" → o segmento de endereço do artigo (`art5`, `art9A`). */
export function segmentoDoArtigoDigitado(digitado: string): string | undefined {
  const limpo = digitado
    .trim()
    .replace(/^art(igo)?s?\.?\s*/i, '')
    .trim();
  if (limpo === '') return undefined;
  const m = /^(\d+)\s*º?\s*[-–]?\s*([A-Za-z])?$/.exec(limpo);
  if (!m?.[1]) return undefined;
  const numero = Number(m[1]);
  const rotulo = `Art. ${numero > 9 ? String(numero) : `${String(numero)}º`}${m[2] ? `-${m[2].toUpperCase()}` : ''}`;
  return segmentoDoRotulo('artigo', rotulo);
}

/** Os dispositivos do bloco, na ordem de leitura. */
function dispositivosDoBloco(
  todosOsDispositivos: readonly Dispositivo[],
  bloco: Bloco,
): Dispositivo[] {
  const filhos = new Map<string, Dispositivo[]>();
  for (const d of todosOsDispositivos) {
    if (d.paiId) filhos.set(d.paiId, [...(filhos.get(d.paiId) ?? []), d]);
  }
  const raizes: Dispositivo[] = [];
  if ('noId' in bloco) {
    const no = todosOsDispositivos.find((d) => d.id === bloco.noId);
    if (!no || !(ESTRUTURAIS.has(no.tipo) || no.tipo === 'bloco')) {
      throw new EdicaoInvalida('Trecho não encontrado.');
    }
    raizes.push(no);
  } else {
    const de = segmentoDoArtigoDigitado(bloco.de);
    const ate = segmentoDoArtigoDigitado(bloco.ate);
    if (!de || !ate) throw new EdicaoInvalida('Escreva o número dos artigos, como 5 e 9.');
    const artigos = todosOsDispositivos.filter((d) => d.tipo === 'artigo');
    const segmento = (d: Dispositivo) => d.endereco.slice(d.endereco.lastIndexOf('.') + 1);
    const primeiro = artigos.findIndex((d) => segmento(d) === de);
    const ultimo = artigos.findIndex((d) => segmento(d) === ate);
    if (primeiro < 0)
      throw new EdicaoInvalida(`Não há o artigo "${bloco.de.trim()}" neste rascunho.`);
    if (ultimo < 0)
      throw new EdicaoInvalida(`Não há o artigo "${bloco.ate.trim()}" neste rascunho.`);
    if (ultimo < primeiro) throw new EdicaoInvalida('O primeiro artigo vem depois do último.');
    raizes.push(...artigos.slice(primeiro, ultimo + 1));
  }
  const dentro = new Set<string>();
  const descer = (d: Dispositivo) => {
    dentro.add(d.id);
    for (const f of filhos.get(d.id) ?? []) descer(f);
  };
  raizes.forEach(descer);
  return todosOsDispositivos.filter((d) => dentro.has(d.id));
}

async function lerBloco(repo: Repositorio, versaoId: string, bloco: Bloco) {
  const { norma, versao } = await rascunhoGravado(repo, versaoId);
  const todosOsDispositivos = await dispositivosDaNorma(
    repo.colecao('dispositivos'),
    norma.id,
    false,
  );
  return {
    norma,
    versao,
    todosOsDispositivos,
    doBloco: dispositivosDoBloco(todosOsDispositivos, bloco),
  };
}

/** Os nós estruturais do rascunho (para escolher o bloco), na ordem do texto. */
export async function listarNos(repo: Repositorio, versaoId: string): Promise<NoParaEscolher[]> {
  const { norma } = await rascunhoGravado(repo, versaoId);
  const ds = await dispositivosDaNorma(repo.colecao('dispositivos'), norma.id, false);
  const nos = ds.filter((d) => ESTRUTURAIS.has(d.tipo) || d.tipo === 'bloco');
  const nomes = new Map(ds.filter((d) => d.tipo === 'nome' && d.paiId).map((d) => [d.paiId, d]));
  const textos = await repo.colecao('textosDispositivo').obterPorChaves(
    '[versaoId+dispositivoId]',
    nos.flatMap((n) => {
      const nome = nomes.get(n.id);
      return nome ? [[versaoId, nome.id] as [string, string]] : [];
    }),
  );
  const nomeDe = new Map(
    textos.flatMap((t) => (t ? [[t.dispositivoId, textoDosTrechos(t.trechos)] as const] : [])),
  );
  return nos.map((n) => {
    const nome = nomes.get(n.id);
    const texto = nome ? (nomeDe.get(nome.id) ?? '').replace(/\s+/g, ' ').trim() : '';
    const rotulo = n.rotulo ?? n.endereco;
    return {
      id: n.id,
      rotulo: texto ? `${rotulo} — ${texto}` : rotulo,
      nivel: NIVEL_ESTRUTURAL[n.tipo] ?? 1,
    };
  });
}

function descricaoDoBloco(bloco: Bloco, doBloco: readonly Dispositivo[]): string {
  if ('noId' in bloco) {
    const no = doBloco[0];
    return no?.rotulo ?? no?.endereco ?? 'Trecho';
  }
  const artigos = doBloco.filter((d) => d.tipo === 'artigo');
  const primeiro = artigos[0]?.rotulo ?? bloco.de.trim();
  const ultimo = artigos[artigos.length - 1]?.rotulo ?? bloco.ate.trim();
  return primeiro === ultimo ? primeiro : `${primeiro} a ${ultimo}`;
}

/** O que há no bloco: quantas linhas, quantas a confirmar e quantas de cada tipo. */
export async function resumirBloco(
  repo: Repositorio,
  versaoId: string,
  bloco: Bloco,
): Promise<ResumoDoBloco> {
  const { doBloco } = await lerBloco(repo, versaoId, bloco);
  const porTipo: ResumoDoBloco['porTipo'] = {};
  for (const d of doBloco) porTipo[d.tipo] = (porTipo[d.tipo] ?? 0) + 1;
  return {
    total: doBloco.length,
    aConfirmar: doBloco.filter((d) => d.confianca === 'a_confirmar').length,
    porTipo,
    descricao: descricaoDoBloco(bloco, doBloco),
  };
}

/** As linhas do bloco (todas, confirmadas ou não), `quantidade` a partir de `desde`. */
export async function listarDoBloco(
  repo: Repositorio,
  versaoId: string,
  bloco: Bloco,
  pagina: { desde?: number; quantidade?: number } = {},
): Promise<ListaAConfirmar> {
  const { todosOsDispositivos, doBloco } = await lerBloco(repo, versaoId, bloco);
  const desde = Math.max(0, Math.floor(pagina.desde ?? 0));
  const quantidade = Math.min(Math.max(1, Math.floor(pagina.quantidade ?? ITENS_POR_PAGINA)), 200);
  return {
    total: doBloco.length,
    itens: await itensDe(
      repo,
      versaoId,
      todosOsDispositivos,
      doBloco.slice(desde, desde + quantidade),
    ),
  };
}

/** Confirma todas as linhas do bloco; devolve quantas estavam a confirmar. */
export async function confirmarBloco(
  repo: Repositorio,
  versaoId: string,
  bloco: Bloco,
): Promise<number> {
  const { doBloco } = await lerBloco(repo, versaoId, bloco);
  return confirmarDispositivos(
    repo,
    versaoId,
    doBloco.filter((d) => d.confianca === 'a_confirmar').map((d) => d.id),
  );
}

/**
 * Converte todas as linhas de um tipo do bloco em outro ("todos os parágrafos deste capítulo em
 * incisos"). O sistema numera e acerta o recuo de tudo de uma vez. Devolve quantas converteu.
 */
export async function converterBloco(
  repo: Repositorio,
  versaoId: string,
  bloco: Bloco,
  de: TipoDispositivo,
  para: ConverterEm,
): Promise<number> {
  const { doBloco } = await lerBloco(repo, versaoId, bloco);
  const ids = doBloco.filter((d) => d.tipo === de).map((d) => d.id);
  if (ids.length === 0 || de === para) return 0;
  await aplicar(repo, versaoId, (linhas) => {
    let saida = linhas;
    for (const id of ids) saida = converterNaLista(saida, id, para, repo.ctx.novoId);
    return saida;
  });
  return ids.length;
}

/**
 * Troca `procurar` por `trocar` no texto de todas as linhas do bloco (sem diferenciar maiúscula
 * de minúscula); não mexe no rótulo. O texto trocado vira trecho simples, como na correção da
 * linha. Devolve quantas linhas mudaram.
 */
export async function trocarNoBloco(
  repo: Repositorio,
  versaoId: string,
  bloco: Bloco,
  procurar: string,
  trocar: string,
): Promise<number> {
  if (procurar === '') throw new EdicaoInvalida('Escreva o que procurar.');
  const { doBloco } = await lerBloco(repo, versaoId, bloco);
  const dentro = new Set(doBloco.map((d) => d.id));
  const expressao = new RegExp(procurar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let mudaram = 0;
  await aplicar(repo, versaoId, (linhas) => {
    mudaram = 0;
    for (const l of linhas) {
      const alvo = l.nome && dentro.has(l.nome.id) ? l.nome : dentro.has(l.id) ? l : undefined;
      if (!alvo) continue;
      const texto = textoDosTrechos(alvo.trechos);
      const novo = texto.replace(expressao, () => trocar);
      if (novo === texto) continue;
      if (novo.length > 200_000) throw new EdicaoInvalida('O texto passou do limite.');
      alvo.trechos = trechosSimples(novo);
      mudaram++;
    }
    return linhas;
  });
  return mudaram;
}
