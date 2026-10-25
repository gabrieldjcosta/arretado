// Ache o erro (AP-06, piloto de 25/10/2026): uma rodada de dispositivos do texto vigente, com uma
// troca em três de cada quatro itens, e a conferência da resposta. A frase falsa vive só na
// memória da rodada: nunca vira Frase nem Cartão. Puro, fora de `montarRodada` (que lê o banco).
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';
import { abrirNorma, lerJanela, normasPublicadas } from './leitor';
import {
  aplicarTroca,
  candidatosDeToque,
  escolherTroca,
  type TipoDeTroca,
  type Troca,
} from './trocas';

/** Tamanho de uma rodada: cabe em cinco minutos. */
export const ITENS_POR_RODADA = 8;
/** Um em cada quatro itens vem sem troca: "Está certa como está" é resposta de primeira classe. */
const SEM_TROCA_A_CADA = 4;
/** A Frase correta tem até 2.000 caracteres: dispositivo maior fica fora do piloto. */
const MAXIMO_DE_TEXTO = 1_800;

export interface FonteDoItem {
  normaId: string;
  dispositivoId: string;
  versaoId: string;
  /** "ECA · Art. 121, § 2º". */
  referencia: string;
  /** O texto vigente, sem tachado, aparado. */
  texto: string;
  /** Quanto o aparo do início deslocou: as âncoras da Frase de trecho contam no texto gravado. */
  deslocamento: number;
}

export interface ItemDoAcheOErro extends FonteDoItem {
  /** O que a tela mostra: o texto certo ou o trocado. */
  mostrado: string;
  troca: Troca | undefined;
  /** Os trechos tocáveis em `mostrado`, em ordem. */
  candidatos: { inicio: number; fim: number }[];
  /** Volta ao mesmo dispositivo sete dias depois (medição da retenção). */
  revisita: boolean;
}

export type RespostaDoItem =
  { tipo: 'tocou'; inicio: number; fim: number } | { tipo: 'certa' } | { tipo: 'nao_sei' };

/** Monta o item na posição `posicao` da rodada: o quarto de cada quatro vem sem troca. */
export function montarItem(
  fonte: FonteDoItem,
  posicao: number,
  semente: number,
  revisita = false,
): ItemDoAcheOErro | undefined {
  const semTroca = posicao % SEM_TROCA_A_CADA === SEM_TROCA_A_CADA - 1;
  const troca = semTroca ? undefined : escolherTroca(fonte.texto, semente);
  if (!semTroca && !troca) return undefined;
  const mostrado = troca ? aplicarTroca(fonte.texto, troca) : fonte.texto;
  const candidatos = candidatosDeToque(mostrado);
  if (candidatos.length === 0) return undefined;
  return { ...fonte, mostrado, troca, candidatos, revisita };
}

/** Acertou? Tocar na troca, ou dizer "certa" quando não há troca. "Não sei" nunca acerta. */
export function conferir(item: ItemDoAcheOErro, resposta: RespostaDoItem): boolean {
  if (resposta.tipo === 'nao_sei') return false;
  if (resposta.tipo === 'certa') return item.troca === undefined;
  const t = item.troca;
  if (!t) return false;
  const fim = t.inicio + t.substituto.length;
  return resposta.inicio < fim && resposta.fim > t.inicio;
}

/** O tipo que a medição registra para o item. */
export function tipoDoItem(item: ItemDoAcheOErro): TipoDeTroca | 'sem_troca' {
  return item.troca?.tipo ?? 'sem_troca';
}

/** O texto de "o que foi" do Erro: descreve a resposta sem repetir a frase falsa. */
export function oQueFoi(item: ItemDoAcheOErro, resposta: RespostaDoItem): string {
  const onde = `em ${item.referencia} (Ache o erro)`;
  if (resposta.tipo === 'certa') return `Dei como certa uma troca ${onde}`;
  if (item.troca === undefined) return `Vi troca onde não havia, ${onde}`;
  return `Não achei a troca ${onde}`;
}

const aleatorio = () => Math.floor(Math.random() * 2 ** 31);

/**
 * Uma rodada: primeiro os dispositivos a revisitar (sete dias depois), depois dispositivos ao acaso
 * das normas publicadas (coleções de súmulas e teses ficam de fora). Sem norma publicada, vazia.
 * `referenciaDe` monta "Título · Art. 1º, § 2º" a partir da árvore aberta.
 */
export async function montarRodada(
  repo: Repositorio,
  revisitar: readonly string[],
  referenciaDe: (aberta: Awaited<ReturnType<typeof abrirNorma>>, indice: number) => string,
  tamanho = ITENS_POR_RODADA,
  sortear: () => number = aleatorio,
): Promise<ItemDoAcheOErro[]> {
  const normas = (await normasPublicadas(repo)).filter((n) => (n.especie ?? 'norma') === 'norma');
  if (normas.length === 0) return [];
  const itens: ItemDoAcheOErro[] = [];
  const usados = new Set<string>();
  const abertas = new Map<string, Awaited<ReturnType<typeof abrirNorma>>>();
  const abrir = async (normaId: string) => {
    let aberta = abertas.get(normaId);
    if (!aberta) {
      aberta = await abrirNorma(repo, normaId);
      abertas.set(normaId, aberta);
    }
    return aberta;
  };
  const fonteDe = async (normaId: string, indice: number): Promise<FonteDoItem | undefined> => {
    const aberta = await abrir(normaId);
    const [item] = await lerJanela(repo, aberta, { inicio: indice, quantidade: 1 });
    if (!item?.texto || item.dispositivo.categoria !== 'normativo') return undefined;
    if (item.dispositivo.status !== 'vigente' || item.texto.trechos.some((t) => t.tachado)) {
      return undefined;
    }
    const gravado = item.texto.trechos.map((t) => t.texto).join('');
    const texto = gravado.trim();
    if (texto.length === 0 || texto.length > MAXIMO_DE_TEXTO) return undefined;
    return {
      normaId,
      dispositivoId: item.dispositivo.id,
      versaoId: aberta.versao.id,
      referencia: [aberta.norma.tituloCurto, referenciaDe(aberta, indice)]
        .filter(Boolean)
        .join(' · '),
      texto,
      deslocamento: gravado.length - gravado.trimStart().length,
    };
  };

  for (const dispositivoId of revisitar) {
    if (itens.length >= tamanho) break;
    const dispositivo = await repo.colecao('dispositivos').obter(dispositivoId);
    if (!dispositivo || !normas.some((n) => n.id === dispositivo.normaId)) continue;
    const aberta = await abrir(dispositivo.normaId);
    const indice = aberta.indiceDe.get(dispositivoId);
    if (indice === undefined) continue;
    const fonte = await fonteDe(dispositivo.normaId, indice);
    const item = fonte && montarItem(fonte, itens.length, sortear(), true);
    if (item) {
      itens.push(item);
      usados.add(dispositivoId);
    }
  }

  // Ao acaso, com um teto de tentativas: nem todo dispositivo dá troca.
  for (let tentativa = 0; itens.length < tamanho && tentativa < tamanho * 12; tentativa++) {
    const norma = normas[sortear() % normas.length];
    if (!norma) break;
    const aberta = await abrir(norma.id);
    const indice = sortear() % aberta.nos.length;
    const id = aberta.nos[indice]?.dispositivo.id;
    if (id === undefined || usados.has(id)) continue;
    const fonte = await fonteDe(norma.id, indice);
    const item = fonte && montarItem(fonte, itens.length, sortear());
    if (item) {
      itens.push(item);
      usados.add(id);
    }
  }
  return itens;
}

/**
 * A comparação do piloto: as Revisões, desde `desde`, dos Cartões de lacuna feitos de Frases
 * desses mesmos dispositivos (acerto = resposta diferente de "Errei"). Tudo local.
 */
export async function compararComLacuna(
  repo: Repositorio,
  dispositivoIds: readonly string[],
  desde: string,
): Promise<{ total: number; acertos: number }> {
  const ids = new Set(dispositivoIds);
  if (ids.size === 0) return { total: 0, acertos: 0 };
  const frases = new Set<string>();
  for (const id of ids) {
    const lista = await todos(repo.colecao('frases'), {
      indice: 'trecho.dispositivoId',
      de: id,
      ate: id,
    });
    for (const f of lista) frases.add(f.id);
  }
  if (frases.size === 0) return { total: 0, acertos: 0 };
  const u = repo.ctx.usuarioId;
  const cartoes = await todos(repo.colecao('cartoes'), {
    indice: 'usuarioId',
    de: u,
    ate: u,
    filtro: (c) => c.tipo === 'lacuna' && c.fraseId !== undefined && frases.has(c.fraseId),
  });
  const r = { total: 0, acertos: 0 };
  for (const c of cartoes) {
    const revisoes = await todos(repo.colecao('revisoes'), {
      indice: 'cartaoId',
      de: c.id,
      ate: c.id,
      filtro: (rev) => rev.em >= desde,
    });
    r.total += revisoes.length;
    r.acertos += revisoes.filter((rev) => rev.resposta !== 'errei').length;
  }
  return r;
}
