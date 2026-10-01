// Do rascunho do estruturador aos registros do modelo (F2, 9.2): a Norma, um Dispositivo e um
// TextoDeDispositivo por nó, e a fonte (os blocos sanitizados, Parte 2 §13.1, item 8) que vira o
// Anexo da versão. Puro: o serviço (`servico.ts`) grava; o teste confere o corpus inteiro contra os
// esquemas sem banco.
import { z } from 'zod';
import type { Norma, TextoDeDispositivo, TipoDispositivo, VersaoDeNorma } from '../../core/modelo';
import type { Dados } from '../../core/persistencia';
import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import { jsonCanonico } from '../../core/util/json-canonico';
import { emOrdemDeLeitura } from './ordem';
import type {
  FormatoEntrada,
  MetadadosNorma,
  NoRascunho,
  NotaDeVigencia,
  RedacaoAnterior,
} from './rascunho';

/** Como a norma chegou; `edicao_manual` é do editor (etapa 10), não da importação. */
export type OrigemImportacao = Exclude<VersaoDeNorma['origemEntrada'], 'edicao_manual'>;

/** Texto puro fica "a confirmar" (regra 12); colar, URL e arquivo são HTML sanitizado. */
export const formatoDaOrigem = (origem: VersaoDeNorma['origemEntrada']): FormatoEntrada =>
  origem === 'texto' ? 'texto' : 'html';

// Limites do modelo: o excedente de uma página hostil é cortado, não recusa a norma inteira.
const MAX_CURTO = 500; // TextoCurto
const MAX_LONGO = 200_000; // TextoLongo
const MAX_RENUMERADO = 200; // Dispositivo.renumeradoDe
const MAX_NOTA = 2_000; // nota de vigência e nota da redação anterior

/**
 * Os primeiros `max - 1` caracteres e reticências. Não parte um par substituto (emoji, símbolo
 * astral): a metade solta vira "�" na tela e o Postgres do espelho (F4) recusa o texto.
 */
function comReticencias(t: string, max: number): string {
  let fim = max - 1;
  const ultimo = t.charCodeAt(fim - 1);
  if (ultimo >= 0xd800 && ultimo <= 0xdbff) fim -= 1;
  return `${t.slice(0, fim).trimEnd()}…`;
}

/** Aparado e cortado no limite, com reticências; vazio vira ausente (os campos são opcionais). */
function cortar(texto: string | undefined, max: number): string | undefined {
  const t = texto?.trim();
  if (!t) return undefined;
  return t.length <= max ? t : comReticencias(t, max);
}

/** Sem as chaves de valor `undefined`: o registro gravado não guarda chave vazia. */
function semVazios<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;
}

// ── Norma ───────────────────────────────────────────────────────────────────

const CONECTIVOS = new Set(
  'a à ao aos as às com da das de do dos e em na nas no nos o os ou para pela pelas pelo pelos por'.split(
    ' ',
  ),
);

/** "CÓDIGO PENAL" → "Código Penal"; texto que já tem minúscula fica como está. */
function emTitulo(texto: string): string {
  if (/\p{Ll}/u.test(texto)) return texto;
  let primeira = true;
  return texto.toLocaleLowerCase('pt-BR').replace(/\p{L}+/gu, (palavra) => {
    const manter = !primeira && CONECTIVOS.has(palavra);
    primeira = false;
    return manter ? palavra : palavra.charAt(0).toLocaleUpperCase('pt-BR') + palavra.slice(1);
  });
}

/**
 * Título curto sugerido (o único obrigatório na tela, 9.5): o título em caixa alta ("Código
 * Penal"), senão tipo e número ("Lei nº 7.210/1984"), senão a epígrafe ("Constituição da
 * República Federativa do Brasil de 1988").
 */
export function sugerirTituloCurto(m: MetadadosNorma): string {
  const candidatos = [
    m.tituloOficial === undefined ? undefined : emTitulo(m.tituloOficial),
    m.tipo !== undefined && m.referencia !== undefined ? `${m.tipo} nº ${m.referencia}` : undefined,
    m.epigrafe === undefined ? undefined : emTitulo(m.epigrafe.replace(/[\s.]+$/u, '')),
  ];
  for (const candidato of candidatos) {
    const titulo = cortar(candidato, MAX_CURTO);
    if (titulo !== undefined) return titulo;
  }
  return 'Norma sem título';
}

type MetadadosDaNorma = Pick<
  Norma,
  'tituloOficial' | 'referencia' | 'tipo' | 'epigrafe' | 'ementa' | 'preambulo'
>;

/** Os metadados da regra 2, nos limites do modelo; ausente fica `undefined` (remove na atualização). */
export function metadadosDaNorma(m: MetadadosNorma): MetadadosDaNorma {
  return {
    tituloOficial: cortar(m.tituloOficial, MAX_CURTO),
    referencia: cortar(m.referencia, MAX_CURTO),
    tipo: cortar(m.tipo, MAX_CURTO),
    epigrafe: cortar(m.epigrafe, MAX_LONGO),
    ementa: cortar(m.ementa, MAX_LONGO),
    preambulo: cortar(m.preambulo, MAX_LONGO),
  };
}

/** Título e URL em branco (campo opcional deixado vazio) contam como ausentes. */
export function dadosDaNorma(
  m: MetadadosNorma,
  extra: { tituloCurto?: string; urlOficial?: string; fonteConsultadaEm?: string },
): Dados<'normas'> {
  return semVazios({
    tituloCurto: cortar(extra.tituloCurto, MAX_CURTO) ?? sugerirTituloCurto(m),
    escopo: 'pessoal' as const,
    ...metadadosDaNorma(m),
    urlOficial: extra.urlOficial?.trim() || undefined,
    fonteConsultadaEm: extra.fonteConsultadaEm,
  });
}

type NotaMaisRecente = NonNullable<VersaoDeNorma['notaVigenciaMaisRecente']>;

/** A nota mais recente nos limites do modelo; lei vazia ou ano impossível: sem nota (a F6 compara os dois). */
export function notaMaisRecenteDoModelo(
  nota: NotaMaisRecente | undefined,
): NotaMaisRecente | undefined {
  const lei = cortar(nota?.lei, MAX_CURTO);
  if (!nota || lei === undefined || !Number.isInteger(nota.ano)) return undefined;
  return nota.ano >= 1800 && nota.ano <= 2100 ? { lei, ano: nota.ano } : undefined;
}

// ── Árvore ──────────────────────────────────────────────────────────────────

const ESTRUTURAIS = new Set<TipoDispositivo>([
  'parte',
  'livro',
  'titulo',
  'capitulo',
  'secao',
  'subsecao',
  'bloco',
]);

/**
 * Estrutural: parte a subseção e o bloco (ADCT), e o nome (rubrica) deles, que é o título do nó
 * (os filtros do leitor mantêm os estruturais como contexto). O resto é normativo: preâmbulo,
 * artigo a item, o nome do artigo e do dispositivo, o anexo (texto bruto).
 */
export function categoriaDe(no: NoRascunho, pai?: NoRascunho): 'estrutural' | 'normativo' {
  const tipo = no.tipo === 'nome' && pai ? pai.tipo : no.tipo;
  return ESTRUTURAIS.has(tipo) ? 'estrutural' : 'normativo';
}

/** O rótulo como a gravação o guarda (TextoCurto): a validação do rascunho usa o mesmo, para as frases baterem. */
export const rotuloDoModelo = (rotulo: string | undefined): string | undefined =>
  cortar(rotulo, MAX_CURTO);

type TrechoDoModelo = TextoDeDispositivo['trechos'][number];
type NotaDoModelo = NonNullable<TextoDeDispositivo['notasVigencia']>[number];
type RedacaoDoModelo = NonNullable<TextoDeDispositivo['redacoesAnteriores']>[number];

const paraTrecho = (t: Trecho): TrechoDoModelo =>
  semVazios({ texto: t.texto, tachado: t.tachado, enfase: t.enfase, link: t.link });

/** Sem `tipo` e `linha`, que o modelo não guarda (a espécie se relê do texto: `tipoDaNota`). */
const paraNota = (n: NotaDeVigencia): NotaDoModelo =>
  semVazios({
    texto: n.texto.length <= MAX_NOTA ? n.texto : comReticencias(n.texto, MAX_NOTA),
    lei: cortar(n.lei, MAX_CURTO),
    ano: n.ano !== undefined && n.ano >= 1800 && n.ano <= 2100 ? n.ano : undefined,
    link: n.link,
  });

/**
 * As notas da norma inteira (entre a epígrafe e a ementa; CP 11, CDC 14) vão para
 * `VersaoDeNorma.notasDaNorma`; nenhuma vira ausente: vazia, a lista não é gravada.
 */
export function notasDaNormaDoModelo(notas: readonly NotaDeVigencia[]): NotaDoModelo[] | undefined {
  return notas.length > 0 ? notas.map(paraNota) : undefined;
}

const paraRedacao = (r: RedacaoAnterior): RedacaoDoModelo =>
  semVazios({
    trechos: r.trechos.map(paraTrecho),
    nota: cortar(r.nota, MAX_NOTA),
    origemDeteccao: r.origemDeteccao,
    confirmada: r.confirmada,
  });

export interface RegistrosDaArvore {
  /** Na ordem de leitura; o pai vem antes do filho. */
  dispositivos: { id: string; dados: Dados<'dispositivos'> }[];
  /** Um por dispositivo, inclusive o estrutural e o revogado sem texto (o leitor não trata ausência). */
  textos: { id?: string; dados: Dados<'textosDispositivo'> }[];
}

export interface IdsDaArvore {
  normaId: string;
  versaoId: string;
  novoId: () => string;
  /**
   * A árvore já gravada, ao refazê-la (retomar depois de o estruturador mudar): os ids de cada
   * endereço, na ordem de leitura (endereço repetido, LC 80), e o id do texto de cada dispositivo.
   * O mesmo endereço mantém os ids: um backup anterior importado por mesclagem (modos 2 e 4) acha
   * os mesmos registros em vez de criar uma segunda árvore.
   */
  anteriores?: {
    dispositivos: ReadonlyMap<string, readonly string[]>;
    textos: ReadonlyMap<string, string>;
  };
}

/**
 * Um Dispositivo por nó (D11), com `ordem` = posição de leitura e `paiId` (`emOrdemDeLeitura`), e
 * o texto dele nesta versão.
 */
export function registrosDaArvore(nos: readonly NoRascunho[], ids: IdsDaArvore): RegistrosDaArvore {
  const { normaId, versaoId } = ids;
  const idDe = new Map<NoRascunho, string>();
  const livres = new Map(
    [...(ids.anteriores?.dispositivos ?? [])].map(([endereco, lista]) => [endereco, [...lista]]),
  );
  const saida: RegistrosDaArvore = { dispositivos: [], textos: [] };
  for (const { no, pai, ordem } of emOrdemDeLeitura(nos)) {
    const id = livres.get(no.endereco)?.shift() ?? ids.novoId();
    const textoId = ids.anteriores?.textos.get(id);
    idDe.set(no, id);
    saida.dispositivos.push({
      id,
      dados: semVazios({
        normaId,
        endereco: no.endereco,
        categoria: categoriaDe(no, pai),
        tipo: no.tipo,
        ordem,
        paiId: pai && idDe.get(pai),
        rotulo: rotuloDoModelo(no.rotulo),
        // `vetado` (8.6) ainda não está no modelo: grava vigente, com o texto "(VETADO)".
        status: no.status === 'vetado' ? 'vigente' : no.status,
        renumeradoDe: cortar(no.renumeradoDe, MAX_RENUMERADO),
        confianca: no.confianca,
      }),
    });
    saida.textos.push({
      ...(textoId === undefined ? {} : { id: textoId }),
      dados: semVazios({
        versaoId,
        dispositivoId: id,
        normaId,
        trechos: no.trechos.map(paraTrecho),
        notasVigencia: no.notas.length > 0 ? no.notas.map(paraNota) : undefined,
        redacoesAnteriores:
          no.redacoesAnteriores.length > 0 ? no.redacoesAnteriores.map(paraRedacao) : undefined,
      }),
    });
  }
  return saida;
}

// ── Fonte ───────────────────────────────────────────────────────────────────

export const NOME_FONTE = 'fonte-sanitizada.json';
/** Os blocos sanitizados em JSON canônico: mesmo conteúdo, mesmos bytes, mesmo hash. */
export const TIPO_FONTE = 'application/json';

/** Bytes da fonte: o hash da versão e o do anexo são deles (conteúdo sanitizado, nunca a página). */
export function serializarFonte(blocos: readonly Bloco[]): Uint8Array {
  return new TextEncoder().encode(jsonCanonico(blocos));
}

// A fonte volta de um backup (dado externo): conferida como o sanitizador a entrega.
const FonteDeNorma = z.array(
  z.strictObject({
    trechos: z.array(
      z.strictObject({
        texto: z.string(),
        tachado: z.literal(true).optional(),
        enfase: z.literal(true).optional(),
        link: z.url({ protocol: /^https?$/ }).optional(),
      }),
    ),
  }),
);

export class FonteIlegivel extends Error {
  constructor() {
    super('A fonte guardada não está no formato dos blocos sanitizados.');
    this.name = 'FonteIlegivel';
  }
}

export function lerFonte(bytes: Uint8Array): Bloco[] {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new FonteIlegivel();
  }
  const lido = FonteDeNorma.safeParse(json);
  if (!lido.success) throw new FonteIlegivel();
  return lido.data;
}
