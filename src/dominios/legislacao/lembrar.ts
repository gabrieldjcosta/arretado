// Lembrar e a porteira do Fio (fatia 2 do plano "Arquitetura do Fio", D-D25, 04/11/2026): a lacuna
// tirada do destaque (D-D17) com três opções da própria norma, e os cartões de certo ou errado da
// porteira, feitos das trocas do Ache o erro. Tudo sem IA e sem rede: a resposta certa está na lei
// que a pessoa acabou de ler. A parte pura (`gerarLacuna`, `gerarPergunta`, `gerarPorteira`) é
// determinística (mesma fonte e mesma semente, mesma pergunta); a parte que lê o banco
// (`montarLembrar`, `montarGuardar`, `montarPorteira`) só abre a norma e junta as fontes.
// A frase falsa da porteira vive só na memória: nunca vira Frase nem Cartão.
import type { Repositorio } from '../../core/persistencia';
import { fonteDoNo, type FonteDoItem } from './ache-o-erro';
import { detectarDestaques, type CategoriaDestaque } from './destaques';
import { abrirNorma, lerJanela, type NormaAberta } from './leitor';
import { aplicarTroca, escolherTroca, gerarTrocas, type Troca } from './trocas';

/** A porteira tem sempre três cartões (D-D25 §4). */
export const CARTOES_DA_PORTEIRA = 3;
/** Opções da lacuna: a certa e duas da norma. */
export const OPCOES_DA_LACUNA = 3;
/** Trecho escondido: curto o bastante para virar botão (um prazo, uma fração, uma palavra). */
const TAMANHO_MINIMO = 2;
const TAMANHO_MAXIMO = 60;
/** Teto de grifos guardados por categoria no conjunto de opções (a norma grande não pesa). */
const TETO_DE_GRIFOS_POR_CATEGORIA = 400;
/** Dispositivos lidos da norma para formar o conjunto de opções. */
const DISPOSITIVOS_PARA_OPCOES = 1_600;
/** Dispositivos de um artigo (caput, parágrafos, incisos) que entram como fonte. */
const DISPOSITIVOS_POR_ARTIGO = 24;

/** Um dispositivo do artigo, com o artigo a que pertence. */
export interface FonteDoArtigo extends FonteDoItem {
  artigoEndereco: string;
  artigoRotulo: string;
}

// ── Sorteio determinístico ──────────────────────────────────────────────────

/** Gerador de números em [0, 1) a partir de uma semente inteira (mulberry32). */
function gerador(semente: number): () => number {
  let a = Math.floor(Math.abs(semente)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Embaralha uma cópia (Fisher-Yates) com a semente. */
function embaralhar<T>(lista: readonly T[], semente: number): T[] {
  const saida = [...lista];
  const sorteio = gerador(semente);
  for (let i = saida.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [saida[i], saida[j]] = [saida[j] as T, saida[i] as T];
  }
  return saida;
}

/** Semente de um artigo: a do passo somada a um hash do endereço (o Guardar refaz a do Lembrar). */
function sementeDoArtigo(semente: number, endereco: string): number {
  let h = 0;
  for (const c of endereco) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return (Math.floor(Math.abs(semente)) + h) % 2_147_483_647;
}

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim();
const chave = (texto: string) => normalizar(texto).toLowerCase();

// ── Os grifos da norma (o conjunto de opções) ───────────────────────────────

/** Os destaques da norma por categoria, sem repetição, na ordem em que aparecem. */
export type GrifosDaNorma = ReadonlyMap<CategoriaDestaque, readonly string[]>;

export function reunirGrifos(textos: Iterable<string>): GrifosDaNorma {
  const porCategoria = new Map<CategoriaDestaque, string[]>();
  const vistos = new Map<CategoriaDestaque, Set<string>>();
  for (const texto of textos) {
    for (const d of detectarDestaques(texto)) {
      const trecho = normalizar(texto.slice(d.inicio, d.fim));
      if (trecho.length < TAMANHO_MINIMO || trecho.length > TAMANHO_MAXIMO) continue;
      const jaVistos = vistos.get(d.categoria) ?? new Set<string>();
      vistos.set(d.categoria, jaVistos);
      const lista = porCategoria.get(d.categoria) ?? [];
      porCategoria.set(d.categoria, lista);
      if (jaVistos.has(chave(trecho)) || lista.length >= TETO_DE_GRIFOS_POR_CATEGORIA) continue;
      jaVistos.add(chave(trecho));
      lista.push(trecho);
    }
  }
  return porCategoria;
}

// ── A lacuna ────────────────────────────────────────────────────────────────

/** Uma lacuna: o dispositivo com um destaque escondido e três opções, uma delas a certa. */
export interface Lacuna {
  fonte: FonteDoItem;
  /** O trecho escondido, `[inicio, fim)` em `fonte.texto`. */
  inicio: number;
  fim: number;
  categoria: CategoriaDestaque;
  /** O que a lei diz naquele lugar. */
  resposta: string;
  /** Três opções, na ordem da tela; a `resposta` é uma delas. */
  opcoes: readonly string[];
}

/**
 * As opções erradas para o trecho `[inicio, fim)`: primeiro uma troca do próprio trecho (cabe na
 * frase: "15 (quinze) dias" no lugar de "30 (trinta) dias"), depois destaques da mesma categoria
 * em outros pontos da norma. Nunca repete a resposta.
 */
function erradasPara(
  texto: string,
  inicio: number,
  fim: number,
  categoria: CategoriaDestaque,
  grifos: GrifosDaNorma,
  semente: number,
): string[] {
  const resposta = normalizar(texto.slice(inicio, fim));
  const trecho = texto.slice(inicio, fim);
  const doTrecho = gerarTrocas(texto)
    .filter((t) => t.inicio >= inicio && t.fim <= fim)
    .map((t) =>
      normalizar(aplicarTroca(trecho, { ...t, inicio: t.inicio - inicio, fim: t.fim - inicio })),
    );
  const daNorma = (grifos.get(categoria) ?? []).filter((g) => chave(g) !== chave(resposta));
  const proibidas = new Set([chave(resposta)]);
  const escolhidas: string[] = [];
  const tenta = (opcao: string | undefined) => {
    if (opcao === undefined || escolhidas.length >= OPCOES_DA_LACUNA - 1) return;
    if (proibidas.has(chave(opcao))) return;
    proibidas.add(chave(opcao));
    escolhidas.push(opcao);
  };
  const trocas = embaralhar(doTrecho, semente);
  const pool = embaralhar(daNorma, semente + 1);
  tenta(trocas[0]);
  for (const g of pool) tenta(g);
  for (const t of trocas.slice(1)) tenta(t);
  return escolhidas;
}

/**
 * A lacuna de um dispositivo: escolhe, pela semente, um destaque que tenha duas opções erradas
 * possíveis. Sem destaque assim, `undefined` (o chamador cai para o certo ou errado).
 */
export function gerarLacuna(
  fonte: FonteDoItem,
  grifos: GrifosDaNorma,
  semente: number,
): Lacuna | undefined {
  const destaques = detectarDestaques(fonte.texto).filter(
    (d) => d.fim - d.inicio >= TAMANHO_MINIMO && d.fim - d.inicio <= TAMANHO_MAXIMO,
  );
  if (destaques.length === 0) return undefined;
  const ordem = embaralhar(destaques, semente);
  for (const d of ordem) {
    const erradas = erradasPara(fonte.texto, d.inicio, d.fim, d.categoria, grifos, semente);
    if (erradas.length < OPCOES_DA_LACUNA - 1) continue;
    const resposta = fonte.texto.slice(d.inicio, d.fim);
    return {
      fonte,
      inicio: d.inicio,
      fim: d.fim,
      categoria: d.categoria,
      resposta,
      opcoes: embaralhar([resposta, ...erradas], semente + 2),
    };
  }
  return undefined;
}

/** A resposta certa? Compara pelo texto, sem espaços a mais. */
export function conferirLacuna(lacuna: Lacuna, opcao: string): boolean {
  return chave(opcao) === chave(lacuna.resposta);
}

// ── O certo ou errado (porteira e queda da lacuna) ──────────────────────────

/** Um cartão de certo ou errado: o texto como a tela o mostra, com troca ou sem ela. */
export interface CartaoCertoOuErrado {
  fonte: FonteDoItem;
  /** O que a tela mostra: o texto certo ou o trocado. */
  mostrado: string;
  /** A troca que tornou o texto falso; `undefined` quando o texto é o da lei. */
  troca: Troca | undefined;
}

export type RespostaCertoOuErrado = 'certo' | 'errado';

/**
 * O cartão do dispositivo, certo (o texto da lei) ou errado (uma troca). Só vale texto que dá troca
 * segura: sem ela, o cartão certo se entregaria por não ter o que trocar.
 */
export function montarCartao(
  fonte: FonteDoItem,
  certo: boolean,
  semente: number,
): CartaoCertoOuErrado | undefined {
  const troca = escolherTroca(fonte.texto, semente);
  if (!troca) return undefined;
  if (certo) return { fonte, mostrado: fonte.texto, troca: undefined };
  return { fonte, mostrado: aplicarTroca(fonte.texto, troca), troca };
}

/** Acertou? "Certo" acerta quando o texto é o da lei; "errado" quando há troca. */
export function conferirCartao(cartao: CartaoCertoOuErrado, resposta: RespostaCertoOuErrado) {
  return (resposta === 'certo') === (cartao.troca === undefined);
}

// ── A pergunta do Lembrar ───────────────────────────────────────────────────

export type PerguntaDoLembrar =
  { tipo: 'lacuna'; lacuna: Lacuna } | { tipo: 'certo_ou_errado'; cartao: CartaoCertoOuErrado };

/**
 * A pergunta de um dispositivo: a lacuna com três opções; se a norma não dá opções boas, o certo
 * ou errado do mesmo texto (o plano: "se ficar fácil demais, cai para certo ou errado"). Texto sem
 * destaque nem troca não gera pergunta.
 */
export function gerarPergunta(
  fonte: FonteDoItem,
  grifos: GrifosDaNorma,
  semente: number,
): PerguntaDoLembrar | undefined {
  const lacuna = gerarLacuna(fonte, grifos, semente);
  if (lacuna) return { tipo: 'lacuna', lacuna };
  // Na queda, 2 em 3 vêm com troca: mostrar sempre o falso viraria "tudo está errado".
  const cartao = montarCartao(fonte, semente % 3 === 0, semente);
  return cartao ? { tipo: 'certo_ou_errado', cartao } : undefined;
}

/** A pergunta de um artigo no Lembrar. */
export interface LembrarDoArtigo {
  artigoEndereco: string;
  artigoRotulo: string;
  pergunta: PerguntaDoLembrar;
}

/**
 * A porteira: três cartões (menos, se a norma não der) de dispositivos diferentes. É o passo que
 * intercala (ideia 4, "Fio que ensina"): só entra artigo já lido, e os cartões vêm de artigos
 * vizinhos entre os lidos, na ordem do código (furto, roubo, extorsão), um dispositivo de cada por volta, para a pessoa ter de
 * decidir qual é qual a cada cartão, não responder três vezes o mesmo assunto. A janela de vizinhos
 * muda com a semente. Um em três vem certo e os outros trocados, na posição que a semente sorteia;
 * com menos de dois cartões, o único vem trocado. Nunca repete o dispositivo.
 */
export function gerarPorteira(
  fontes: readonly FonteDoArtigo[],
  semente: number,
  quantidade = CARTOES_DA_PORTEIRA,
): CartaoCertoOuErrado[] {
  // Os artigos na ordem do código (a ordem em que a fonte os traz); os dispositivos de cada um,
  // embaralhados pela semente.
  const porArtigo = new Map<string, FonteDoArtigo[]>();
  const vistos = new Set<string>();
  for (const f of fontes) {
    if (vistos.has(f.dispositivoId) || gerarTrocas(f.texto).length === 0) continue;
    vistos.add(f.dispositivoId);
    const grupo = porArtigo.get(f.artigoEndereco) ?? [];
    porArtigo.set(f.artigoEndereco, grupo);
    grupo.push(f);
  }
  const todos = [...porArtigo.values()].map((g) => embaralhar(g, semente));
  // A janela de artigos vizinhos: `quantidade` seguidos, começando onde a semente cair.
  const janela = Math.min(quantidade, todos.length);
  const inicio = janela === 0 ? 0 : Math.abs(Math.floor(semente)) % (todos.length - janela + 1);
  const grupos = todos.slice(inicio, inicio + janela);
  // Um dispositivo de cada artigo por volta, até completar.
  const escolhidas: FonteDoArtigo[] = [];
  for (let volta = 0; escolhidas.length < quantidade; volta++) {
    let achou = false;
    for (const grupo of grupos) {
      const f = grupo[volta];
      if (!f) continue;
      achou = true;
      if (escolhidas.length < quantidade) escolhidas.push(f);
    }
    if (!achou) break;
  }
  const posicaoDoCerto =
    escolhidas.length >= 2 ? Math.abs(Math.floor(semente)) % escolhidas.length : -1;
  const cartoes: CartaoCertoOuErrado[] = [];
  escolhidas.forEach((f, i) => {
    const cartao = montarCartao(f, i === posicaoDoCerto, semente + i);
    if (cartao) cartoes.push(cartao);
  });
  return cartoes;
}

// ── Leitura do banco ────────────────────────────────────────────────────────

type ReferenciaDe = (aberta: NormaAberta, indice: number) => string;

/** O dispositivo do artigo (o próprio e os filhos: "art1", "art1.parUnico", "art1.inc2"). */
function indicesDoArtigo(aberta: NormaAberta, endereco: string): number[] {
  const indices: number[] = [];
  aberta.nos.forEach((no, i) => {
    const e = no.dispositivo.endereco;
    if (e === endereco || e.startsWith(`${endereco}.`)) indices.push(i);
  });
  return indices.slice(0, DISPOSITIVOS_POR_ARTIGO);
}

/** Os dispositivos de um artigo que servem de fonte (normativos vigentes, sem tachado). */
export async function fontesDoArtigo(
  repo: Repositorio,
  aberta: NormaAberta,
  artigo: { endereco: string; rotulo: string },
  referenciaDe: ReferenciaDe,
): Promise<FonteDoArtigo[]> {
  const fontes: FonteDoArtigo[] = [];
  for (const indice of indicesDoArtigo(aberta, artigo.endereco)) {
    const fonte = await fonteDoNo(repo, aberta, indice, referenciaDe);
    if (fonte) {
      fontes.push({ ...fonte, artigoEndereco: artigo.endereco, artigoRotulo: artigo.rotulo });
    }
  }
  return fontes;
}

/** Os destaques da norma, para as opções erradas: lê até `DISPOSITIVOS_PARA_OPCOES` textos. */
export async function grifosDaNorma(
  repo: Repositorio,
  aberta: NormaAberta,
): Promise<GrifosDaNorma> {
  const textos: string[] = [];
  const total = Math.min(aberta.nos.length, DISPOSITIVOS_PARA_OPCOES);
  for (let inicio = 0; inicio < total; inicio += 200) {
    const janela = await lerJanela(repo, aberta, {
      inicio,
      quantidade: Math.min(200, total - inicio),
    });
    for (const item of janela) {
      if (!item.texto || item.dispositivo.status !== 'vigente') continue;
      if (item.texto.trechos.some((t) => t.tachado)) continue;
      textos.push(item.texto.trechos.map((t) => t.texto).join(''));
    }
  }
  return reunirGrifos(textos);
}

/**
 * O Lembrar de um passo: uma pergunta por artigo (a primeira fonte do artigo, na ordem sorteada
 * pela semente, que dê pergunta). Artigo sem pergunta possível fica de fora; a tela conta só as
 * perguntas devolvidas. A mesma semente devolve as mesmas perguntas (sair e voltar não muda nada).
 */
export async function montarLembrar(
  repo: Repositorio,
  passo: { normaId: string; artigos: readonly { endereco: string; rotulo: string }[] },
  referenciaDe: ReferenciaDe,
  semente: number,
): Promise<LembrarDoArtigo[]> {
  const aberta = await abrirNorma(repo, passo.normaId);
  const grifos = await grifosDaNorma(repo, aberta);
  const saida: LembrarDoArtigo[] = [];
  for (const artigo of passo.artigos) {
    const fontes = await fontesDoArtigo(repo, aberta, artigo, referenciaDe);
    const s = sementeDoArtigo(semente, artigo.endereco);
    for (const fonte of embaralhar(fontes, s)) {
      const pergunta = gerarPergunta(fonte, grifos, s);
      if (pergunta) {
        saida.push({ artigoEndereco: artigo.endereco, artigoRotulo: artigo.rotulo, pergunta });
        break;
      }
    }
  }
  return saida;
}

/**
 * O Guardar de um passo: as mesmas perguntas do Lembrar que errou, de volta pela mesma semente,
 * para a tela mostrar a Frase certa de cada uma. O rótulo do artigo sai da árvore.
 */
export async function montarGuardar(
  repo: Repositorio,
  passo: { normaId: string; enderecos: readonly string[] },
  referenciaDe: ReferenciaDe,
  semente: number,
): Promise<LembrarDoArtigo[]> {
  const aberta = await abrirNorma(repo, passo.normaId);
  const grifos = await grifosDaNorma(repo, aberta);
  const saida: LembrarDoArtigo[] = [];
  for (const endereco of passo.enderecos) {
    const indice = aberta.nos.findIndex((n) => n.dispositivo.endereco === endereco);
    const rotulo = indice >= 0 ? referenciaDe(aberta, indice) : endereco;
    const fontes = await fontesDoArtigo(repo, aberta, { endereco, rotulo }, referenciaDe);
    const s = sementeDoArtigo(semente, endereco);
    for (const fonte of embaralhar(fontes, s)) {
      const pergunta = gerarPergunta(fonte, grifos, s);
      if (pergunta) {
        saida.push({ artigoEndereco: endereco, artigoRotulo: rotulo, pergunta });
        break;
      }
    }
  }
  return saida;
}

/**
 * A porteira de uma norma: cartões dos dispositivos dos artigos pedidos (os lidos da matéria,
 * escolhidos pela tela). Vazia quando nenhum dá troca segura: a tela pula o passo.
 */
export async function montarPorteira(
  repo: Repositorio,
  entrada: { normaId: string; artigos: readonly { endereco: string; rotulo: string }[] },
  referenciaDe: ReferenciaDe,
  semente: number,
  quantidade = CARTOES_DA_PORTEIRA,
): Promise<CartaoCertoOuErrado[]> {
  const aberta = await abrirNorma(repo, entrada.normaId);
  const fontes: FonteDoArtigo[] = [];
  for (const artigo of entrada.artigos) {
    fontes.push(...(await fontesDoArtigo(repo, aberta, artigo, referenciaDe)));
  }
  return gerarPorteira(fontes, semente, quantidade);
}
