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
import { estruturar } from '../../src/dominios/legislacao/estruturador';
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
  const enderecoDe = new Map(arvore.dispositivos.map((d) => [d.id, d.dados.endereco]));
  return arvore.dispositivos.map((d, i) => {
    const t = (arvore.textos[i] as (typeof arvore.textos)[number]).dados;
    const pai = d.dados.paiId === undefined ? undefined : enderecoDe.get(d.dados.paiId);
    return {
      endereco: d.dados.endereco,
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

function montar(
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

/** Item de lei articulada: passa pelo estruturador e pela porta de qualidade. */
export function construirItemArticulado(
  cur: ItemDaCuradoria,
  blocos: readonly Bloco[],
  coletadoEm: string,
  urlOficial: string | undefined,
): ResultadoDaConstrucao {
  const rascunho = estruturar(blocos, { formato: 'html' });
  const nos = nosDoRascunho(rascunho);
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
      tituloOficial: m.tituloOficial,
      referencia: m.referencia,
      tipo: m.tipo,
      epigrafe: m.epigrafe,
      ementa: m.ementa,
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
