// Do rascunho do estruturador (ou das seções do Markdown) ao item do acervo, com a porta de
// qualidade (spec §8): item com anomalia não vai para o site sozinho. Puro: o CLI lê e grava.
import { novoId } from '../../src/core/ids';
import {
  ItemDoAcervo,
  type EntradaDoIndice,
  type NoDoItem,
} from '../../src/dominios/acervo/esquemas';
import { hashDoItem } from '../../src/dominios/acervo/hash';
import type { Rascunho } from '../../src/dominios/legislacao/rascunho';
import { lerInicioDeArtigo } from '../../src/dominios/legislacao/artigo';
import { lerRotuloEstrutural } from '../../src/dominios/legislacao/estrutura';
import { ABRE_CITACAO, estruturar, fechaCitacao } from '../../src/dominios/legislacao/estruturador';
import { prepararLinhas, type Linha } from '../../src/dominios/legislacao/linhas';
import { normalizarBlocos } from '../../src/dominios/legislacao/normalizacao';
import { metadadosDaNorma, registrosDaArvore } from '../../src/dominios/legislacao/registros';
import type { Bloco, Trecho } from '../../src/core/seguranca/sanitizador';
import type { ItemDaCuradoria } from './curadoria';
import { markdownParaSecoes, type SecaoDoMarkdown } from './markdown';

export interface ResultadoDaConstrucao {
  id: string;
  /** Ausente quando há bloqueio. */
  item?: ItemDoAcervo;
  /** Por que o item não vai para o site (conflito, aviso não aceito, árvore inválida). */
  bloqueios: string[];
  /** Contagem por tipo de anomalia do estruturador (para o relatório). */
  anomalias: Record<string, number>;
  nos: number;
  aConfirmar: number;
}

const corte = (texto: string | undefined, max: number): string | undefined =>
  texto === undefined || texto.length === 0 ? undefined : texto.slice(0, max);

/** Pai antes do filho e endereço único: o que a adesão exige (`conferirArvore`). */
export function arvoreValida(
  nos: readonly Pick<NoDoItem, 'endereco' | 'pai'>[],
): string | undefined {
  const vistos = new Set<string>();
  for (const no of nos) {
    if (vistos.has(no.endereco)) return `endereço repetido: ${no.endereco}`;
    if (no.pai !== undefined && !vistos.has(no.pai)) return `pai antes do filho: ${no.endereco}`;
    vistos.add(no.endereco);
  }
  return undefined;
}

function nosDoRascunho(rascunho: Rascunho): NoDoItem[] {
  const arvore = registrosDaArvore(rascunho.nos, { normaId: 'n', versaoId: 'v', novoId });
  // Fonte que repete a numeração estrutural (LC 80: duas "SEÇÃO IV" no mesmo capítulo) só avisa no
  // estruturador; aqui a segunda ocorrência ganha o sufixo `x2` para o endereço ficar único.
  const vezes = new Map<string, number>();
  const finais = arvore.dispositivos.map((d) => {
    const n = (vezes.get(d.dados.endereco) ?? 0) + 1;
    vezes.set(d.dados.endereco, n);
    return n > 1 && d.dados.categoria === 'estrutural'
      ? `${d.dados.endereco}x${String(n)}`
      : d.dados.endereco;
  });
  const enderecoDe = new Map(arvore.dispositivos.map((d, i) => [d.id, finais[i] as string]));
  return arvore.dispositivos.map((d, i) => {
    const t = (arvore.textos[i] as (typeof arvore.textos)[number]).dados;
    const pai = d.dados.paiId === undefined ? undefined : enderecoDe.get(d.dados.paiId);
    return {
      endereco: finais[i] as string,
      categoria: d.dados.categoria,
      tipo: d.dados.tipo,
      ...(d.dados.rotulo === undefined ? {} : { rotulo: d.dados.rotulo }),
      status: d.dados.status,
      ...(d.dados.renumeradoDe === undefined ? {} : { renumeradoDe: d.dados.renumeradoDe }),
      confianca: d.dados.confianca,
      ...(pai === undefined ? {} : { pai }),
      trechos: t.trechos,
      ...(t.notasVigencia === undefined ? {} : { notasVigencia: t.notasVigencia }),
      ...(t.redacoesAnteriores === undefined ? {} : { redacoesAnteriores: t.redacoesAnteriores }),
    };
  });
}

/** Regra dos documentos sem artigos: um Anexo e, sob ele, um bloco por título `#`, aninhados pelo nível. */
export function nosDeSecoes(titulo: string, secoes: readonly SecaoDoMarkdown[]): NoDoItem[] {
  const nos: NoDoItem[] = [
    {
      endereco: 'anexo',
      categoria: 'estrutural',
      tipo: 'anexo',
      rotulo: corte(titulo, 200),
      status: 'vigente',
      confianca: 'alta',
      trechos: [],
    },
  ];
  const pilha: { nivel: number; endereco: string }[] = [{ nivel: 0, endereco: 'anexo' }];
  let contador = 0;
  const corpo = (paragrafos: Trecho[][]): Trecho[] =>
    paragrafos.flatMap((p, i) => (i === 0 ? p : [{ texto: '\n' }, ...p]));
  for (const s of secoes) {
    if (s.nivel === 0) {
      // Texto antes do primeiro título: fica no próprio Anexo.
      (nos[0] as NoDoItem).trechos = corpo(s.corpo);
      continue;
    }
    while (pilha.length > 1 && (pilha[pilha.length - 1] as { nivel: number }).nivel >= s.nivel)
      pilha.pop();
    const pai = (pilha[pilha.length - 1] as { endereco: string }).endereco;
    const endereco = `${pai}.b${String(++contador)}`;
    nos.push({
      endereco,
      categoria: 'normativo',
      tipo: 'bloco',
      rotulo: corte(s.titulo, 200) ?? `Bloco ${String(contador)}`,
      status: 'vigente',
      confianca: 'alta',
      pai,
      trechos: corpo(s.corpo),
    });
    pilha.push({ nivel: s.nivel, endereco });
  }
  return nos;
}

function contar(anomalias: readonly { tipo: string }[]): Record<string, number> {
  const por: Record<string, number> = {};
  for (const a of anomalias) por[a.tipo] = (por[a.tipo] ?? 0) + 1;
  return por;
}

export function montar(
  cur: ItemDaCuradoria,
  nos: NoDoItem[],
  norma: Partial<ItemDoAcervo['norma']>,
  coletadoEm: string,
  urlOficial: string | undefined,
): ItemDoAcervo {
  return ItemDoAcervo.parse({
    id: cur.id,
    versao: cur.versao,
    norma: {
      tituloCurto: cur.tituloCurto ?? cur.titulo,
      ...norma,
      ...(cur.tipo === undefined ? {} : { tipo: cur.tipo }),
      ...(cur.esfera === undefined ? {} : { esfera: cur.esfera }),
      ...(cur.especie === undefined ? {} : { especie: cur.especie }),
      ...(urlOficial === undefined ? {} : { urlOficial }),
      fonteConsultadaEm: coletadoEm,
    },
    nos,
  });
}

/** Tira os cabeçalhos que casam com algum padrão e a linha do nome logo abaixo (`cabecalhosSemNivel`). */
export function semCabecalhos(blocos: readonly Bloco[], padroes: readonly string[]): Bloco[] {
  if (padroes.length === 0) return [...blocos];
  const res = padroes.map((p) => new RegExp(p, 'u'));
  const saida: Bloco[] = [];
  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i] as Bloco;
    const texto = bloco.trechos
      .map((t) => t.texto)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (res.some((re) => re.test(texto))) i++;
    else saida.push(bloco);
  }
  return saida;
}

/** A maior citação de outra lei no acervo (as partes vetadas e mantidas da Lei 8.112) tem umas 40 linhas. */
const MAX_BLOCOS_DA_CITACAO = 200;

/**
 * Separa os blocos que `juntarCitacoes` junta. Um caractere de uso privado, porque a normalização
 * do estruturador desfaria uma quebra de linha (espaço); `restaurarQuebras` o troca por "\n".
 */
const QUEBRA = '\uE000';

const numeroDoArtigo = (chave: string): number | undefined => {
  const n = /^art(\d+)/.exec(lerInicioDeArtigo(chave)?.endereco ?? '')?.[1];
  return n === undefined ? undefined : Number(n);
};

/** Abre uma citação que começa num artigo ('"Art. 157. …') ou num título, capítulo ou seção ('"CAPÍTULO I-A'). */
const abreCitacaoDeDispositivo = (l: Linha): boolean => {
  if (!ABRE_CITACAO.test(l.chave)) return false;
  const resto = { ...l, chave: l.chave.slice(1).trimStart(), texto: l.texto.slice(1).trimStart() };
  return lerInicioDeArtigo(resto.chave) !== undefined || lerRotuloEstrutural(resto) !== undefined;
};

const aparar = (trechos: readonly Trecho[]): Trecho[] => {
  const copia = trechos.map((t) => ({ ...t }));
  const primeiro = copia[0];
  const ultimo = copia[copia.length - 1];
  if (primeiro) primeiro.texto = primeiro.texto.trimStart();
  if (ultimo) ultimo.texto = ultimo.texto.trimEnd();
  return copia;
};

/** Aspa de sobra na linha (a chave já as traz uniformes): a linha abre ou fecha uma citação. */
const temAspaDeSobra = (l: Linha): boolean => (l.chave.match(/"/g)?.length ?? 0) % 2 === 1;

/**
 * Citação de outra lei que atravessa vários artigos (Lei 8.072, art. 6º: '"Art. 157. …', "Art.
 * 159. …", '…."'; Lei 8.112, partes vetadas e mantidas). A aspa só abre no primeiro e fecha no
 * último, e o estruturador encerra a citação no primeiro "Art." sem aspa: os artigos da outra lei
 * viram artigos desta, ou, depois do fecho, refazem os da própria lei com o texto antigo. Aqui o
 * que vai da aspa que abre à que fecha vira um bloco só, que ele lê como a citação que é (o
 * fecho é a primeira linha com aspa de sobra: aspas de um trecho no meio, como 'alínea "b").',
 * não fecham).
 *
 * Só junta se a citação abre num dispositivo da outra lei e tem um artigo no meio. Se antes do
 * fecho vier o artigo desta lei (o do dispositivo de cima ou o seguinte) ou um título, capítulo ou
 * seção, a aspa não fechou na fonte e tudo fica como estava.
 */
export function juntarCitacoes(blocos: readonly Bloco[]): Bloco[] {
  // As linhas são as do estruturador (blocos normalizados: sem o espaço na frente do "Art." do Planalto).
  const linhas = new Map(prepararLinhas(normalizarBlocos(blocos).blocos).map((l) => [l.i, l]));
  const saida: Bloco[] = [];
  let artigo = 0;
  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i] as Bloco;
    const l = linhas.get(i);
    if (!l) {
      saida.push(bloco);
      continue;
    }
    const fim = abreCitacaoDeDispositivo(l) && temAspaDeSobra(l) ? fimDaCitacao(i) : undefined;
    if (fim === undefined) {
      artigo = numeroDoArtigo(l.chave) ?? artigo;
      saida.push(bloco);
      continue;
    }
    const trechos = aparar(bloco.trechos);
    for (let j = i + 1; j <= fim; j++)
      if (linhas.has(j)) trechos.push({ texto: QUEBRA }, ...aparar((blocos[j] as Bloco).trechos));
    saida.push({ trechos });
    i = fim;
  }
  return saida;

  /** Onde a citação que abre em `de` fecha, ou `undefined` se não há artigo no meio ou ela não fecha. */
  function fimDaCitacao(de: number): number | undefined {
    let comArtigo = false;
    for (let j = de + 1; j < blocos.length && j <= de + MAX_BLOCOS_DA_CITACAO; j++) {
      const m = linhas.get(j);
      if (!m) continue;
      const n = numeroDoArtigo(m.chave);
      if (n === artigo || n === artigo + 1 || lerRotuloEstrutural(m)) return undefined;
      if (n !== undefined) comArtigo = true;
      if (temAspaDeSobra(m)) return comArtigo && fechaCitacao(m) ? j : undefined;
    }
    return undefined;
  }
}

type TrechoDoNo = NoDoItem['trechos'][number];

/** Troca a `QUEBRA` de `juntarCitacoes` por uma quebra de linha, como o estruturador faz nas citações. */
export function restaurarQuebras(nos: readonly NoDoItem[]): NoDoItem[] {
  const quebrar = (trechos: readonly TrechoDoNo[]): TrechoDoNo[] =>
    trechos.flatMap((t) =>
      t.texto.includes(QUEBRA)
        ? t.texto
            .split(QUEBRA)
            .flatMap((parte, k): TrechoDoNo[] => [
              ...(k > 0 ? [{ texto: '\n' }] : []),
              ...(parte === '' ? [] : [{ ...t, texto: parte }]),
            ])
        : [t],
    );
  return nos.map((no) => ({
    ...no,
    trechos: quebrar(no.trechos),
    ...(no.redacoesAnteriores && {
      redacoesAnteriores: no.redacoesAnteriores.map((r) => ({ ...r, trechos: quebrar(r.trechos) })),
    }),
  }));
}

/** Item de lei articulada: passa pelo estruturador e pela porta de qualidade. */
export function construirItemArticulado(
  cur: ItemDaCuradoria,
  blocos: readonly Bloco[],
  coletadoEm: string,
  urlOficial: string | undefined,
): ResultadoDaConstrucao {
  const rascunho = estruturar(juntarCitacoes(semCabecalhos(blocos, cur.cabecalhosSemNivel)), {
    formato: 'html',
  });
  const nos = restaurarQuebras(nosDoRascunho(rascunho));
  const bloqueios: string[] = [];
  const aceitas = new Set<string>(cur.anomaliasAceitas);
  const agrupadas = new Map<string, { n: number; mensagem: string; conflito: boolean }>();
  for (const a of rascunho.anomalias) {
    const g = agrupadas.get(a.tipo) ?? {
      n: 0,
      mensagem: a.mensagem,
      conflito: a.gravidade === 'conflito',
    };
    g.n++;
    agrupadas.set(a.tipo, g);
  }
  for (const [tipo, g] of agrupadas) {
    if (g.conflito) bloqueios.push(`conflito (${tipo}, ${String(g.n)}x): ${g.mensagem}`);
    else if (!aceitas.has(tipo))
      bloqueios.push(`aviso não aceito (${tipo}, ${String(g.n)}x): ${g.mensagem}`);
  }
  const erro = arvoreValida(nos);
  if (erro) bloqueios.push(`árvore inválida: ${erro}`);
  if (JSON.stringify(nos).includes(QUEBRA)) bloqueios.push('quebra de citação fora dos trechos');
  const aConfirmar = nos.filter((n) => n.confianca === 'a_confirmar').length;
  const resultado: ResultadoDaConstrucao = {
    id: cur.id,
    bloqueios,
    anomalias: contar(rascunho.anomalias),
    nos: nos.length,
    aConfirmar,
  };
  if (bloqueios.length > 0) return resultado;
  const m = metadadosDaNorma(rascunho.metadados);
  const item = montar(
    cur,
    nos,
    {
      tituloOficial: cur.tituloOficial ?? m.tituloOficial,
      referencia: m.referencia,
      tipo: m.tipo,
      epigrafe: m.epigrafe,
      ementa: cur.ementa ?? m.ementa,
      preambulo: m.preambulo,
    },
    coletadoEm,
    urlOficial,
  );
  return { ...resultado, item };
}

/** Item sem artigos (Markdown): Anexo e blocos pelos títulos; a numeração sequencial não se aplica. */
export function construirItemSemArtigos(
  cur: ItemDaCuradoria,
  markdown: string,
  coletadoEm: string,
  urlOficial: string | undefined,
): ResultadoDaConstrucao {
  const secoes = markdownParaSecoes(markdown);
  const nos = nosDeSecoes(cur.titulo, secoes);
  const bloqueios: string[] = [];
  if (secoes.filter((s) => s.nivel > 0).length === 0)
    bloqueios.push('nenhum título "#" no Markdown');
  const erro = arvoreValida(nos);
  if (erro) bloqueios.push(`árvore inválida: ${erro}`);
  const resultado: ResultadoDaConstrucao = {
    id: cur.id,
    bloqueios,
    anomalias: {},
    nos: nos.length,
    aConfirmar: 0,
  };
  if (bloqueios.length > 0) return resultado;
  return { ...resultado, item: montar(cur, nos, {}, coletadoEm, urlOficial) };
}

/** Entrada do índice para um item pronto: tamanho em bytes do arquivo e hash do JSON canônico. */
export async function entradaDoIndice(
  cur: ItemDaCuradoria,
  item: ItemDoAcervo,
  corpoDoArquivo: string,
  coletadoEm: string,
  urlOficial: string | undefined,
): Promise<EntradaDoIndice> {
  return {
    id: cur.id,
    tipo: cur.especie ?? 'norma',
    titulo: cur.titulo,
    grupo: cur.grupo,
    vinculos: cur.vinculos,
    avisos: cur.avisos,
    tamanho: new TextEncoder().encode(corpoDoArquivo).length,
    versao: item.versao,
    hash: await hashDoItem(item),
    ...(urlOficial === undefined ? {} : { urlOficial }),
    coletadoEm,
  };
}
