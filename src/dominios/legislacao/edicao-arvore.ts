// Edição do rascunho por linha (F2, 10.2; Parte 2 §10.6, "Editor de rascunho/correção"): a parte
// pura. A árvore gravada vira uma lista de linhas na ordem do texto (a rubrica antes do dispositivo
// que ela nomeia; o nome do nó estrutural dentro da linha dele), a operação mexe na lista e `reconstruir`
// devolve a árvore: pai por sequência (a mesma regra 6 do estruturador), endereço, categoria,
// rótulo/número dos que a operação deixou sem número e `ordem` de leitura. O usuário nunca digita
// endereço nem recuo: escolhe o tipo. Quem grava a diferença é `edicao.ts`.
import type { Dispositivo, TextoDeDispositivo, TipoDispositivo } from '../../core/modelo';
import { chaveDeCasamento } from './normalizacao';
import { lerInicioDeArtigo } from './artigo';
import { lerRotuloDeDispositivo } from './dispositivo';
import { lerRotuloEstrutural, romano } from './estrutura';
import type { Linha } from './linhas';

export type Trechos = TextoDeDispositivo['trechos'];
export type Notas = NonNullable<TextoDeDispositivo['notasVigencia']>;
export type Redacoes = NonNullable<TextoDeDispositivo['redacoesAnteriores']>;

export class EdicaoInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'EdicaoInvalida';
  }
}

/** O que o texto de um dispositivo guarda nesta versão. */
export interface Conteudo {
  trechos: Trechos;
  notas: Notas;
  redacoes: Redacoes;
}

/** Nome (rubrica) do nó estrutural, que a linha do nó leva junto. */
export interface NomeDoNo extends Conteudo {
  id: string;
  textoId?: string;
  confianca: Dispositivo['confianca'];
  endereco?: string;
  ordem?: number;
}

export interface LinhaDeEdicao extends Conteudo {
  id: string;
  /** Ausente na linha nova. */
  textoId?: string;
  tipo: TipoDispositivo;
  rotulo?: string;
  /** O último segmento do endereço; vazio = a linha ainda não tem número (o sistema numera). */
  segmento: string;
  status: Dispositivo['status'];
  renumeradoDe?: string;
  confianca: Dispositivo['confianca'];
  /** Só no nó estrutural: o nome dele (a linha mostra rótulo e nome juntos). */
  nome?: NomeDoNo;
  /** Como estava gravada; ausente na linha nova. */
  antes?: {
    tipo: TipoDispositivo;
    segmento: string;
    paiId?: string;
    endereco: string;
    ordem: number;
  };
}

export interface DispositivoDeSaida {
  id: string;
  textoId?: string;
  dados: {
    endereco: string;
    categoria: 'estrutural' | 'normativo';
    tipo: TipoDispositivo;
    ordem: number;
    paiId?: string;
    rotulo?: string;
    status: Dispositivo['status'];
    renumeradoDe?: string;
    confianca: Dispositivo['confianca'];
  };
  texto: Conteudo;
}

// ── Tipos e posições na hierarquia ──────────────────────────────────────────

export const ESTRUTURAIS: ReadonlySet<TipoDispositivo> = new Set([
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'subsecao',
]);
/** Os que levam o nome (rubrica) junto na linha. */
const COM_NOME: ReadonlySet<TipoDispositivo> = new Set([...ESTRUTURAIS, 'bloco']);

/** Profundidade por sequência: o novo fica sob o último de nível menor (0 = raiz). */
const NIVEL: Partial<Record<TipoDispositivo, number>> = {
  parte: 1,
  livro: 2,
  titulo: 3,
  capitulo: 4,
  secao: 5,
  subsecao: 6,
  artigo: 7,
  caput: 7,
  paragrafo: 8,
  inciso: 9,
  alinea: 10,
  item: 11,
};
const FOLHAS_NA_RAIZ: ReadonlySet<TipoDispositivo> = new Set([
  'preambulo',
  'ementa',
  'anexo',
  'sumula',
  'tese',
]);
const nivelDe = (tipo: TipoDispositivo) => NIVEL[tipo] ?? 0;
const NIVEL_DO_ARTIGO = 7;

/** Para onde uma linha pode ser convertida (o menu "converter linha em…"). */
export type ConverterEm =
  | 'caput'
  | 'artigo'
  | 'paragrafo'
  | 'inciso'
  | 'alinea'
  | 'item'
  | 'nome'
  | 'nota'
  | 'redacao'
  | 'parte'
  | 'livro'
  | 'titulo'
  | 'capitulo'
  | 'secao'
  | 'subsecao';

export const OPCOES_DE_CONVERSAO: readonly { valor: ConverterEm; rotulo: string }[] = [
  { valor: 'caput', rotulo: 'Caput do artigo de cima' },
  { valor: 'artigo', rotulo: 'Artigo' },
  { valor: 'paragrafo', rotulo: 'Parágrafo' },
  { valor: 'inciso', rotulo: 'Inciso' },
  { valor: 'alinea', rotulo: 'Alínea' },
  { valor: 'item', rotulo: 'Item' },
  { valor: 'nome', rotulo: 'Nome do artigo' },
  { valor: 'nota', rotulo: 'Nota de vigência da linha de cima' },
  { valor: 'redacao', rotulo: 'Redação anterior da linha de cima' },
  { valor: 'parte', rotulo: 'Parte' },
  { valor: 'livro', rotulo: 'Livro' },
  { valor: 'titulo', rotulo: 'Título' },
  { valor: 'capitulo', rotulo: 'Capítulo' },
  { valor: 'secao', rotulo: 'Seção' },
  { valor: 'subsecao', rotulo: 'Subseção' },
];

/** Tipos cuja linha pode ser convertida, juntada ou dividida (o resto não tem equivalente em outro tipo). */
const EDITAVEIS: ReadonlySet<TipoDispositivo> = new Set([
  ...ESTRUTURAIS,
  'nome',
  'artigo',
  'caput',
  'paragrafo',
  'inciso',
  'alinea',
  'item',
]);
/** Os que a divisão cria de novo com número próprio. */
const DIVISIVEIS: ReadonlySet<TipoDispositivo> = new Set([
  'artigo',
  'paragrafo',
  'inciso',
  'alinea',
  'item',
]);

// ── Texto ───────────────────────────────────────────────────────────────────

/** Texto simples → trechos; quem edita escolhe palavras, não formatação. A quebra de linha vira trecho "\n". */
export function trechosSimples(texto: string): Trechos {
  const trechos: Trechos = [];
  texto
    .replace(/\r\n?/g, '\n')
    .trim()
    .split('\n')
    .forEach((linha, k) => {
      if (k > 0) trechos.push({ texto: '\n' });
      if (linha.trim() !== '') trechos.push({ texto: linha.trim() });
    });
  return trechos;
}

export const textoDosTrechos = (trechos: Trechos): string => trechos.map((t) => t.texto).join('');

/** O rótulo escrito no começo da linha, para o texto que passa para outra linha não perdê-lo. */
function rotuloNoTexto(l: LinhaDeEdicao): string {
  if (!l.rotulo) return '';
  if (l.tipo === 'inciso') return `${l.rotulo} - `;
  return `${l.rotulo} `;
}

/**
 * Une dois textos: espaço se a linha de cima ficou no meio da frase (e o corpo de baixo começa em
 * minúscula), senão quebra de linha.
 */
function unir(cima: Trechos, baixo: Trechos, corpo: Trechos): Trechos {
  const a = textoDosTrechos(cima).trimEnd();
  const b = textoDosTrechos(corpo).trimStart();
  if (a === '') return baixo;
  if (b === '' && textoDosTrechos(baixo).trim() === '') return cima;
  const continua = !/[.:;!?)”"]$/.test(a) && /^\p{Ll}/u.test(b);
  return [...cima, { texto: continua ? ' ' : '\n' }, ...baixo];
}

const corpoDaLinha = (l: LinhaDeEdicao): Trechos => (l.nome ? l.nome.trechos : l.trechos);

/** O texto da linha; `comRotulo` mantém o rótulo escrito, para quem junta não perdê-lo. */
function textoDaLinha(l: LinhaDeEdicao, comRotulo: boolean): Trechos {
  const rotulo = comRotulo ? rotuloNoTexto(l) : '';
  return rotulo ? [{ texto: rotulo }, ...corpoDaLinha(l)] : corpoDaLinha(l);
}

// ── Numeração ───────────────────────────────────────────────────────────────

const PREFIXO_ESTRUTURAL: Record<string, string> = {
  parte: 'parte',
  livro: 'liv',
  titulo: 'tit',
  capitulo: 'cap',
  secao: 'sec',
  subsecao: 'subsec',
};
const PALAVRA_ESTRUTURAL: Record<string, string> = {
  parte: 'PARTE',
  livro: 'LIVRO',
  titulo: 'TÍTULO',
  capitulo: 'CAPÍTULO',
  secao: 'SEÇÃO',
  subsecao: 'SUBSEÇÃO',
};

const ROMANOS: readonly [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function numeroRomano(n: number): string {
  let resto = n;
  let saida = '';
  for (const [valor, letras] of ROMANOS) {
    while (resto >= valor) {
      saida += letras;
      resto -= valor;
    }
  }
  return saida;
}

/** O número de um segmento ("art9A" → 9, "incIII" → 3, "alB" → 2, "parUnico" → 1); 0 se não tem. */
function numeroDoSegmento(tipo: TipoDispositivo, segmento: string): number {
  const prefixo =
    PREFIXO_ESTRUTURAL[tipo] ??
    { artigo: 'art', caput: 'art', paragrafo: 'par', inciso: 'inc', alinea: 'al', item: 'it' }[
      tipo as string
    ];
  if (prefixo === undefined || !segmento.startsWith(prefixo)) return 0;
  const resto = segmento.slice(prefixo.length);
  if (tipo === 'inciso') return romano(/^[IVXLCDM]+/.exec(resto)?.[0] ?? '');
  if (tipo === 'alinea') return (resto.charCodeAt(0) || 64) - 64;
  if (/^[ÚU]nico/.test(resto)) return 1;
  return Number(/^\d+/.exec(resto)?.[0] ?? 0);
}

/** Rótulo de exibição e segmento do endereço do número `n` do tipo. */
function numerado(tipo: TipoDispositivo, n: number): { rotulo: string; segmento: string } {
  const ordinal = n < 10 ? 'º' : '';
  switch (tipo) {
    case 'artigo':
    case 'caput':
      return {
        rotulo: `Art. ${n >= 1000 ? n.toLocaleString('pt-BR') : String(n)}${ordinal}`,
        segmento: `art${String(n)}`,
      };
    case 'paragrafo':
      return { rotulo: `§ ${String(n)}${ordinal}`, segmento: `par${String(n)}` };
    case 'inciso': {
      const r = numeroRomano(n);
      return { rotulo: r, segmento: `inc${r}` };
    }
    case 'alinea': {
      if (n > 26) throw new EdicaoInvalida('Não há mais letras para as alíneas deste trecho.');
      const letra = String.fromCharCode(96 + n);
      return { rotulo: `${letra})`, segmento: `al${letra.toUpperCase()}` };
    }
    case 'item':
      return { rotulo: `${String(n)}.`, segmento: `it${String(n)}` };
    default:
      return {
        rotulo: `${PALAVRA_ESTRUTURAL[tipo] ?? ''} ${numeroRomano(n)}`,
        segmento: `${PREFIXO_ESTRUTURAL[tipo] ?? tipo}${String(n)}`,
      };
  }
}

/**
 * O segmento que um rótulo digitado dá ("Art. 6º" → `art6`, "§ 2º-A" → `par2A`, "III" →
 * `incIII`, "b)" → `alB`, "CAPÍTULO IV" → `cap4`); `undefined` se o rótulo não é do tipo (a
 * correção então muda só o que está escrito, como na 10.1).
 */
export function segmentoDoRotulo(tipo: TipoDispositivo, rotulo: string): string | undefined {
  const texto = rotulo.trim();
  if (texto === '') return undefined;
  if (tipo === 'artigo') {
    const lido = lerInicioDeArtigo(chaveDeCasamento(`${texto} x`));
    return lido?.endereco;
  }
  const linha = (conteudo: string): Linha => ({
    i: 0,
    trechos: [{ texto: conteudo }],
    texto: conteudo,
    chave: chaveDeCasamento(conteudo),
    tachada: false,
  });
  if (ESTRUTURAIS.has(tipo)) {
    const lido = lerRotuloEstrutural(linha(`${texto} x`));
    return lido?.tipo === tipo ? lido.segmento : undefined;
  }
  if (tipo === 'paragrafo' || tipo === 'inciso' || tipo === 'alinea' || tipo === 'item') {
    const lido = lerRotuloDeDispositivo(linha(`${texto} - x`));
    return lido?.tipo === tipo ? lido.segmento : undefined;
  }
  return undefined;
}

// ── Carregar ────────────────────────────────────────────────────────────────

/**
 * As linhas na ordem do texto, a partir da árvore gravada (em ordem de leitura). O nome do nó
 * estrutural entra na linha dele; a rubrica do artigo vem antes do artigo, como no texto da lei.
 */
export function linhasDoRascunho(
  dispositivos: readonly Dispositivo[],
  textos: ReadonlyMap<string, TextoDeDispositivo>,
): LinhaDeEdicao[] {
  const porId = new Map(dispositivos.map((d) => [d.id, d]));
  const linhaDe = new Map<string, LinhaDeEdicao>();
  const linhas: LinhaDeEdicao[] = [];
  for (const d of dispositivos) {
    const t = textos.get(d.id);
    const conteudo: Conteudo = {
      trechos: t?.trechos ?? [],
      notas: t?.notasVigencia ?? [],
      redacoes: t?.redacoesAnteriores ?? [],
    };
    const pai = d.paiId === undefined ? undefined : porId.get(d.paiId);
    const linhaPai = pai && linhaDe.get(pai.id);
    if (d.tipo === 'nome' && pai && linhaPai && COM_NOME.has(pai.tipo) && !linhaPai.nome) {
      linhaPai.nome = {
        id: d.id,
        ...(t ? { textoId: t.id } : {}),
        confianca: d.confianca,
        endereco: d.endereco,
        ordem: d.ordem,
        ...conteudo,
      };
      continue;
    }
    const linha: LinhaDeEdicao = {
      id: d.id,
      ...(t ? { textoId: t.id } : {}),
      tipo: d.tipo,
      ...(d.rotulo === undefined ? {} : { rotulo: d.rotulo }),
      segmento: d.endereco.slice(d.endereco.lastIndexOf('.') + 1),
      status: d.status,
      ...(d.renumeradoDe === undefined ? {} : { renumeradoDe: d.renumeradoDe }),
      confianca: d.confianca,
      antes: {
        tipo: d.tipo,
        segmento: d.endereco.slice(d.endereco.lastIndexOf('.') + 1),
        ...(d.paiId === undefined ? {} : { paiId: d.paiId }),
        endereco: d.endereco,
        ordem: d.ordem,
      },
      ...conteudo,
    };
    linhaDe.set(d.id, linha);
    // A rubrica do artigo (e de qualquer pai que não seja nó) vem antes do pai, no texto.
    const posicao = d.tipo === 'nome' && linhaPai ? linhas.indexOf(linhaPai) : -1;
    if (posicao >= 0) linhas.splice(posicao, 0, linha);
    else linhas.push(linha);
  }
  return linhas;
}

// ── Reconstruir ─────────────────────────────────────────────────────────────

/**
 * Onde está cada linha: pai por sequência (regra 6) e a rubrica, que se pendura no dispositivo
 * seguinte (o artigo; no CP também o parágrafo e o inciso: art. 13, § 1º).
 */
function acharPais(linhas: readonly LinhaDeEdicao[]): (number | undefined)[] {
  const nivelNa = (i: number) => nivelDe(linhas[i]?.tipo ?? 'nome');
  const pais: (number | undefined)[] = [];
  const pilha: number[] = [];
  linhas.forEach((l, i) => {
    if (l.tipo === 'nome') {
      let j = i + 1;
      while (linhas[j]?.tipo === 'nome') j++;
      if (nivelNa(j) >= NIVEL_DO_ARTIGO) pais[i] = j;
      else {
        let topo = pilha.length - 1;
        while (topo >= 0 && nivelNa(pilha[topo] ?? 0) >= NIVEL_DO_ARTIGO) topo--;
        pais[i] = topo >= 0 ? pilha[topo] : undefined;
      }
      return;
    }
    if (FOLHAS_NA_RAIZ.has(l.tipo)) {
      // Preâmbulo e anexo ficam na raiz, não guardam nada e encerram o que estava aberto.
      pilha.length = 0;
      pais[i] = undefined;
      return;
    }
    const nivel = nivelDe(l.tipo);
    while (pilha.length > 0 && nivelNa(pilha[pilha.length - 1] ?? 0) >= nivel) pilha.pop();
    pais[i] = pilha[pilha.length - 1];
    pilha.push(i);
  });
  return pais;
}

/** Dá número às linhas sem segmento: o seguinte ao anterior do mesmo tipo e pai, no primeiro livre. */
function numerar(linhas: LinhaDeEdicao[], pais: readonly (number | undefined)[]): void {
  const blocoDe = (i: number): number => {
    for (let p = pais[i]; p !== undefined; p = pais[p]) if (linhas[p]?.tipo === 'bloco') return p;
    return -1;
  };
  const grupo = (i: number): string => {
    const l = linhas[i];
    if (!l) return '';
    return l.tipo === 'artigo' || l.tipo === 'caput'
      ? `art|${String(blocoDe(i))}`
      : `${l.tipo}|${String(pais[i] ?? -1)}`;
  };
  linhas.forEach((l, i) => {
    if (l.segmento !== '') return;
    if (l.tipo === 'nome') {
      l.segmento = 'nome';
      delete l.rotulo;
      return;
    }
    const chave = grupo(i);
    const usados = new Set<number>();
    let anterior = 0;
    linhas.forEach((x, j) => {
      if (j === i || x.segmento === '' || grupo(j) !== chave) return;
      const n = numeroDoSegmento(x.tipo, x.segmento);
      usados.add(n);
      if (j < i) anterior = n;
    });
    let n = anterior + 1;
    while (usados.has(n)) n++;
    const { rotulo, segmento } = numerado(l.tipo, n);
    l.rotulo = rotulo;
    l.segmento = segmento;
  });
}

const medida = (inicio: number, fim: number, n: number) => (fim - inicio) / (n + 1);

/**
 * `ordem` (número) de cada dispositivo: o que já tinha e continua crescente fica como está; o novo
 * ou movido leva um valor entre os vizinhos (a F6 faz o mesmo). Se faltar espaço, renumera tudo.
 */
export function atribuirOrdem(
  sequencia: readonly { id: string; antes?: number }[],
): Map<string, number> {
  const ordem = new Map<string, number>();
  let ultimo = Number.NEGATIVE_INFINITY;
  let i = 0;
  while (i < sequencia.length) {
    const item = sequencia[i];
    if (!item) break;
    if (item.antes !== undefined && item.antes > ultimo) {
      ordem.set(item.id, item.antes);
      ultimo = item.antes;
      i++;
      continue;
    }
    let j = i + 1;
    while (j < sequencia.length) {
      const a = sequencia[j]?.antes;
      if (a !== undefined && a > ultimo) break;
      j++;
    }
    const fim = sequencia[j]?.antes;
    const inicio = Number.isFinite(ultimo) ? ultimo : 0;
    const quantos = j - i;
    const passo = fim === undefined ? 1 : medida(inicio, fim, quantos);
    if (passo < 1e-6) return new Map(sequencia.map((s, k) => [s.id, k + 1]));
    for (let k = 0; k < quantos; k++) {
      const alvo = sequencia[i + k];
      if (alvo) ordem.set(alvo.id, inicio + passo * (k + 1));
    }
    ultimo = inicio + passo * quantos;
    i = j;
  }
  return ordem;
}

/**
 * A árvore das linhas, em ordem de leitura: pais, endereços, números dos que não têm, `ordem`.
 * Muda `rotulo` e `segmento` das linhas sem número. A linha que não mudou de tipo, de número nem
 * de pai (e cujo pai manteve o endereço) conserva o endereço gravado: só o que a operação mexeu
 * é recalculado.
 */
export function reconstruir(linhas: LinhaDeEdicao[]): DispositivoDeSaida[] {
  const pais = acharPais(linhas);
  numerar(linhas, pais);
  const filhos = new Map<number, number[]>();
  const raizes: number[] = [];
  pais.forEach((p, i) => {
    if (p === undefined) raizes.push(i);
    else filhos.set(p, [...(filhos.get(p) ?? []), i]);
  });
  const enderecos: string[] = [];
  const mudou: boolean[] = [];
  const saida: DispositivoDeSaida[] = [];
  const blocoDe = (i: number): number | undefined => {
    for (let p = pais[i]; p !== undefined; p = pais[p]) if (linhas[p]?.tipo === 'bloco') return p;
    return undefined;
  };
  const emitir = (i: number) => {
    const l = linhas[i];
    if (!l) return;
    const p = pais[i];
    const pai = p === undefined ? undefined : linhas[p];
    const base = pai ? (enderecos[p ?? 0] ?? '') : '';
    const bloco = blocoDe(i);
    const prefixo =
      l.tipo === 'artigo' || l.tipo === 'caput'
        ? bloco === undefined
          ? ''
          : `${enderecos[bloco] ?? ''}.`
        : base
          ? `${base}.`
          : '';
    const calculado = `${prefixo}${l.tipo === 'nome' ? 'nome' : l.segmento}`;
    const igual =
      l.antes?.tipo === l.tipo &&
      l.antes.segmento === l.segmento &&
      l.antes.paiId === (pai?.id ?? undefined) &&
      !(p !== undefined && mudou[p]);
    const endereco = igual && l.antes ? l.antes.endereco : calculado;
    enderecos[i] = endereco;
    mudou[i] = l.antes?.endereco !== endereco;
    const estrutural = ESTRUTURAIS.has(l.tipo) || l.tipo === 'bloco';
    saida.push({
      id: l.id,
      ...(l.textoId ? { textoId: l.textoId } : {}),
      dados: {
        endereco,
        categoria:
          estrutural || (l.tipo === 'nome' && !!pai && COM_NOME.has(pai.tipo))
            ? 'estrutural'
            : 'normativo',
        tipo: l.tipo,
        ordem: 0,
        ...(pai ? { paiId: pai.id } : {}),
        ...(l.rotulo ? { rotulo: l.rotulo } : {}),
        status: l.status,
        ...(l.renumeradoDe ? { renumeradoDe: l.renumeradoDe } : {}),
        confianca: l.confianca,
      },
      texto: { trechos: l.trechos, notas: l.notas, redacoes: l.redacoes },
    });
    if (l.nome && COM_NOME.has(l.tipo)) {
      const nome = l.nome;
      const nomeEndereco = nome.endereco && !mudou[i] ? nome.endereco : `${endereco}.nome`;
      saida.push({
        id: nome.id,
        ...(nome.textoId ? { textoId: nome.textoId } : {}),
        dados: {
          endereco: nomeEndereco,
          categoria: 'estrutural',
          tipo: 'nome',
          ordem: 0,
          paiId: l.id,
          status: 'vigente',
          confianca: nome.confianca,
        },
        texto: { trechos: nome.trechos, notas: nome.notas, redacoes: nome.redacoes },
      });
    }
    for (const f of filhos.get(i) ?? []) emitir(f);
  };
  for (const r of raizes) emitir(r);
  const antes = new Map<string, number | undefined>();
  for (const l of linhas) {
    antes.set(l.id, l.antes?.ordem);
    if (l.nome) antes.set(l.nome.id, l.nome.ordem);
  }
  const ordem = atribuirOrdem(saida.map((s) => ({ id: s.id, antes: antes.get(s.id) })));
  for (const s of saida) s.dados.ordem = ordem.get(s.id) ?? 0;
  return saida;
}

// ── Operações ───────────────────────────────────────────────────────────────

function linhaEditavel(linhas: readonly LinhaDeEdicao[], id: string): number {
  const i = linhas.findIndex((l) => l.id === id || l.nome?.id === id);
  if (i < 0) throw new EdicaoInvalida('Linha não encontrada.');
  const tipo = linhas[i]?.tipo;
  if (tipo === undefined || !EDITAVEIS.has(tipo)) {
    throw new EdicaoInvalida('Esta linha não pode ser alterada aqui.');
  }
  return i;
}

/** Tira a linha da lista e entrega o texto, as notas e as redações dela para quem ficou. */
function juntarEm(
  alvo: LinhaDeEdicao,
  origem: LinhaDeEdicao,
  como: 'texto' | 'nota' | 'redacao',
  comRotulo = true,
): void {
  const trechos = textoDaLinha(origem, como === 'texto' && comRotulo);
  const notas = [...origem.notas, ...(origem.nome?.notas ?? [])];
  const redacoes = [...origem.redacoes, ...(origem.nome?.redacoes ?? [])];
  if (como === 'texto') {
    const corpo = corpoDaLinha(origem);
    if (alvo.nome) alvo.nome.trechos = unir(alvo.nome.trechos, trechos, corpo);
    else alvo.trechos = unir(alvo.trechos, trechos, corpo);
    alvo.notas = [...alvo.notas, ...notas];
    alvo.redacoes = [...alvo.redacoes, ...redacoes];
  } else if (como === 'nota') {
    const texto = textoDosTrechos(trechos).replace(/\s+/g, ' ').trim();
    alvo.notas = [...alvo.notas, ...(texto ? [{ texto: texto.slice(0, 2_000) }] : []), ...notas];
    alvo.redacoes = [...alvo.redacoes, ...redacoes];
  } else {
    alvo.notas = [...alvo.notas, ...notas];
    alvo.redacoes = [
      ...alvo.redacoes,
      { trechos, origemDeteccao: 'heuristica', confirmada: true },
      ...redacoes,
    ];
  }
}

/** Troca o tipo de uma linha; o número vem do sistema. Devolve a lista nova. */
export function converterNaLista(
  linhas: LinhaDeEdicao[],
  id: string,
  para: ConverterEm,
  novoId: () => string,
): LinhaDeEdicao[] {
  const i = linhaEditavel(linhas, id);
  const l = linhas[i];
  if (!l) return linhas;
  if (l.tipo === para) return linhas;
  if (para === 'nota' || para === 'redacao' || para === 'caput') {
    let alvoIndice = i - 1;
    if (para === 'caput') {
      alvoIndice = -1;
      for (let k = i - 1; k >= 0; k--) {
        if (linhas[k]?.tipo === 'artigo') {
          alvoIndice = k;
          break;
        }
      }
      if (alvoIndice < 0) throw new EdicaoInvalida('Não há artigo acima desta linha.');
    }
    const alvo = linhas[alvoIndice];
    if (!alvo) throw new EdicaoInvalida('Não há linha acima desta.');
    juntarEm(alvo, l, para === 'caput' ? 'texto' : para, false);
    return linhas.filter((x) => x !== l);
  }
  const eraEstrutural = COM_NOME.has(l.tipo);
  const seraEstrutural = ESTRUTURAIS.has(para);
  if (eraEstrutural && !seraEstrutural) {
    // O nome vira o texto da linha; as notas do nó e as do nome passam juntas.
    l.trechos = l.nome?.trechos ?? [];
    l.notas = [...l.notas, ...(l.nome?.notas ?? [])];
    l.redacoes = [...l.redacoes, ...(l.nome?.redacoes ?? [])];
    delete l.nome;
  } else if (!eraEstrutural && seraEstrutural) {
    // O texto vira o nome do nó (que não tem texto próprio); notas e redações ficam no nó.
    l.nome = {
      id: novoId(),
      confianca: l.confianca,
      trechos: l.trechos,
      notas: [],
      redacoes: [],
    };
    l.trechos = [];
  }
  l.tipo = para;
  l.segmento = '';
  delete l.rotulo;
  return linhas;
}

/** Junta a linha à de cima: o texto se une, e as notas e redações vão juntas. */
export function juntarNaLista(linhas: LinhaDeEdicao[], id: string): LinhaDeEdicao[] {
  const i = linhaEditavel(linhas, id);
  const l = linhas[i];
  const acima = linhas[i - 1];
  if (!l || i === 0 || !acima) throw new EdicaoInvalida('Não há linha acima desta.');
  if (!EDITAVEIS.has(acima.tipo) && acima.tipo !== 'bloco') {
    throw new EdicaoInvalida('A linha de cima não aceita texto de outra.');
  }
  juntarEm(acima, l, 'texto');
  return linhas.filter((x) => x !== l);
}

/** Divide o texto da linha em `posicao`: a segunda parte é uma linha nova do mesmo tipo. */
export function dividirNaLista(
  linhas: LinhaDeEdicao[],
  id: string,
  texto: string,
  posicao: number,
  novoId: () => string,
): LinhaDeEdicao[] {
  const i = linhaEditavel(linhas, id);
  const l = linhas[i];
  if (!l) return linhas;
  if (!DIVISIVEIS.has(l.tipo)) {
    throw new EdicaoInvalida('Esta linha não pode ser dividida; converta-a antes.');
  }
  const completo = texto.replace(/\r\n?/g, '\n');
  const corte = Math.min(Math.max(0, Math.floor(posicao)), completo.length);
  const antes = trechosSimples(completo.slice(0, corte));
  const depois = trechosSimples(completo.slice(corte));
  if (antes.length === 0 || depois.length === 0) {
    throw new EdicaoInvalida('Coloque o cursor no meio do texto para dividir.');
  }
  // Nota de vigência fica no fim do texto, por isso acompanha a segunda parte.
  const nova: LinhaDeEdicao = {
    id: novoId(),
    tipo: l.tipo,
    segmento: '',
    status: 'vigente',
    confianca: 'a_confirmar',
    trechos: depois,
    notas: l.notas,
    redacoes: [],
  };
  l.trechos = antes;
  l.notas = [];
  return [...linhas.slice(0, i + 1), nova, ...linhas.slice(i + 1)];
}
