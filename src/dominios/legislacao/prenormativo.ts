// Blocos pré-normativos (regra 2): cabeçalho do portal, epígrafe ("LEI Nº 7.210, DE 11 DE JULHO
// DE 1984."), notas da norma inteira, ementa, preâmbulo ("O PRESIDENTE DA REPÚBLICA…", "O
// GOVERNADOR…", "Nós, representantes…") e o título em caixa alta que o CP traz depois dele
// ("CÓDIGO PENAL"). Para no primeiro rótulo estrutural, artigo ou linha tachada: dali em diante é
// o corpo. Casos do corpus: começo das 11 páginas (Planalto, ALESP, CF com "PREÂMBULO").
import { lerRotuloEstrutural } from './estrutura';
import { ehCaixaAlta, juntarTrechos, textoDe, type Linha } from './linhas';
import { lerNotasDaLinha } from './notas';
import type {
  Confianca,
  Descarte,
  FaixaDeLinhas,
  MetadadosNorma,
  NoRascunho,
  NotaDeVigencia,
} from './rascunho';

export interface PreNormativo {
  metadados: MetadadosNorma;
  notasDaNorma: NotaDeVigencia[];
  preambulo?: NoRascunho;
  descartes: Descarte[];
  /** Índice, em `linhas`, da primeira linha do corpo. */
  proxima: number;
}

/**
 * Artigo no começo da linha, com o separador ("Art. 1º -", "Art 67.", "Artigo 1º -", "Art. 9º-A.");
 * sufixo só com o hífen colado ("Art. 1º - A execução" é separador). A 8.3 o torna tolerante.
 */
export const INICIO_DE_ARTIGO =
  /^(?:Art\.?|Artigo) ?(\d{1,4}(?:\.\d{3})?)º?((?:-[A-Z](?!\p{L}))*)(?: *\.)? *(?:- *)?/u;

const EPIGRAFE =
  /^(LEI COMPLEMENTAR|LEI DELEGADA|LEI|DECRETO-LEI|DECRETO LEGISLATIVO|DECRETO|MEDIDA PROVIS[ÓO]RIA|EMENDA CONSTITUCIONAL|CONSTITUI[ÇC][ÃA]O|RESOLU[ÇC][ÃA]O|PORTARIA|INSTRU[ÇC][ÃA]O NORMATIVA)(?![\p{L}])/u;
const NUMERO = /N[º°] ?(\d[\d.]*\d|\d)/u;
const ANO = /(\d{4})\.?$/;

/** Links do portal entre a epígrafe e a ementa (Planalto, ALESP, índice da CF). */
const PORTAL =
  /^(?:Texto compilado|Texto original|Mensagem de veto|Ficha informativa|[ÍI]ndice tem[áa]tico|Emendas Constitucionais|Ato das Disposi[çc][õo]es Constitucionais Transit[óo]rias|Atos decorrentes|Exposi[çc][ãa]o de motivos|Download|Assembleia Legislativa)(?!\p{L})/iu;

const ROTULO_PREAMBULO = /^PRE[ÂA]MBULO\.?$/iu;
const PREAMBULO =
  /^(?:(?:O|A) (?:PRESIDENTE|PRESIDENTA|VICE-PRESIDENTE|GOVERNADOR|GOVERNADORA|ASSEMBL[ÉE]IA|CONGRESSO|MESA|PREFEIT[OA]|C[ÂA]MARA|SENADO)(?!\p{L})|N[óo]s,? representantes)/u;

/** Onde o corpo começa: rótulo estrutural, artigo ou linha tachada (a Parte Geral de 1940 do CP). */
export const abreCorpo = (l: Linha) =>
  l.tachada || INICIO_DE_ARTIGO.test(l.chave) || lerRotuloEstrutural(l) !== undefined;

export function lerPreNormativo(linhas: readonly Linha[], confianca: Confianca): PreNormativo {
  const metadados: MetadadosNorma = {};
  const notasDaNorma: NotaDeVigencia[] = [];
  const descartes: Descarte[] = [];
  let limite = linhas.findIndex(abreCorpo);
  if (limite < 0) limite = linhas.length;
  // Descartes seguidos do mesmo motivo viram uma faixa só (`k`: posição em `linhas`).
  const descartar = (motivo: Descarte['motivo'], k: number) => {
    const l = linhas[k] as Linha;
    const ultimo = descartes[descartes.length - 1];
    if (ultimo?.motivo === motivo && ultimo.linhas.fim === linhas[k - 1]?.i)
      ultimo.linhas.fim = l.i;
    else descartes.push({ motivo, linhas: { inicio: l.i, fim: l.i } });
  };

  // Epígrafe; o que vem antes dela é o cabeçalho do portal.
  const e = linhas.slice(0, limite).findIndex(ehEpigrafe);
  let k = 0;
  if (e >= 0) {
    for (; k < e; k++) descartar('cabecalho', k);
    const epigrafe = linhas[e] as Linha;
    metadados.epigrafe = epigrafe.texto;
    Object.assign(metadados, deduzir(epigrafe.chave));
    k = e + 1;
  }

  // Notas da norma, links do portal e ementa, até o preâmbulo.
  const ementa: Linha[] = [];
  for (; k < limite; k++) {
    const l = linhas[k] as Linha;
    if (ROTULO_PREAMBULO.test(l.chave) || PREAMBULO.test(l.chave)) break;
    const notas = lerNotasDaLinha(l);
    if (notas) notasDaNorma.push(...notas);
    else if (PORTAL.test(l.chave) || e < 0) descartar('cabecalho', k);
    else ementa.push(l);
  }
  if (ementa.length > 0) metadados.ementa = textoDe(juntarTrechos(ementa.map((l) => l.trechos)));

  // Preâmbulo: da fórmula (ou do rótulo "PREÂMBULO") até o corpo ou um título em caixa alta.
  let preambulo: NoRascunho | undefined;
  if (k < limite) {
    const inicio = linhas[k] as Linha;
    const rotulo = ROTULO_PREAMBULO.test(inicio.chave) ? inicio.texto : undefined;
    if (rotulo !== undefined) k++;
    const texto: Linha[] = [];
    for (; k < limite; k++) {
      const l = linhas[k] as Linha;
      if (texto.length > 0 && ehCaixaAlta(l.texto)) break;
      texto.push(l);
    }
    const trechos = juntarTrechos(texto.map((l) => l.trechos));
    metadados.preambulo = textoDe(trechos);
    preambulo = {
      tipo: 'preambulo',
      endereco: 'preambulo',
      ...(rotulo === undefined ? {} : { rotulo }),
      trechos,
      notas: [],
      redacoesAnteriores: [],
      status: 'vigente',
      confianca,
      filhos: [],
      linhas: faixa(inicio, linhas[k - 1] ?? inicio),
    };
    // Título da norma em caixa alta ("CÓDIGO PENAL"); outra linha antes do corpo é sobra.
    for (; k < limite; k++) {
      const l = linhas[k] as Linha;
      if (metadados.tituloOficial === undefined && ehCaixaAlta(l.texto))
        metadados.tituloOficial = l.texto;
      else descartar('sobra', k);
    }
  }

  return {
    metadados,
    notasDaNorma,
    ...(preambulo ? { preambulo } : {}),
    descartes,
    proxima: k,
  };
}

function ehEpigrafe(l: Linha): boolean {
  return EPIGRAFE.test(l.chave) && ANO.test(l.chave) && !/\p{Ll}{2,}/u.test(l.chave);
}

/** "LEI COMPLEMENTAR Nº 80, DE 12 DE JANEIRO DE 1994" → tipo "Lei Complementar", referência "80/1994". */
function deduzir(epigrafe: string): Pick<MetadadosNorma, 'tipo' | 'referencia'> {
  const tipo = EPIGRAFE.exec(epigrafe)?.[1];
  const numero = NUMERO.exec(epigrafe)?.[1];
  const ano = ANO.exec(epigrafe)?.[1];
  return {
    ...(tipo === undefined
      ? {}
      : { tipo: tipo.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()) }),
    ...(numero !== undefined && ano !== undefined ? { referencia: `${numero}/${ano}` } : {}),
  };
}

const faixa = (a: Linha, b: Linha): FaixaDeLinhas => ({ inicio: a.i, fim: b.i });
