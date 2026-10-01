// Reserva em texto puro (F2, 8.8; Parte 2 §10.6, regras 8, 9 e 12): sem tachado, a linha antiga
// e a nova chegam iguais, e a redação anterior sai das notas ("Redação dada", "Incluído",
// "Revogado pela…") e da repetição do endereço. Ela nasce `heuristica`, `confirmada: false`, e
// nunca vira texto vigente. Aqui ficam as peças puras que o estruturador usa só com `formato:
// 'texto'` (a saída do HTML não muda). Casos dos colados `corpus/normas/*.colado.txt` (01/10/2026);
// medidas em `planos/F2.md` › "Fatos do estruturador descobertos na 8.8".
import type { Trecho } from '../../core/seguranca/sanitizador';
import {
  acrescentar,
  aparar,
  juntarLinhasDaRedacao,
  juntarTrechos,
  recortar,
  textoDe,
} from './linhas';
import type { Linha } from './linhas';
import { chaveDeCasamento } from './normalizacao';
import { SEM_ALTERACAO } from './notas';
import { anotar, PENA, SO_REVOGADO, SO_VETADO } from './redacoes';
import type { FaixaDeLinhas, NoRascunho, NotaDeVigencia, RedacaoAnterior } from './rascunho';

/** Redação anterior achada por heurística (regra 8 no texto puro): a confirmar. */
export function redacaoHeuristica(
  trechos: Trecho[],
  linhas: FaixaDeLinhas,
  notas: readonly { texto: string }[] = [],
): RedacaoAnterior {
  const redacao: RedacaoAnterior = {
    trechos,
    origemDeteccao: 'heuristica',
    confirmada: false,
    linhas: { ...linhas },
  };
  anotar(redacao, notas);
  return redacao;
}

/**
 * Nota que diz que o texto mudou (tudo menos "Vide", "Vigência", "Regulamento" e "(NR)"): no
 * último de um endereço repetido, diz que ele é a redação nova e que os filhos das cópias antigas
 * são antigos também (regra 8). Inclui a nota da ALESP ("- Artigo 234 declarado inconstitucional…").
 */
export const temNotaDeAlteracao = (no: NoRascunho): boolean =>
  no.notas.some((n) => !SEM_ALTERACAO.has(n.tipo));

/**
 * O texto é só "(Revogado)" ou "(VETADO)": o esqueleto que fica do dispositivo. Como a nota de
 * alteração, diz que ele é a cópia vigente e que os filhos das cópias antigas são antigos
 * (achado na revisão da 8.8).
 */
export function soEsqueleto(no: NoRascunho): boolean {
  const texto = textoDe(no.trechos);
  return SO_REVOGADO.test(texto) || SO_VETADO.test(texto);
}

const DE_REDACAO = new Set<string>(['redacao_dada', 'incluido']);

/**
 * Qual das cópias de um endereço repetido é a vigente: a última, salvo quando ela não traz nota
 * nenhuma e uma anterior tem "Redação dada" ou "Incluído" (ECA, art. 92, II: a redação de 2009 vem
 * antes da original, "…na família de origem;"); então vale a última com essa nota. Qualquer nota
 * na última a mantém ("Vide", "Vigência" e o "(NR)" da ALESP, que é a redação nova), e "(Revogado)"
 * ou "(VETADO)" sozinho também: é o esqueleto que fica (achado na revisão da 8.8).
 */
export function indiceDaVigente(copias: readonly NoRascunho[]): number {
  const ultima = copias.length - 1;
  const no = copias[ultima];
  if (!no || no.notas.length > 0 || soEsqueleto(no)) return ultima;
  for (let k = ultima - 1; k >= 0; k--)
    if (copias[k]?.notas.some((n) => DE_REDACAO.has(n.tipo))) return k;
  return ultima;
}

/**
 * As linhas do próprio nó (rubrica, rótulo e texto, com as linhas emendadas e as só de notas),
 * sem as dos filhos: a faixa da redação que ele vira. Os filhos vindos de uma cópia antiga
 * (lidos antes dele) não contam.
 */
export function faixaPropria(no: NoRascunho): FaixaDeLinhas {
  const { inicio } = no.linhas;
  let fim = no.linhas.fim;
  for (const f of no.filhos)
    if (f.tipo !== 'nome' && f.linhas.inicio > inicio) {
      fim = Math.min(fim, f.linhas.inicio - 1);
      break;
    }
  return { inicio, fim: Math.max(inicio, fim) };
}

/** O texto do nó dividido nas linhas da fonte (as emendadas vêm depois de `{ texto: '\n' }`). */
function linhasDoTexto(trechos: readonly Trecho[]): Trecho[][] {
  const saida: Trecho[][] = [];
  let atual: Trecho[] = [];
  for (const t of trechos) {
    if (t.texto === '\n' && !t.tachado) {
      saida.push(atual);
      atual = [];
    } else atual.push(t);
  }
  saida.push(atual);
  return saida;
}

/** Espécies que contam como mudança do texto para a regra do revogado com texto. */
const MUDANCA = new Set<string>(['redacao_dada', 'incluido', 'renumerado', 'revogado']);
/** "Revogado parcialmente pela…", "Revogado em parte pela…": o texto continua. */
const PARCIAL = /parcial|em parte/iu;
/** "(Vigência encerrada)" depois da revogação: a medida provisória que revogou caducou. */
const ENCERRADA = /encerrad/iu;
const deMedidaProvisoria = (n: NotaDeVigencia) => /^Medida Provisória/u.test(n.lei ?? '');

/**
 * A última nota de revogação não tira o texto (achado na revisão da 8.8; nenhum caso no corpus):
 * a revogação parcial, a seguida de "(Vigência encerrada)" e a da medida provisória logo depois
 * de outra (a segunda revoga a primeira: MP 955/2020 e MP 905/2019). Fica como no HTML sem tachado:
 * vigente, com o texto (a confirmar, como tudo no texto puro).
 */
function revogacaoQueNaoTira(notas: readonly NotaDeVigencia[], ultima: NotaDeVigencia): boolean {
  if (PARCIAL.test(ultima.texto)) return true;
  const depois = notas.slice(notas.indexOf(ultima) + 1);
  if (depois.some((n) => ENCERRADA.test(n.texto))) return true;
  const mudancas = notas.filter((n) => MUDANCA.has(n.tipo));
  const anterior = mudancas[mudancas.length - 2];
  return (
    anterior?.tipo === 'revogado' && deMedidaProvisoria(anterior) && deMedidaProvisoria(ultima)
  );
}
/** Artigo e dispositivos (o anexo é texto bruto, regra 11). */
const REVOGAVEIS = new Set<string>(['artigo', 'paragrafo', 'inciso', 'alinea', 'item']);

/** O texto do nó nas linhas da fonte: os trechos, a linha onde cada uma começa e as notas dela. */
interface Divisao {
  linhas: Trecho[][];
  inicios: number[];
  notasDe: NotaDeVigencia[][];
  /** A última linha da linha `k` (a seguinte menos um; a última vai até o fim do nó, sem os filhos). */
  fimDa: (k: number) => number;
}

/**
 * Divide o texto do nó nas linhas da fonte pelas quebras (`\n`) e casa cada nota com a linha dela
 * (as das linhas só de notas vão com a linha de cima). Sem as quebras certas, uma linha só.
 */
function dividir(no: NoRascunho, quebras: readonly number[]): Divisao {
  let linhas = linhasDoTexto(no.trechos);
  let inicios = [no.linhas.inicio, ...quebras];
  if (linhas.length !== inicios.length) {
    linhas = [no.trechos];
    inicios = [no.linhas.inicio];
  }
  const fim = faixaPropria(no).fim;
  const notasDe: NotaDeVigencia[][] = linhas.map(() => []);
  for (const n of no.notas) notasDe[linhaDe(inicios, n.linha)]?.push(n);
  return {
    linhas,
    inicios,
    notasDe,
    fimDa: (k) => Math.max(inicios[k] ?? fim, (inicios[k + 1] ?? fim + 1) - 1),
  };
}

/**
 * A pena antiga logo antes da nova com "Redação dada", no mesmo dispositivo ("Pena - detenção, de
 * seis meses a três anos." / "Pena - reclusão, de 2 (dois) a 5 (cinco) anos. (Redação dada pela
 * Lei nº 15.163, de 2025)", CP, art. 133; ECA, arts. 242 e 244-A): sai do texto vigente e vira
 * redação heurística do mesmo dispositivo, com as notas dela; em cadeia, cada pena antiga é uma
 * redação. Só no dispositivo que fica vigente: no antigo (fundido, provisório ou revogado com
 * texto) a pena antiga fica na redação dele, como no HTML.
 */
export function separarPenasAntigas(no: NoRascunho, quebras: readonly number[] = []): void {
  if (quebras.length === 0 || !REVOGAVEIS.has(no.tipo)) return;
  const { linhas, inicios, notasDe, fimDa } = dividir(no, quebras);
  const pena = linhas.map((l) => PENA.test(chaveDeCasamento(textoDe(l))));
  const antigas = new Set<number>();
  for (let k = 2; k < linhas.length; k++)
    if (pena[k] && pena[k - 1] && notasDe[k]?.some((n) => n.tipo === 'redacao_dada'))
      antigas.add(k - 1);
  if (antigas.size === 0) return;
  const ficam: Trecho[][] = [];
  const notas: NotaDeVigencia[] = [];
  linhas.forEach((l, k) => {
    if (antigas.has(k))
      no.redacoesAnteriores.push(
        redacaoHeuristica(aparar(l), { inicio: inicios[k] ?? 0, fim: fimDa(k) }, notasDe[k]),
      );
    else {
      ficam.push(l);
      acrescentar(notas, notasDe[k] ?? []);
    }
  });
  no.trechos = juntarLinhasDaRedacao(ficam);
  no.notas = notas;
  no.redacoesAnteriores.sort((a, b) => a.linhas.inicio - b.linhas.inicio);
}

/** O índice `k` tal que `inicios[k] <= linha < inicios[k + 1]` (busca binária; `inicios` cresce). */
function linhaDe(inicios: readonly number[], linha: number): number {
  let a = 0;
  let b = inicios.length - 1;
  while (a < b) {
    const m = (a + b + 1) >> 1;
    if ((inicios[m] ?? Infinity) <= linha) a = m;
    else b = m - 1;
  }
  return a;
}

/**
 * Revogado com o texto (regra 9 no texto puro): o dispositivo traz o texto antigo e, como última
 * nota de mudança, "(Revogado pela…)" (LEP, arts. 124 e 182; CP, art. 187; ECA, art. 233; CF, art.
 * 36, IV). No HTML o texto vem tachado e a nota fica fora; aqui, o mesmo resultado: status
 * `revogado`, texto vazio e o texto antigo em redações heurísticas. Como no HTML, a primeira
 * redação vai até a linha da nota de revogação (CP, art. 185: o artigo e a pena) e leva a rubrica,
 * com as notas dela; cada linha emendada depois dela ("Pena - …", ECA, art. 233; CP, art. 214,
 * parágrafo único) é uma redação própria. No nó ficam a nota de revogação e as que vêm depois dela
 * na mesma linha ("Vigência"); as de antes e as das outras linhas vão para a nota de cada redação.
 * `quebras`: a linha de cada `\n` do texto, para casar as notas com as linhas. "(Revogado)"
 * sozinho, "(VETADO)" e o texto vazio ficam com a regra 9 de sempre (`aplicarStatus`); a revogação
 * que não tira o texto (`revogacaoQueNaoTira`), com o vigente.
 */
export function revogarComTexto(no: NoRascunho, quebras: readonly number[] = []): boolean {
  if (no.status !== 'vigente' || !REVOGAVEIS.has(no.tipo)) return false;
  const texto = textoDe(no.trechos.filter((t) => !t.tachado));
  if (texto.trim() === '' || SO_REVOGADO.test(texto) || SO_VETADO.test(texto)) return false;
  let ultima: NotaDeVigencia | undefined;
  for (const n of no.notas) if (MUDANCA.has(n.tipo)) ultima = n;
  if (ultima?.tipo !== 'revogado' || revogacaoQueNaoTira(no.notas, ultima)) return false;
  const { linhas, inicios, notasDe, fimDa } = dividir(no, quebras);
  let g = notasDe.findIndex((ns) => ns.some((n) => n.tipo === 'revogado'));
  if (g < 0) g = linhas.length - 1;
  const daLinha = notasDe[g] ?? [];
  const r = Math.max(
    0,
    daLinha.findIndex((n) => n.tipo === 'revogado'),
  );
  const antes: NotaDeVigencia[] = [];
  for (let k = 0; k < g; k++) acrescentar(antes, notasDe[k] ?? []);
  acrescentar(antes, daLinha.slice(0, r));
  const nome = no.filhos.find((f) => f.tipo === 'nome');
  const rotulo: Trecho[] = [{ texto: no.rotuloLido ?? no.rotulo ?? '' }];
  const novas = [
    redacaoHeuristica(
      juntarLinhasDaRedacao([
        nome?.trechos ?? [],
        juntarTrechos([rotulo, linhas[0] ?? []]),
        ...linhas.slice(1, g + 1).map((l) => aparar(l)),
      ]),
      { inicio: no.linhas.inicio, fim: fimDa(g) },
      // As notas da rubrica vêm antes, como as linhas (CP, art. 240: "Adultério (Revogado pela…)").
      nome ? [...nome.notas, ...antes] : antes,
    ),
  ];
  for (let k = g + 1; k < linhas.length; k++)
    novas.push(
      redacaoHeuristica(
        aparar(linhas[k] ?? []),
        { inicio: inicios[k] ?? no.linhas.inicio, fim: fimDa(k) },
        notasDe[k],
      ),
    );
  if (nome) {
    no.filhos = no.filhos.filter((f) => f !== nome);
    acrescentar(novas, nome.redacoesAnteriores);
  }
  no.notas = daLinha.slice(r);
  no.status = 'revogado';
  no.trechos = [];
  no.redacoesAnteriores = [...no.redacoesAnteriores, ...novas].sort(
    (a, b) => a.linhas.inicio - b.linhas.inicio,
  );
  return true;
}

/** O ato da última nota de revogação ("Lei nº 9.279"; sem ato, o texto da nota). */
export function atoDaRevogacao(no: NoRascunho): string | undefined {
  let ato: string | undefined;
  for (const n of no.notas) if (n.tipo === 'revogado') ato = n.lei ?? n.texto;
  return ato;
}

/**
 * O dispositivo continua no texto vigente: não está revogado (status, "(Revogado)" sozinho ou nota
 * de revogação sem texto) nem vetado.
 */
export function estaVivo(no: NoRascunho): boolean {
  if (no.status === 'revogado' || no.status === 'vetado') return false;
  const texto = textoDe(no.trechos.filter((t) => !t.tachado));
  if (SO_REVOGADO.test(texto) || SO_VETADO.test(texto)) return false;
  return !(texto.trim() === '' && no.notas.some((n) => n.tipo === 'revogado'));
}

/** Abertura de artigo citado ("Art. 121 ....", "“Art. 5º …"; o item da citação, ECA, art. 263). */
const ARTIGO_CITADO = /^["“'«]?\s*Art(?:igo)?\.?\s*\d/iu;

/** O nó ou um dos descendentes abre um artigo citado (a alteração de outra lei, ECA, art. 263). */
export function citaArtigo(no: NoRascunho): boolean {
  const pilha = [no];
  for (let n = pilha.pop(); n; n = pilha.pop()) {
    if (n.tipo !== 'nome' && ARTIGO_CITADO.test(textoDe(n.trechos))) return true;
    for (const f of n.filhos) pilha.push(f);
  }
  return false;
}

/** Último segmento do endereço (`parUnico`, `incVIII`). */
export const segmentoDe = (endereco: string) => endereco.slice(endereco.lastIndexOf('.') + 1);

/**
 * Começo de nome de nó estrutural ("Dos Servidores…", "DA ADVOCACIA PÚBLICA", "Disposições
 * Gerais"): no CP, nenhuma rubrica começa assim (a mesma premissa de `rubricaNoNomeDoNo`).
 */
export const NOME_DE_NO = /^(?:d[oa]s?|disposi[cç][oõ]es)(?!\p{L})/iu;
/** O nome em caixa alta que termina no meio ("…DE", "…E", vírgula) continua na linha seguinte. */
const NOME_PELA_METADE = /(?:(?<!\p{L})(?:d[eoa]s?|e|ou|a|o|as|os|em|para|por|com)|[,;-])$/iu;

/** O nome antigo de uma linha só está inteiro (não termina no meio da frase). */
export const nomeInteiro = (l: Linha) => !NOME_PELA_METADE.test(l.chave.trimEnd());

/** A linha a partir de `pos` (o rótulo novo depois do antigo: "X XI -", "Parágrafo único § 1° -"). */
export function aPartirDe(l: Linha, pos: number): Linha {
  return {
    ...l,
    trechos: recortar(l.trechos, pos, l.texto.length),
    texto: l.texto.slice(pos),
    chave: l.chave.slice(pos),
  };
}

/** A linha sem o caractere em `pos` (rótulo partido pela fonte: "I I -" → "II -", "I V -" → "IV -"). */
export function semCaractere(l: Linha, pos: number): Linha {
  const texto = l.texto.slice(0, pos) + l.texto.slice(pos + 1);
  return {
    ...l,
    trechos: [...recortar(l.trechos, 0, pos), ...recortar(l.trechos, pos + 1, l.texto.length)],
    texto,
    chave: chaveDeCasamento(texto),
  };
}

/** A linha com um hífen em `pos` (inciso com sufixo sem hífen: "VIIIA a remoção…" → "VIII-A a…"). */
export function comHifen(l: Linha, pos: number): Linha {
  const texto = `${l.texto.slice(0, pos)}-${l.texto.slice(pos)}`;
  return {
    ...l,
    trechos: [
      ...recortar(l.trechos, 0, pos),
      { texto: '-' },
      ...recortar(l.trechos, pos, l.texto.length),
    ],
    texto,
    chave: chaveDeCasamento(texto),
  };
}
