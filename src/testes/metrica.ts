// Regressão do corpus (F2, 8.9): a métrica estruturador × gabarito da 7.3, por página. Pura (sem
// vitest e sem Node): recebe os dispositivos do rascunho (`dispositivosDe`) e as anomalias, e o
// gabarito; o teste do corpus (`estruturador-corpus.test.ts`) a roda nas 11 páginas, e
// `metrica.test.ts` a confere com rascunhos montados à mão. Mede o estruturador, nunca os registros
// corrigidos no editor (etapa 10). Não importa `scripts/corpus/gabarito.mjs`: o gabarito é o JSON.
import type { Anomalia } from '../dominios/legislacao/rascunho';
import {
  dispositivosEsperados,
  enderecosComTachadoParcial,
  paraComparar,
  type DispositivoEsperado,
  type DispositivoLido,
  type Gabarito,
} from './gabarito';

/** Piso das 7 páginas com todas as redações (Parte 2 §17: "≥ 95% dos dispositivos corretos"). */
export const PISO = 95;
/**
 * Piso das compiladas (8.9; a confirmar com o Gabriel, como a regra (c) que o sustenta): o que sobra
 * de diferença nelas é da fonte (a compilada omite o § 1º do art. 9º-A da LEP; no CP, o parágrafo
 * único antigo do art. 92 sem tachado na página, o art. 234 com outro rótulo, os §§ do art. 51 só
 * tachados e duas redações editoriais), cerca de 1% no CP; 98% deixa folga para outra atualização da
 * mesma espécie. Regressão, a linha de base pega (cada divergência fixada por endereço e motivo).
 */
export const PISO_DA_COMPILADA = 98;
/** Quantas divergências a mensagem do teste mostra (a lista em `divergencias` é inteira). */
export const LIMITE_DE_DIVERGENCIAS = 20;

/** Por que um dispositivo diverge do gabarito: só os quatro primeiros tiram do `corretos`. */
export type Motivo = 'ausente' | 'status' | 'notas' | 'texto' | 'redacoes' | 'a_mais';

export interface DivergenciaDaMetrica {
  endereco: string;
  motivos: Motivo[];
}

/** O que a métrica lê de cada dispositivo do rascunho (`DispositivoLido`, de `dispositivosDe`). */
export type DispositivoMedido = Pick<
  DispositivoLido,
  'endereco' | 'status' | 'renumerado' | 'texto' | 'notas' | 'noAncestral' | 'textosDasRedacoes'
>;

export interface RedacoesDaMetrica {
  /** As do gabarito, depois das regras (a) e (b). */
  esperadas: number;
  /** As do rascunho, em todos os dispositivos. */
  lidas: number;
  /** As lidas no endereço do gabarito, até o número esperado nele. */
  noEnderecoCerto: number;
  /** Dispositivos do gabarito com o mesmo número de redações que o rascunho. */
  dispositivosIguais: number;
  /** As que foram para o ancestral (`enderecoLido`) × `contagens.redacoesNoAncestral`. */
  noAncestral: { esperadas: number; lidas: number };
  /** Quantas a regra (a) tirou do gabarito e a (b) acrescentou. */
  tachadoParcial: number;
  sufixoSemHifen: number;
  /** `noEnderecoCerto` sobre `esperadas`, em % (100 sem nenhuma esperada). */
  percentual: number;
  /** Todas no endereço certo, nenhuma a mais, e as do ancestral na conta: os "100%" do portão. */
  completas: boolean;
}

export interface MetricaDaPagina {
  compilada: boolean;
  /** Dispositivos do gabarito que a página deve ter (artigo a item e anexo). */
  total: number;
  /** Fora do `total`: filhos do revogado que a compilada resume numa linha (regra (c)). */
  resumidos: number;
  /** Dispositivos do rascunho sem endereço no gabarito (entram no denominador). */
  aMais: number;
  /** Com o endereço do gabarito, o mesmo status, as mesmas notas e, na amostra, o mesmo texto. */
  corretos: number;
  /** `corretos` sobre `total + aMais`, em %. */
  percentual: number;
  /** Endereços repetidos no rascunho ou com conflito `endereco_duplicado`. */
  duplicados: string[];
  /** Ausente na compilada: ela não tem tachado, e as redações do gabarito são da outra página. */
  redacoes?: RedacoesDaMetrica;
  /**
   * Os dispositivos do rascunho com o status `renumerado` (regra 10), na ordem. O gabarito não lê a
   * renumeração (o renumerado é `vigente` nele): fora do `corretos`, fixados na linha de base.
   */
  renumerados: string[];
  /** Todas, na ordem do gabarito (as a mais no fim); a mensagem corta em `LIMITE_DE_DIVERGENCIAS`. */
  divergencias: DivergenciaDaMetrica[];
}

/**
 * Regra (b), o inciso com sufixo sem hífen que o gabarito não lê. Caso da página: a CF escreve o
 * VIII-A antigo do art. 93 sem hífen ("~~VIIIA a remoção a pedido…~~", EC 45/2004); o gabarito não
 * o lê como inciso e perde a linha, e o estruturador a anexa ao VIII-A (examinado na página na 8.6).
 * Reconhecida pela forma da redação no rascunho — o romano com a letra do sufixo colada, sem hífen,
 * e espaço depois — e por ser do próprio inciso (o segmento `inc…` do endereço tem o mesmo romano e
 * a mesma letra), nunca por lista de endereços. A letra fica fora das do romano (A, B, E…): "XC" e
 * "CD" são números. O inciso com hífen ("VIII-A -"), que o gabarito lê, não entra.
 */
const SUFIXO_SEM_HIFEN = /^([IVXLCDM]+)([ABEFGHJKNOPQRSTUWYZ])\s/u;

export function ehRedacaoDeSufixoSemHifen(texto: string, endereco: string): boolean {
  const m = SUFIXO_SEM_HIFEN.exec(texto.trimStart());
  return m !== null && endereco.endsWith(`.inc${m[1] ?? ''}${m[2] ?? ''}`);
}

/**
 * Redações que o rascunho deve ter no dispositivo: as do gabarito, já sem o tachado parcial (regra
 * (a), em `dispositivosEsperados`), mais as de sufixo sem hífen que o gabarito não tem (regra (b)):
 * só quando o rascunho tem mais que o gabarito, e até o número delas.
 */
export function redacoesEsperadas(
  esperado: Pick<DispositivoEsperado, 'endereco' | 'redacoes'>,
  lido?: Pick<DispositivoMedido, 'textosDasRedacoes'>,
): number {
  const lidas = lido?.textosDasRedacoes ?? [];
  const aMais = lidas.length - esperado.redacoes;
  if (aMais <= 0) return esperado.redacoes;
  const daForma = lidas.filter((t) => ehRedacaoDeSufixoSemHifen(t, esperado.endereco)).length;
  return esperado.redacoes + Math.min(aMais, daForma);
}

/**
 * Regra (c), só na compilada: o dispositivo de que algum ancestral está revogado no gabarito (a
 * página com todas as redações, que traz os filhos tachados) e que a compilada não tem. Ela resume
 * numa linha o revogado com os parágrafos (LEP, arts. 124 e 182; CP, arts. 188, 214, 231, 281…;
 * ECA, art. 233): sai do total, não é divergência. Se a compilada tiver o filho, ele conta.
 */
function filhoDeRevogado(endereco: string, status: ReadonlyMap<string, string>): boolean {
  const segmentos = endereco.split('.');
  for (let k = 1; k < segmentos.length; k++)
    if (status.get(segmentos.slice(0, k).join('.')) === 'revogado') return true;
  return false;
}

const porCento = (parte: number, todo: number) => (todo === 0 ? 100 : (100 * parte) / todo);

/**
 * A métrica de uma página. Correto: o primeiro dispositivo do rascunho com o endereço do gabarito
 * tem o mesmo status, o mesmo número de notas de vigência e, se está na amostra (vigente), o mesmo
 * texto e as mesmas notas por `paraComparar`. As redações se medem à parte (100% exigidos na página
 * com todas as redações), com as regras (a) e (b); a compilada (`compilada: true`) não as mede e
 * usa a regra (c).
 */
export function compararComGabarito(
  rascunho: {
    dispositivos: readonly DispositivoMedido[];
    anomalias: readonly Pick<Anomalia, 'tipo' | 'endereco'>[];
  },
  gabarito: Pick<Gabarito, 'dispositivos' | 'casos' | 'amostra' | 'contagens'>,
  { compilada = false }: { compilada?: boolean } = {},
): MetricaDaPagina {
  const esperados = dispositivosEsperados(gabarito);
  const parciais = enderecosComTachadoParcial(gabarito);
  const doGabarito = new Map(gabarito.dispositivos.map((g) => [g.endereco, g.redacoes]));
  const status = new Map(esperados.map((e) => [e.endereco, e.status]));
  const lidos = new Map<string, DispositivoMedido>();
  const duplicados = new Set<string>();
  for (const d of rascunho.dispositivos)
    if (lidos.has(d.endereco)) duplicados.add(d.endereco);
    else lidos.set(d.endereco, d);
  for (const a of rascunho.anomalias)
    if (a.tipo === 'endereco_duplicado' && a.endereco !== undefined) duplicados.add(a.endereco);

  const divergencias: DivergenciaDaMetrica[] = [];
  let total = 0;
  let resumidos = 0;
  let corretos = 0;
  const red = { esperadas: 0, noEnderecoCerto: 0, dispositivosIguais: 0, tachadoParcial: 0 };
  let sufixoSemHifen = 0;
  for (const e of esperados) {
    const lido = lidos.get(e.endereco);
    if (compilada && !lido && filhoDeRevogado(e.endereco, status)) {
      resumidos += 1;
      continue;
    }
    total += 1;
    const motivos: Motivo[] = [];
    if (!lido) motivos.push('ausente');
    else {
      if (lido.status !== e.status) motivos.push('status');
      const naAmostra = e.texto;
      if (
        lido.notas.length !== e.notas ||
        (naAmostra !== undefined &&
          lido.notas.map(paraComparar).join('\n') !== naAmostra.notas.map(paraComparar).join('\n'))
      )
        motivos.push('notas');
      if (naAmostra !== undefined && paraComparar(lido.texto) !== paraComparar(naAmostra.texto))
        motivos.push('texto');
    }
    if (motivos.length === 0) corretos += 1;
    if (!compilada) {
      const esperadas = redacoesEsperadas(e, lido);
      const lidas = lido?.textosDasRedacoes.length ?? 0;
      red.esperadas += esperadas;
      red.noEnderecoCerto += Math.min(lidas, esperadas);
      if (lidas === esperadas) red.dispositivosIguais += 1;
      else motivos.push('redacoes');
      if (parciais.has(e.endereco) && (doGabarito.get(e.endereco) ?? 0) > 0)
        red.tachadoParcial += 1;
      sufixoSemHifen += esperadas - e.redacoes;
    }
    if (motivos.length > 0) divergencias.push({ endereco: e.endereco, motivos });
  }
  const aMais = [...lidos.keys()].filter((endereco) => !status.has(endereco));
  for (const endereco of aMais) divergencias.push({ endereco, motivos: ['a_mais'] });

  const metrica: MetricaDaPagina = {
    compilada,
    total,
    resumidos,
    aMais: aMais.length,
    corretos,
    percentual: porCento(corretos, total + aMais.length),
    duplicados: [...duplicados],
    renumerados: rascunho.dispositivos.filter((d) => d.renumerado).map((d) => d.endereco),
    divergencias,
  };
  if (compilada) return metrica;
  const lidas = rascunho.dispositivos.reduce((n, d) => n + d.textosDasRedacoes.length, 0);
  const noAncestral = {
    esperadas: gabarito.contagens.redacoesNoAncestral,
    lidas: rascunho.dispositivos.reduce((n, d) => n + d.noAncestral, 0),
  };
  return {
    ...metrica,
    redacoes: {
      esperadas: red.esperadas,
      lidas,
      noEnderecoCerto: red.noEnderecoCerto,
      dispositivosIguais: red.dispositivosIguais,
      noAncestral,
      tachadoParcial: red.tachadoParcial,
      sufixoSemHifen,
      percentual: porCento(red.noEnderecoCerto, red.esperadas),
      completas:
        red.noEnderecoCerto === red.esperadas &&
        lidas === red.esperadas &&
        noAncestral.lidas === noAncestral.esperadas,
    },
  };
}

/** Os números de hoje de uma página, gravados no teste do corpus (`LINHA_DE_BASE`). */
export interface LinhaDeBase {
  corretos: number;
  /** O denominador: `total + aMais`. */
  de: number;
  /**
   * Cada divergência de hoje, como `descreverDivergencia` a escreve ("art47.incIII: notas"): nas 7
   * páginas com todas as redações, nenhuma; nas compiladas, as da fonte. Trocar uma por outra, com
   * a mesma contagem, não passa calado.
   */
  divergencias?: readonly string[];
  /** Os renumerados de hoje (`MetricaDaPagina.renumerados`): o gabarito não os confere. */
  renumerados?: readonly string[];
}

const fora = (de: readonly string[], em: readonly string[]) => {
  const conjunto = new Set(em);
  return de.filter((x) => !conjunto.has(x));
};

/** Uma lista da mensagem, cortada em `LIMITE_DE_DIVERGENCIAS`. */
function linhasDe(rotulo: string, itens: readonly string[]): string[] {
  const resto = itens.length - LIMITE_DE_DIVERGENCIAS;
  return [
    ...itens.slice(0, LIMITE_DE_DIVERGENCIAS).map((x) => `  ${rotulo}: ${x}`),
    ...(resto > 0 ? [`  ${rotulo}: … e mais ${milhar(resto)}`] : []),
  ];
}

/**
 * `undefined` quando a métrica bate com a linha de base (números, divergências e renumerados);
 * senão, a mensagem, com cada diferença. "caiu" quando o percentual cai, quando aparece divergência
 * nova (mesmo trocando uma por outra), quando some um dispositivo a mais (na compilada, a fonte o
 * tem: sumir é texto perdido, não melhora) ou quando um renumerado perde o status; "mudou" no resto
 * (subiu, renumerado novo, corpus com outro número de dispositivos). A causa pode ser o estruturador
 * ou o gabarito (a reconferência do Gabriel muda o gabarito): a mensagem não culpa um dos dois.
 */
export function compararComLinhaDeBase(
  m: Pick<
    MetricaDaPagina,
    'corretos' | 'total' | 'aMais' | 'percentual' | 'divergencias' | 'renumerados'
  >,
  base: LinhaDeBase,
): string | undefined {
  const de = m.total + m.aMais;
  const atuais = m.divergencias.map(descreverDivergencia);
  const antigas = base.divergencias ?? [];
  const novas = fora(atuais, antigas);
  const sumiram = fora(antigas, atuais);
  const aMaisQueSumiram = sumiram.filter((x) => x.endsWith(': a_mais'));
  const renumeradosNovos = fora(m.renumerados, base.renumerados ?? []);
  const renumeradosPerdidos = fora(base.renumerados ?? [], m.renumerados);
  const diferencas = [
    ...linhasDe('divergência nova', novas),
    ...linhasDe(
      'divergência que sumiu',
      sumiram.filter((x) => !aMaisQueSumiram.includes(x)),
    ),
    ...linhasDe('dispositivo a mais que sumiu (a fonte o tem: texto perdido?)', aMaisQueSumiram),
    ...linhasDe('renumerado que perdeu o status', renumeradosPerdidos),
    ...linhasDe('renumerado novo', renumeradosNovos),
  ];
  if (m.corretos === base.corretos && de === base.de && diferencas.length === 0) return undefined;
  const caiu =
    m.percentual < porCento(base.corretos, base.de) ||
    novas.length > 0 ||
    aMaisQueSumiram.length > 0 ||
    renumeradosPerdidos.length > 0;
  const agora = `${milhar(m.corretos)}/${milhar(de)} (${percentual(m.percentual)})`;
  const antes = `${milhar(base.corretos)}/${milhar(base.de)} (${percentual(porCento(base.corretos, base.de))})`;
  return [
    `${caiu ? 'caiu' : 'mudou'}: ${agora}; a linha de base era ${antes}.`,
    ...diferencas,
    caiu
      ? 'Regressão do estruturador ou gabarito mudado: examine cada diferença antes do commit; o número novo só entra em LINHA_DE_BASE se o gabarito foi corrigido e o rascunho está certo.'
      : 'Examine cada diferença (o renumerado, na página: o gabarito não lê a renumeração) e atualize LINHA_DE_BASE no teste do corpus no mesmo commit.',
  ].join('\n');
}

/** "1.402": o ponto do milhar, como nos documentos. */
export function milhar(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "99,05%": duas casas, truncado (99,999% não vira 100,00%). */
export function percentual(p: number): string {
  return `${(Math.floor(p * 100) / 100).toFixed(2).replace('.', ',')}%`;
}

/** "art47.incIII: notas": a forma da divergência na mensagem e na linha de base. */
export function descreverDivergencia(d: DivergenciaDaMetrica): string {
  return `${d.endereco}: ${d.motivos.join(', ')}`;
}

/** As primeiras `LIMITE_DE_DIVERGENCIAS` divergências, uma por linha, para a mensagem do teste. */
export function resumoDasDivergencias(m: Pick<MetricaDaPagina, 'divergencias'>): string {
  const linhas = m.divergencias.slice(0, LIMITE_DE_DIVERGENCIAS).map(descreverDivergencia);
  const resto = m.divergencias.length - LIMITE_DE_DIVERGENCIAS;
  return [...linhas, ...(resto > 0 ? [`… e mais ${milhar(resto)}`] : [])].join('\n');
}

/**
 * Uma linha do relatório: "cp  1.422/1.422 (100,00%)  duplicados 0  redações 883/883 (ancestral
 * 331/331)  pendente".
 */
export function linhaDoRelatorio(
  id: string,
  m: MetricaDaPagina,
  conferencia: Gabarito['conferencia']['estado'],
): string {
  const corretos = `${milhar(m.corretos)}/${milhar(m.total + m.aMais)} (${percentual(m.percentual)})`;
  const extras = [
    ...(m.aMais > 0 ? [`${milhar(m.aMais)} a mais`] : []),
    ...(m.resumidos > 0 ? [`${milhar(m.resumidos)} resumidos`] : []),
  ];
  const r = m.redacoes;
  const redacoes = r
    ? `redações ${milhar(r.noEnderecoCerto)}/${milhar(r.esperadas)}${r.lidas === r.esperadas ? '' : ` (${milhar(r.lidas)} lidas)`} (ancestral ${milhar(r.noAncestral.lidas)}/${milhar(r.noAncestral.esperadas)})`
    : 'redações — (compilada)';
  return [
    id.padEnd(14),
    `${corretos}${extras.length > 0 ? ` [${extras.join('; ')}]` : ''}`,
    `duplicados ${String(m.duplicados.length)}`,
    redacoes,
    conferencia,
  ].join('  ');
}

/** As páginas cujo gabarito ainda não está `conferida`, na ordem dada. */
export function gabaritosPendentes(
  gabaritos: readonly (readonly [string, Pick<Gabarito, 'conferencia'>])[],
): string[] {
  return gabaritos.flatMap(([id, g]) => (g.conferencia.estado === 'conferida' ? [] : [id]));
}

/** A linha do portão (13.4): medido só com os 7 gabaritos `conferida`. */
export function linhaDoPortao(pendentes: readonly string[]): string {
  return pendentes.length === 0
    ? 'Portão da F2 (13.4): medido, com os 7 gabaritos conferidos.'
    : `Portão da F2 (13.4) não medido: gabarito ainda não conferido pelo Gabriel em ${pendentes.join(', ')}.`;
}
