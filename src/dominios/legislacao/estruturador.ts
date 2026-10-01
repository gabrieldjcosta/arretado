// Estruturador (F2; Parte 2 §10.6, "fatiarLei"): blocos do sanitizador ou de `textoParaBlocos` →
// Rascunho. Domínio puro, sem tela nem banco. Ordem das regras: normalização (1, 8.1), blocos
// pré-normativos (2) e hierarquia estrutural (3, 8.2), rubrica (4) e artigo (5) (8.3), caput,
// parágrafo, inciso, alínea e item (6, 8.4) e notas de vigência (7, 8.5: fora do texto, com lei e
// ano), redação anterior por tachado (8), revogação total (9), renumeração (10) e VETADO (8.6):
// a linha tachada nunca vira texto vigente. Anexos com texto bruto (11), confiança por heurística
// (12) e validação estrutural (13) (8.7). Toda linha cai num nó (pela faixa), nota, redação
// anterior, metadado ou descarte.
import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import { ARTIGO_QUEBRADO, lerInicioDeArtigo, lerRubrica, type InicioDeArtigo } from './artigo';
import {
  lerRotuloDeDispositivo,
  PROFUNDIDADE,
  type RotuloDeDispositivo,
  type TipoDeDispositivo,
} from './dispositivo';
import {
  lerRotuloEstrutural,
  NIVEL,
  type RotuloEstrutural,
  type TipoEstrutural,
} from './estrutura';
import {
  acrescentar,
  aparar,
  ehCaixaAlta,
  juntarTrechos,
  recortar,
  textoDe,
  type Linha,
  prepararLinhas,
} from './linhas';
import { chaveDeCasamento, normalizarBlocos } from './normalizacao';
import { lerNotasDaLinha, notaVigenciaMaisRecente, separarNotasFinais } from './notas';
import { lerPreNormativo } from './prenormativo';
import {
  anotar,
  lerLinhaTachada,
  PENA,
  redacaoDe,
  SO_REVOGADO,
  SO_VETADO,
  tachadoENotasFora,
  type LinhaTachada,
} from './redacoes';
import { lerRenumeracao, origemDoRotulo, rotuloAntigoTachado, type Origem } from './renumeracao';
import type {
  Anomalia,
  Confianca,
  Descarte,
  FaixaDeLinhas,
  FormatoEntrada,
  NoRascunho,
  NotaDeVigencia,
  Rascunho,
  RedacaoAnterior,
} from './rascunho';
import { anomalia, marcarConflitos, validarEstrutura } from './validacao';

/**
 * Vai para `VersaoDeNorma.versaoAdaptador`: sobe a cada atividade que muda a saída (0.5 na 8.5…),
 * para a fonte guardada ser reprocessada quando o estruturador melhorar.
 */
export const VERSAO_ESTRUTURADOR = '0.7';

export interface OpcoesEstruturar {
  /** `texto` (texto puro): tudo "a confirmar" (regra 12). Padrão: `html`. */
  formato?: FormatoEntrada;
}

export function estruturar(blocos: readonly Bloco[], opcoes: OpcoesEstruturar = {}): Rascunho {
  const formato = opcoes.formato ?? 'html';
  const confianca: Confianca = formato === 'html' ? 'alta' : 'a_confirmar';
  const { blocos: normalizados, relatorio } = normalizarBlocos(blocos);
  const linhas = prepararLinhas(normalizados);
  const pre = lerPreNormativo(linhas, confianca);
  const corpo = new Corpo(confianca);
  for (let k = pre.proxima; k < linhas.length; k++) corpo.ler(linhas[k] as Linha);
  const { nos, descartes, anomalias: daLeitura, linhasTachadas } = corpo.concluir();
  const anomalias =
    relatorio.perdidos > 0
      ? [
          anomalia(
            'caractere_perdido',
            `${String(relatorio.perdidos)} caractere(s) chegaram ilegíveis (�); confira acentos no texto.`,
          ),
        ]
      : [];
  acrescentar(anomalias, daLeitura);
  const raizes = pre.preambulo ? [pre.preambulo, ...nos] : nos;
  // Regra 13 depois da leitura; regra 12: o nó de endereço em conflito fica "a confirmar".
  const validacao = validarEstrutura({ nos: raizes, formatoEntrada: formato });
  marcarConflitos(raizes, validacao);
  acrescentar(anomalias, validacao);
  const maisRecente = notaVigenciaMaisRecente(todasAsNotas(pre.notasDaNorma, raizes));
  return {
    versaoEstruturador: VERSAO_ESTRUTURADOR,
    formatoEntrada: formato,
    totalLinhas: blocos.length,
    normalizacao: relatorio,
    metadados: pre.metadados,
    notasDaNorma: pre.notasDaNorma,
    ...(maisRecente ? { notaVigenciaMaisRecente: maisRecente } : {}),
    nos: raizes,
    descartes: [...pre.descartes, ...descartes].sort((a, b) => a.linhas.inicio - b.linhas.inicio),
    anomalias,
    linhasTachadas,
  };
}

/** As notas da norma e as de todos os nós (sem recursão: a árvore pode ser funda numa página hostil). */
function* todasAsNotas(
  daNorma: readonly NotaDeVigencia[],
  nos: readonly NoRascunho[],
): Generator<NotaDeVigencia> {
  yield* daNorma;
  const pilha: NoRascunho[] = [];
  acrescentar(pilha, nos);
  for (let no = pilha.pop(); no; no = pilha.pop()) {
    yield* no.notas;
    acrescentar(pilha, no.filhos);
  }
}

/** Local e data que abrem o fecho ("Brasília, 11 de julho de 1984;", "Palácio dos Bandeirantes, 9 de…"). */
const FECHO = /^\p{Lu}[\p{L} ]{2,40}, (?:em )?\d{1,2}º? de \p{L}+ de \d{4}/u;
/**
 * Regra 11: cabeçalho de anexo, só em maiúsculas, como no gabarito (`RE_ANEXO`): "ANEXO", "ANEXO
 * II", "ANEXO 1", "ANEXO ÚNICO" e "ANEXO - Revogado." (ALESP). O separador (na chave, o travessão
 * já é "-") fica no rótulo lido.
 */
const ANEXO = /^ANEXO(?:\s+([IVXLCDM]+|\d+|[ÚU]NICO))?(?![\p{L}\d])/u;
const SEPARADOR_DO_ANEXO = /\s*[-–—.:]?\s*/uy;
/** No corpus, o nome mais longo tem 2 linhas (CP, Título XII); o limite evita juntar texto solto. */
const MAX_LINHAS_DO_NOME = 4;

/** Citação da lei alterada, entre aspas ('"IV - a qualquer outro…".', CDC, arts. 110 a 117). */
const ABRE_CITACAO = /^["“«]/u;
/** Fim da citação: aspas no fim do texto, antes de pontuação, "(NR)" e notas. */
const FECHA_CITACAO = /["”»][\s.,;:)]*(?:\(NR\)[\s.]*)?$/u;

/**
 * Artigo, os dispositivos da regra 6 e o anexo (regra 11): endereço repetido funde (vale o
 * último), e "(Revogado)" ou "(VETADO)" sozinho dá o status.
 */
const NORMATIVOS = new Set<string>(['artigo', 'paragrafo', 'inciso', 'alinea', 'item', 'anexo']);

/** Nó estrutural: os da regra 3 e o bloco com numeração própria (ADCT), que fica acima de todos. */
type TipoDeNo = TipoEstrutural | 'bloco';
const ESTRUTURAIS = new Set<string>([...Object.keys(NIVEL), 'bloco']);
const ehEstrutural = (no: NoRascunho): no is NoRascunho & { tipo: TipoDeNo } =>
  ESTRUTURAIS.has(no.tipo);

/**
 * Rubrica candidata (regras 4 e 6): vira o nome do artigo, parágrafo, inciso ou alínea que vier
 * logo depois (só com notas e tachado no meio) ou vira a última linha do dispositivo anterior.
 * Artigo ou dispositivo tachado de outro endereço entre ela e o vigente (CP, art. 185, revogado,
 * antes do 186) diz que a rubrica é dele: é o nome do revogado (caso `artigo-so-tachado`, 8.6).
 */
interface RubricaPendente {
  linha: Linha;
  fim: number;
  notas: NotaDeVigencia[];
  duvidosa: boolean;
  /** As linhas só de notas logo depois dela (são dela, se ela se confirmar). */
  linhasDeNota: Linha[];
  /**
   * Endereço do primeiro artigo ou dispositivo tachado depois dela: se o vigente que vier não tem
   * esse endereço, ela é do tachado (CP, art. 185; art. 121, § 2º, VI, "Feminicídio", revogado).
   */
  tachado?: string;
  /** O nó provisório (8.6) desse tachado: se a rubrica não chega a um vigente, é o nome dele. */
  no?: NoRascunho;
  /** Rubricas antigas, tachadas, logo antes dela (CP, art. 218-B): redações anteriores do nome. */
  antigas?: LinhaTachada[];
}

/**
 * A redação anterior que a última linha tachada abriu ou estendeu: a "Pena - …" tachada e as notas
 * logo depois são dela. `notasNoNo`: o nó nasceu da própria linha (provisório ou revogado pela
 * nota de fora do tachado), e as notas em linha própria são dele; senão, vão para a `nota` da
 * redação.
 */
interface RedacaoAberta {
  no: NoRascunho;
  redacao: RedacaoAnterior;
  notasNoNo: boolean;
}

/** Nó estrutural recém-aberto: as linhas seguintes podem ser nota ou nome dele. */
interface Cabecalho {
  no: NoRascunho;
  /** `rotulo`: ainda sem nome; `nome`: lendo o nome (continua em caixa alta); `fim`: nota depois do nome. */
  estado: 'rotulo' | 'nome' | 'fim';
  nome: Linha[];
}

/** Título solto em caixa alta depois do fecho, com as notas dele: abre o bloco se o artigo recomeçar. */
interface TituloSolto {
  linha: Linha;
  fim: number;
  notas: NotaDeVigencia[];
  linhasDeNota: Linha[];
}

/**
 * Trecho com numeração própria (o corpo é o primeiro, sem prefixo): o ADCT da CF e as disposições
 * transitórias da LC-SP 988 recomeçam no art. 1º. O prefixo entra no endereço de artigo
 * (`adct.art1`, `dt.art21`; glossário §12).
 */
interface BlocoAberto {
  prefixo: string;
  /** Maior número de artigo lido no bloco: art. 1º depois de um maior que 1 recomeça a numeração. */
  maior: number;
}

/** Regra 11: cabeçalho de anexo lido na linha. */
interface CabecalhoDeAnexo {
  /** `anexo` + número: `anexo`, `anexoII` (romano como na lei), `anexo1`, `anexoUnico`. */
  endereco: string;
  /** O cabeçalho como aparece, sem o separador ("ANEXO II"). */
  rotulo: string;
  /** Fim do rótulo com o separador: o texto do anexo começa aí. */
  fim: number;
}

/** O anexo que as linhas seguintes continuam, até o próximo cabeçalho de anexo ou o fim. */
interface AnexoAberto {
  no: NoRascunho;
  /** Nenhuma linha de texto depois do cabeçalho ainda: a linha só de notas é do anexo. */
  noCabecalho: boolean;
  /** Cabeçalho todo tachado (anexo provisório): as linhas dele formam esta redação. */
  redacao?: RedacaoAnterior;
}

class Corpo {
  private readonly raizes: NoRascunho[] = [];
  private readonly pilha: NoRascunho[] = [];
  private readonly segmentos = new Map<NoRascunho, string>();
  /** Quantos artigos já tinham sido lidos quando o nó estrutural abriu (o nome dele dá o prefixo do bloco). */
  private readonly artigosAoAbrir = new Map<NoRascunho, number>();
  private readonly descartes: Descarte[] = [];
  private readonly anomalias: Anomalia[] = [];
  private cabecalho: Cabecalho | undefined;
  /** Regra 6: o artigo e os dispositivos abertos dentro dele, do artigo ao último lido. */
  private caminho: NoRascunho[] = [];
  /** O texto do dispositivo termina em ".", ";" ou ":" (sem as notas): diz se a linha em minúscula continua a frase. */
  private readonly fechaFrase = new WeakMap<NoRascunho, boolean>();
  /** Dentro de uma citação em várias linhas (CDC, art. 113): tudo continua o último dispositivo. */
  private citacao = false;
  private pendentes: Linha[] = [];
  private rubrica: RubricaPendente | undefined;
  /** Linha só com "Art." (ou "Artigo"), à espera do número na linha seguinte. */
  private quebrado: Linha | undefined;
  private zona: 'corpo' | 'fecho' | 'anexo' = 'corpo';
  private fecho: Descarte | undefined;
  private tituloSolto: TituloSolto | undefined;
  private anexo: AnexoAberto | undefined;
  private bloco: BlocoAberto = { prefixo: '', maior: 0 };
  /** Prefixos em uso, com o próximo número para repetir a base (`dt`, `dt2`…). */
  private readonly prefixos = new Map<string, number>();
  private blocos = 1;
  private artigos = 0;
  private rubricas = 0;
  /**
   * Linhas tachadas inteiras (redação anterior, nó revogado; as do anexo tachado e as do anexo
   * vigente que acaba revogado também): zero numa página HTML sugere a compilada (9.5).
   */
  private tachadas = 0;
  /** Linhas tachadas inteiras no texto bruto de cada anexo vigente: contam se ele for revogado. */
  private readonly tachadasNoAnexo = new Map<NoRascunho, number>();
  /** Anexos provisórios com linha sem tachado inteiro sob o cabeçalho: aviso e confiança média. */
  private readonly semTachadoNoAnexo = new Set<NoRascunho>();
  private ultima: Linha | undefined;
  /**
   * Regra 8: nós lidos de uma linha toda tachada (artigo, dispositivo, nó estrutural ou cabeçalho
   * de anexo), sem nota de revogação fora do tachado. Ficam na árvore enquanto ela se lê (dão o
   * pai do que vem depois) e, no fim, se juntam ao nó de mesmo endereço; sem ele, o artigo e o
   * anexo ficam revogados (caso `artigo-so-tachado`) e o resto vai para o ancestral
   * (`enderecoLido`).
   */
  private readonly provisorios = new Set<NoRascunho>();
  /** Regra 10: rótulo antigo tachado ao lado do novo (ALESP, "~~X~~ XI -"): a origem do renumerado. */
  private readonly rotulosAntigos = new Map<NoRascunho, Origem>();
  private redacaoAberta: RedacaoAberta | undefined;
  /** Linhas tachadas que parecem rubrica: são da redação do artigo ou dispositivo tachado seguinte. */
  private rubricasTachadas: LinhaTachada[] = [];

  constructor(private readonly confianca: Confianca) {}

  /** O último dispositivo lido (o artigo, se nenhum outro abriu depois dele). */
  private get ultimo(): NoRascunho | undefined {
    return this.caminho[this.caminho.length - 1];
  }

  ler(l: Linha): void {
    if (this.zona === 'anexo') {
      // Texto bruto (regra 11): nem o "Art." quebrado se lê.
      this.lerLinha(l);
      return;
    }
    const quebrado = this.quebrado;
    if (quebrado) {
      this.quebrado = undefined;
      const junta = juntarLinhas(quebrado, l);
      if (lerInicioDeArtigo(junta.chave)) {
        this.lerLinha(junta, quebrado.i);
        return;
      }
      this.lerLinha(quebrado);
    }
    if (ARTIGO_QUEBRADO.test(l.chave)) this.quebrado = l;
    else this.lerLinha(l);
  }

  /** `inicio`: primeira linha da entrada (a do "Art." quebrado, quando houver). */
  private lerLinha(l: Linha, inicio = l.i): void {
    const anterior = this.ultima;
    this.ultima = l;
    // Regra 11: o anexo abre depois do fecho, no anexo (cada cabeçalho, um anexo novo) e, sem fecho
    // reconhecido, no corpo depois de algum artigo, fora de citação; tachado ou não.
    const anexo =
      this.zona !== 'corpo' || (this.artigos > 0 && !this.citacao)
        ? lerCabecalhoDeAnexo(l)
        : undefined;
    if (anexo) {
      this.abrirAnexo(anexo, l);
      return;
    }
    if (this.zona === 'anexo' && this.anexo) {
      this.lerNoAnexo(this.anexo, l);
      return;
    }
    if (this.zona === 'fecho' && this.fecho) {
      // Depois do fecho, só artigo ou rótulo reabre o corpo. O título solto em caixa alta logo
      // antes do artigo que recomeça a numeração abre um bloco (o ADCT da CF).
      if (l.tachada || !(lerInicioDeArtigo(l.chave) || lerRotuloEstrutural(l))) {
        this.fecho.linhas.fim = l.i;
        this.lerTituloSolto(l);
        return;
      }
      this.zona = 'corpo';
    }
    const rotulo = l.tachada ? undefined : lerRotuloEstrutural(l);
    const artigo = lerInicioDeArtigo(l.chave);
    if (rotulo || artigo) this.citacao = false;
    if (l.tachada) this.tachada(l, inicio, artigo);
    else this.lerVigente(l, anterior, inicio, rotulo, artigo);
    this.tituloSolto = undefined;
  }

  /** Linha sem tachado inteiro (o tachado parcial fica marcado no texto). */
  private lerVigente(
    l: Linha,
    anterior: Linha | undefined,
    inicio: number,
    rotulo: RotuloEstrutural | undefined,
    artigo: InicioDeArtigo | undefined,
  ): void {
    // Rubrica tachada logo antes de uma rubrica nova é a antiga dela (CP: "~~Favorecimento da
    // prostituição…~~" antes de "Favorecimento da prostituição ou de outra forma…").
    const antigas = this.rubricasTachadas;
    this.rubricasTachadas = [];
    const novaRubrica =
      antigas.length > 0 && !rotulo && !artigo && !this.cabecalho && lerRubrica(l) !== undefined;
    if (!novaRubrica) this.soltarTachadas(antigas);
    this.lerLinhaVigente(l, anterior, inicio, rotulo, artigo);
    if (!novaRubrica) return;
    const r = this.rubrica;
    if (r?.linha === l) r.antigas = antigas;
    else this.soltarTachadas(antigas);
  }

  private lerLinhaVigente(
    l: Linha,
    anterior: Linha | undefined,
    inicio: number,
    rotulo: RotuloEstrutural | undefined,
    artigo: InicioDeArtigo | undefined,
  ): void {
    // Nota da redação anterior logo acima: vai com ela (ou com o nó que ela abriu).
    if (anterior && this.notaDaTachada(l, anterior)) return;
    this.redacaoAberta = undefined;
    if (this.artigos > 0 && FECHO.test(l.chave)) this.abrirFecho(l);
    else if (rotulo) this.abrirNo(rotulo, l);
    else if (this.cabecalho && this.lerCabecalho(this.cabecalho, l, artigo)) {
      // nome ou nota do nó recém-aberto
    } else if (artigo) this.abrirArtigo(artigo, l, inicio);
    else if (this.citacao) this.continuarCitacao(l);
    else this.lerDentroDoArtigo(l);
  }

  /** No fecho: título em caixa alta (e as notas logo depois dele) que pode abrir um bloco. */
  private lerTituloSolto(l: Linha): void {
    const t = this.tituloSolto;
    const notas = l.tachada ? undefined : lerNotasDaLinha(l);
    if (t && notas) {
      acrescentar(t.notas, notas);
      t.linhasDeNota.push(l);
      return;
    }
    this.tituloSolto = undefined;
    if (l.tachada || notas || !ehCaixaAlta(l.texto)) return;
    const { fim, notas: finais } = separarNotasFinais(l);
    this.tituloSolto = { linha: l, fim, notas: finais, linhasDeNota: [] };
  }

  concluir(): {
    nos: NoRascunho[];
    descartes: Descarte[];
    anomalias: Anomalia[];
    linhasTachadas: number;
  } {
    if (this.quebrado) this.lerLinha(this.quebrado);
    this.quebrado = undefined;
    this.soltarRubricasTachadas();
    this.resolverRubrica();
    this.soltarPendentes();
    this.mesclarSubstituidos(this.raizes);
    if (this.rubricas > 0) this.rubricaNoNomeDoNo();
    this.enderecar(this.raizes, '');
    this.fundirRepetidos();
    this.resolverTachados();
    this.aplicarStatus();
    return {
      nos: this.raizes,
      descartes: this.descartes,
      anomalias: this.anomalias,
      linhasTachadas: this.tachadas,
    };
  }

  /**
   * Regra 12: ambiguidade resolvida por heurística (duplicata, nó substituído, dispositivo sem pai,
   * linha continuada, artigo ou anexo só tachado sem nota de revogação, anexo tachado com texto sem
   * tachado) deixa a confiança média; a do texto puro (`a_confirmar`) fica.
   */
  private porHeuristica(no: NoRascunho): void {
    if (no.confianca === 'alta') no.confianca = 'media';
  }

  private novoNo(tipo: NoRascunho['tipo'], l: Linha, extra: Partial<NoRascunho> = {}): NoRascunho {
    return {
      tipo,
      endereco: '',
      trechos: [],
      notas: [],
      redacoesAnteriores: [],
      status: 'vigente',
      confianca: this.confianca,
      filhos: [],
      linhas: { inicio: l.i, fim: l.i },
      ...extra,
    };
  }

  private anexar(no: NoRascunho): void {
    const pai = this.pilha[this.pilha.length - 1];
    (pai ? pai.filhos : this.raizes).push(no);
  }

  /** Regra 3; `provisorio` (8.6): o rótulo veio todo tachado ("~~TÍTULO IV~~", CF; a Parte Geral de 1940, CP). */
  private abrirNo(rotulo: RotuloEstrutural, l: Linha, provisorio = false): void {
    this.resolverRubrica();
    this.fecharArtigo();
    this.soltarPendentes();
    const no = this.novoNo(rotulo.tipo, l, { rotulo: rotulo.rotulo });
    if (provisorio) this.provisorios.add(no);
    this.segmentos.set(no, rotulo.segmento);
    this.artigosAoAbrir.set(no, this.artigos);
    const nivel = NIVEL[rotulo.tipo];
    while (this.pilha.length > 0) {
      const topo = this.pilha[this.pilha.length - 1];
      if (topo === undefined || topo.tipo === 'bloco' || NIVEL[topo.tipo as TipoEstrutural] < nivel)
        break;
      this.pilha.pop();
    }
    this.anexar(no);
    this.pilha.push(no);
    const cabecalho: Cabecalho = { no, estado: 'rotulo', nome: [] };
    this.cabecalho = cabecalho;
    // Nome ou nota na mesma linha do rótulo ("TÍTULO I - DISPOSIÇÕES GERAIS").
    if (rotulo.resto < l.texto.length) {
      const resto: Linha = {
        ...l,
        trechos: recortar(l.trechos, rotulo.resto, l.texto.length),
        texto: l.texto.slice(rotulo.resto),
        chave: l.chave.slice(rotulo.resto),
      };
      if (!provisorio) this.lerCabecalho(cabecalho, resto);
      else this.nomeTachado(cabecalho, lerLinhaTachada({ ...resto, tachada: true }));
    }
  }

  /** Nota ou nome do nó recém-aberto; `false` quando a linha já não é dele. */
  private lerCabecalho(c: Cabecalho, l: Linha, artigo = lerInicioDeArtigo(l.chave)): boolean {
    const notas = lerNotasDaLinha(l);
    if (notas) {
      acrescentar(c.no.notas, notas);
      c.no.linhas.fim = l.i;
      if (c.estado === 'nome') c.estado = 'fim';
      return true;
    }
    if (artigo) return this.fecharCabecalho();
    const primeiro = c.nome[0];
    const continua =
      c.estado === 'nome' &&
      c.nome.length < MAX_LINHAS_DO_NOME &&
      primeiro !== undefined &&
      ehCaixaAlta(primeiro.texto) &&
      ehCaixaAlta(l.texto);
    if (c.estado !== 'rotulo' && !continua) return this.fecharCabecalho();
    // Nome (a 1ª linha, em qualquer caixa; a seguinte, só se as duas estão em caixa alta). O
    // pedaço tachado ("do ~~Pátrio Poder~~ Poder Familiar", ECA) fica na redação anterior.
    const { fim, notas: finais } = separarNotasFinais(l);
    const { trechos: trechosDoNome, redacao } = tirarTachado(l, fim);
    if (redacao) c.no.redacoesAnteriores.push(redacao);
    c.nome.push({ ...l, trechos: trechosDoNome });
    acrescentar(c.no.notas, finais);
    c.no.linhas.fim = l.i;
    c.estado = finais.length > 0 ? 'fim' : 'nome';
    const trechos = juntarTrechos(c.nome.map((n) => aparar(n.trechos)));
    const nome = c.no.filhos.find((f) => f.tipo === 'nome');
    if (nome) {
      nome.trechos = trechos;
      nome.linhas.fim = l.i;
    } else c.no.filhos.unshift(this.novoNo('nome', l, { trechos }));
    return true;
  }

  private fecharCabecalho(): false {
    this.cabecalho = undefined;
    return false;
  }

  private abrirArtigo(inicioDeArtigo: InicioDeArtigo, l: Linha, inicio: number): void {
    this.cabecalho = undefined;
    const { rotulo, fim } = inicioDeArtigo;
    let r = this.rubrica;
    this.rubrica = undefined;
    const numero = Number(/^art(\d+)$/.exec(inicioDeArtigo.endereco)?.[1] ?? NaN);
    if (numero === 1 && this.bloco.maior >= 2) {
      // O art. 1º de novo: bloco com numeração própria. O título em caixa alta logo antes dele
      // (depois do fecho, ou uma rubrica candidata) é o nó do bloco (ADCT).
      const titulo =
        this.tituloSolto ??
        (r && r.tachado === undefined && ehCaixaAlta(r.linha.texto.slice(0, r.fim))
          ? { linha: r.linha, fim: r.fim, notas: r.notas, linhasDeNota: r.linhasDeNota }
          : undefined);
      if (titulo && !this.tituloSolto) r = undefined;
      this.abrirBloco(titulo);
    }
    if (numero > this.bloco.maior) this.bloco.maior = numero;
    const endereco = this.bloco.prefixo
      ? `${this.bloco.prefixo}.${inicioDeArtigo.endereco}`
      : inicioDeArtigo.endereco;
    let nome: NoRascunho | undefined;
    if (r && (r.tachado === undefined || r.tachado === inicioDeArtigo.endereco)) {
      nome = this.nomeDe(r);
      this.rubricas += 1;
    } else if (r) this.devolverRubrica(r);
    this.fecharArtigo();
    this.soltarPendentes();
    const texto = textoENotas(l, fim);
    const artigo = this.novoNo('artigo', l, {
      endereco,
      rotulo,
      rotuloLido: l.texto.slice(0, fim).trim(),
      trechos: texto.trechos,
      notas: texto.notas,
      filhos: nome ? [nome] : [],
      linhas: { inicio: nome?.linhas.inicio ?? inicio, fim: l.i },
    });
    this.anexar(artigo);
    this.fechaFrase.set(artigo, texto.fechaFrase);
    this.caminho = [artigo];
    this.artigos += 1;
  }

  /**
   * Bloco com numeração própria. O prefixo sai do título solto (ADCT) ou do nome do nó que o
   * abre (LC-SP 988: "TÍTULO VIII / Das Disposições Transitórias"); sem nenhum dos dois, `bloco2`.
   * Com título, o bloco vira nó (`tipo: 'bloco'`) na raiz, acima de toda a estrutura.
   */
  private abrirBloco(titulo: TituloSolto | undefined): void {
    this.blocos += 1;
    const abridor = this.pilha.find((no) => this.artigosAoAbrir.get(no) === this.artigos);
    const nomeDoAbridor = abridor?.filhos.find((f) => f.tipo === 'nome');
    const fonte = titulo
      ? titulo.linha.texto.slice(0, titulo.fim)
      : nomeDoAbridor && textoDe(nomeDoAbridor.trechos);
    const base = prefixoDoBloco(fonte ?? '') ?? `bloco${String(this.blocos)}`;
    const n = this.prefixos.get(base) ?? 1;
    this.prefixos.set(base, n + 1);
    const prefixo = n === 1 ? base : `${base}${String(n)}`;
    this.bloco = { prefixo, maior: 0 };
    if (!titulo) return;
    if (titulo === this.tituloSolto && this.fecho) this.fecho.linhas.fim = titulo.linha.i - 1;
    this.tituloSolto = undefined;
    const ultimaDoTitulo = titulo.linhasDeNota[titulo.linhasDeNota.length - 1] ?? titulo.linha;
    const no = this.novoNo('bloco', titulo.linha, {
      rotulo: textoDe(aparar(recortar(titulo.linha.trechos, 0, titulo.fim))).slice(0, 200),
      notas: [...titulo.notas],
      linhas: { inicio: titulo.linha.i, fim: ultimaDoTitulo.i },
    });
    this.segmentos.set(no, prefixo);
    this.pilha.length = 0;
    this.raizes.push(no);
    this.pilha.push(no);
  }

  /** Fecha o artigo corrente (nó estrutural, fecho, outro artigo). */
  private fecharArtigo(): void {
    this.caminho = [];
    this.citacao = false;
  }

  /**
   * Linha que não é rótulo estrutural, artigo, fecho nem tachada. Dentro do artigo: parágrafo,
   * inciso, alínea ou item (regra 6); linha só de notas (vai para o último dispositivo); "Pena -"
   * e citação entre aspas (continuam o último, depois de uma quebra de linha); rubrica candidata;
   * linha continuada; sobra.
   */
  private lerDentroDoArtigo(l: Linha): void {
    const r = this.rubrica;
    const notas = lerNotasDaLinha(l);
    if (r && notas) {
      // Nota em linha própria logo depois da rubrica é dela (se ela se confirmar).
      acrescentar(r.notas, notas);
      r.linhasDeNota.push(l);
      return;
    }
    const ultimo = this.ultimo;
    const rotulo = ultimo ? lerRotuloDeDispositivo(l) : undefined;
    if (ultimo && rotulo) {
      this.abrirDispositivo(rotulo, l);
      return;
    }
    if (r) this.resolverRubrica();
    if (!ultimo) {
      const rubrica = lerRubrica(l);
      if (rubrica) this.rubrica = { linha: l, ...rubrica, linhasDeNota: [] };
      else this.pendentes.push(l);
      return;
    }
    if (notas) {
      acrescentar(ultimo.notas, notas);
      this.estender(l.i);
    } else if (ABRE_CITACAO.test(l.chave)) {
      this.continuar(l, '\n');
      this.citacao = !fechaCitacao(l);
    } else if (PENA.test(l.chave)) this.continuar(l, '\n');
    else {
      const rubrica = lerRubrica(l);
      if (rubrica) this.rubrica = { linha: l, ...rubrica, linhasDeNota: [] };
      else this.semRotulo(l);
    }
  }

  /** Linha de uma citação em várias linhas: continua o último dispositivo, até fechar as aspas. */
  private continuarCitacao(l: Linha): void {
    this.continuar(l, '\n');
    if (fechaCitacao(l)) this.citacao = false;
  }

  /**
   * Linha sem rótulo que não é rubrica. Em minúscula, depois de texto sem ponto final, continua a
   * frase (fonte quebrada em duas linhas: LC-SP 988, art. 159), com aviso e confiança média (regra
   * 12); em minúscula depois de ponto final, é sobra da fonte ("bracionalização na execução das
   * funções;", ALESP); o resto continua o último dispositivo, depois de uma quebra de linha.
   */
  private semRotulo(l: Linha): void {
    const ultimo = this.ultimo;
    if (!ultimo) return;
    if (/^\p{Ll}/u.test(l.chave)) {
      if (this.fechaFrase.get(ultimo) !== true) {
        this.continuar(l, ' ');
        this.porHeuristica(ultimo);
        this.anomalias.push(
          anomalia(
            'linha_continuada',
            `A linha "${l.texto.slice(0, 80)}" continua o texto de ${ultimo.rotulo ?? 'um dispositivo'}.`,
            { endereco: ultimo.endereco, linha: l.i },
          ),
        );
      } else this.soltar([l], 'solta no artigo, sem rótulo');
      return;
    }
    this.continuar(l, '\n');
  }

  /** Regra 6: o dispositivo fica sob o último de nível menor (hierarquia por sequência). */
  private abrirDispositivo(rotulo: RotuloDeDispositivo, l: Linha): void {
    const pai = this.paiDe(rotulo.tipo);
    if (!pai) return;
    this.caminho.length = this.caminho.indexOf(pai) + 1;
    const endereco = `${pai.endereco}.${rotulo.segmento}`;
    const r = this.rubrica;
    this.rubrica = undefined;
    let nome: NoRascunho | undefined;
    if (r && (r.tachado === undefined || r.tachado === endereco)) {
      nome = this.nomeDe(r);
      this.rubricas += 1;
    } else if (r) this.devolverRubrica(r);
    const texto = textoENotas(l, rotulo.fim);
    const no = this.novoNo(rotulo.tipo, l, {
      endereco,
      rotulo: rotulo.rotulo,
      rotuloLido: l.texto.slice(0, rotulo.fim).trim(),
      trechos: texto.trechos,
      notas: texto.notas,
      filhos: nome ? [nome] : [],
      linhas: { inicio: nome?.linhas.inicio ?? l.i, fim: l.i },
    });
    pai.filhos.push(no);
    this.fechaFrase.set(no, texto.fechaFrase);
    this.caminho.push(no);
    this.estender(l.i);
    // Regra 10: rótulo antigo tachado ao lado do novo, do mesmo tipo (ALESP: "~~X~~ XI -").
    const antigo = rotuloAntigoTachado(l);
    const origem = antigo === undefined ? undefined : origemDoRotulo(antigo);
    if (origem && origem.segmento.slice(0, 2) === rotulo.segmento.slice(0, 2))
      this.rotulosAntigos.set(no, origem);
  }

  /** O último aberto de nível menor que o do tipo (o artigo, no mínimo). */
  private paiDe(tipo: TipoDeDispositivo): NoRascunho | undefined {
    const profundidade = PROFUNDIDADE[tipo];
    for (let k = this.caminho.length - 1; k > 0; k--) {
      const no = this.caminho[k];
      if (no && PROFUNDIDADE[no.tipo as TipoDeDispositivo] < profundidade) return no;
    }
    return this.caminho[0];
  }

  /** A linha `i` entra na faixa do artigo e de cada dispositivo aberto dentro dele. */
  private estender(i: number): void {
    for (const no of this.caminho) no.linhas.fim = i;
  }

  /** Emenda a linha no texto do último dispositivo; as notas do fim dela vão para as dele. */
  private continuar(l: Linha, separador: '\n' | ' '): void {
    const ultimo = this.ultimo;
    if (!ultimo) return;
    const { trechos, notas, fechaFrase } = textoENotas(l, 0);
    if (ultimo.trechos.length > 0 && trechos.length > 0) ultimo.trechos.push({ texto: separador });
    acrescentar(ultimo.trechos, trechos);
    acrescentar(ultimo.notas, notas);
    if (trechos.length > 0) this.fechaFrase.set(ultimo, fechaFrase);
    this.estender(l.i);
  }

  /** Rubrica que não chegou a um artigo ou dispositivo: volta para o anterior (ou fica solta). */
  private resolverRubrica(): void {
    const r = this.rubrica;
    this.rubrica = undefined;
    if (r) this.devolverRubrica(r);
  }

  /**
   * Rubrica que não chegou: com um artigo aberto, é a última linha do último dispositivo (depois
   * de uma quebra de linha, com as notas); sem artigo, sobra.
   */
  private devolverRubrica(r: RubricaPendente): void {
    if (r.antigas) this.soltarTachadas(r.antigas);
    const ate = ultimaLinha(r);
    const ultimo = this.ultimo;
    if (r.no) {
      // Rubrica de artigo ou dispositivo todo tachado (CP, art. 185): é o nome dele (regra 9).
      r.no.filhos.unshift(this.nomeDe(r));
      r.no.linhas.inicio = Math.min(r.no.linhas.inicio, r.linha.i);
      this.rubricas += 1;
    } else if (ultimo) {
      // As notas do fim da linha saem com o texto (`continuar`); depois, as das linhas só de notas.
      this.continuar(r.linha, '\n');
      acrescentar(
        ultimo.notas,
        r.notas.filter((n) => n.linha !== r.linha.i),
      );
      this.estender(ate);
    } else {
      this.pendentes.push(r.linha);
      acrescentar(this.pendentes, r.linhasDeNota);
    }
  }

  /** Regras 4 e 6: a rubrica vira o filho `nome` do artigo ou do dispositivo; o pedaço tachado, redação anterior dele. */
  private nomeDe(r: RubricaPendente): NoRascunho {
    const { trechos, redacao } = tirarTachado(r.linha, r.fim);
    const redacoes = (r.antigas ?? []).map((t) => {
      const antiga = redacaoDe(t.trechos, t.linha.i, t.linha.i);
      anotar(antiga, t.notasFora);
      return antiga;
    });
    if (redacao) redacoes.push(redacao);
    return this.novoNo('nome', r.linha, {
      trechos,
      notas: r.notas,
      redacoesAnteriores: redacoes,
      confianca: r.duvidosa && this.confianca === 'alta' ? 'media' : this.confianca,
      linhas: { inicio: r.linha.i, fim: ultimaLinha(r) },
    });
  }

  /**
   * Regras 8 e 9: linha tachada inteira (`linha.tachada`). Nunca vira texto vigente: é o nome ou a
   * redação antiga de um nó, um nó provisório (artigo, dispositivo ou nó estrutural todo tachado,
   * que no fim se junta ao de mesmo endereço) ou um dispositivo revogado (rótulo, texto tachado e
   * nota de revogação fora do tachado: "~~Art. 350 - …~~ (Revogado pela Lei…)").
   */
  private tachada(l: Linha, inicio: number, artigo: InicioDeArtigo | undefined): void {
    this.tachadas += 1;
    const t = lerLinhaTachada(l, artigo);
    if (t.tipo === 'estrutural' && t.estrutural) {
      this.soltarRubricasTachadas();
      this.redacaoAberta = undefined;
      this.abrirNo(t.estrutural, l, true);
      return;
    }
    const c = this.cabecalho;
    if (t.tipo === 'outra' && c && this.nomeTachado(c, t)) return;
    if (t.tipo === 'nota' && c) {
      // Nota tachada do nó (CP: "~~(Redação dada pela Lei nº 11.106, de 2005)~~" depois do nome
      // antigo do Capítulo V do Título VI): é do nó provisório ou do nome antigo.
      const notas = lerNotasDaLinha(t.linha) ?? [];
      const antiga = c.no.redacoesAnteriores[c.no.redacoesAnteriores.length - 1];
      if (!this.provisorios.has(c.no) && antiga) anotar(antiga, notas);
      else acrescentar(c.no.notas, notas);
      c.no.linhas.fim = t.linha.i;
      return;
    }
    this.cabecalho = undefined;
    if (t.tipo === 'artigo' || t.tipo === 'dispositivo') {
      this.abrirTachado(t, inicio);
      return;
    }
    if (t.tipo === 'outra' && t.rubrica) {
      // A nota logo depois dela não é da redação de cima.
      this.redacaoAberta = undefined;
      this.rubricasTachadas.push(t);
      return;
    }
    this.soltarRubricasTachadas();
    if (t.tipo === 'nota') this.notaTachada(t);
    else this.continuarTachado(t, t.tipo === 'pena' ? '\n' : ' ');
  }

  /**
   * Linha tachada logo depois do rótulo do nó: o nome dele, se o nó é provisório (a 1ª linha; a
   * seguinte, se as duas estão em caixa alta); o nome antigo, se ainda não tem nome (LC 80: "TÍTULO
   * I / ~~Das Disposições Preliminares~~ / Disposições Gerais"; CF, Seção II do Capítulo VII do
   * Título III). `false` quando a linha já não é dele.
   */
  private nomeTachado(c: Cabecalho, t: LinhaTachada): boolean {
    const l = t.linha;
    if (this.provisorios.has(c.no)) {
      const primeiro = c.nome[0];
      const continua =
        c.estado === 'nome' &&
        c.nome.length < MAX_LINHAS_DO_NOME &&
        primeiro !== undefined &&
        ehCaixaAlta(primeiro.texto) &&
        ehCaixaAlta(l.texto);
      if (c.estado !== 'rotulo' && !continua) return false;
      c.nome.push(l);
      c.estado = 'nome';
      c.no.linhas.fim = l.i;
      const trechos = juntarTrechos(c.nome.map((n) => aparar(n.trechos)));
      const nome = c.no.filhos.find((f) => f.tipo === 'nome');
      if (nome) {
        nome.trechos = trechos;
        nome.linhas.fim = l.i;
      } else c.no.filhos.unshift(this.novoNo('nome', l, { trechos }));
      acrescentar(c.no.notas, t.notasFora);
      return true;
    }
    if (c.estado !== 'rotulo') return false;
    const redacao = redacaoDe(t.trechos, l.i, l.i);
    anotar(redacao, t.notasFora);
    c.no.redacoesAnteriores.push(redacao);
    c.no.linhas.fim = l.i;
    this.redacaoAberta = { no: c.no, redacao, notasNoNo: false };
    return true;
  }

  /**
   * Artigo ou dispositivo tachado. Com nota de revogação fora do tachado (regra 9), é o
   * dispositivo revogado: status `revogado`, texto vazio, as notas de fora e o texto tachado como
   * redação anterior. Sem ela (regra 8), é provisório: a redação anterior do de mesmo endereço,
   * antes ou depois dele. As rubricas tachadas logo antes abrem a redação.
   */
  private abrirTachado(t: LinhaTachada, inicio: number): void {
    const l = t.linha;
    let tipo: NoRascunho['tipo'];
    let endereco: string;
    let rotulo: string;
    let fim: number;
    let pai: NoRascunho | undefined;
    if (t.artigo) {
      tipo = 'artigo';
      endereco = this.bloco.prefixo
        ? `${this.bloco.prefixo}.${t.artigo.endereco}`
        : t.artigo.endereco;
      ({ rotulo, fim } = t.artigo);
    } else if (t.dispositivo) {
      pai = this.paiDe(t.dispositivo.tipo);
      if (!pai) {
        this.semDispositivo(t);
        return;
      }
      tipo = t.dispositivo.tipo;
      endereco = `${pai.endereco}.${t.dispositivo.segmento}`;
      ({ rotulo, fim } = t.dispositivo);
    } else return;
    const rubricas = this.rubricasTachadas;
    this.rubricasTachadas = [];
    const primeira = rubricas[0]?.linha.i ?? inicio;
    const redacao = redacaoDe(
      juntarLinhasDaRedacao([...rubricas.map((r) => r.trechos), t.trechos]),
      primeira,
      l.i,
    );
    for (const r of rubricas) anotar(redacao, r.notasFora);
    const no = this.novoNo(tipo, l, {
      endereco,
      rotulo,
      rotuloLido: l.texto.slice(0, fim).trim(),
      notas: [...t.notasFora],
      redacoesAnteriores: [redacao],
      status: 'revogado',
      linhas: { inicio, fim: l.i },
    });
    // A rubrica vigente pendente é do primeiro tachado depois dela, se nenhum vigente de mesmo
    // endereço vier (CP, art. 185; art. 121, § 2º, VI, "Feminicídio").
    const r = this.rubrica;
    if (t.revoga) {
      this.rubrica = undefined;
      if (r && (r.tachado === undefined || r.tachado === endereco)) {
        no.filhos.push(this.nomeDe(r));
        no.linhas.inicio = r.linha.i;
        this.rubricas += 1;
      } else if (r) this.devolverRubrica(r);
    } else {
      this.provisorios.add(no);
      if (r && r.tachado === undefined) {
        r.tachado = endereco;
        r.no = no;
      }
    }
    if (tipo === 'artigo') {
      this.fecharArtigo();
      this.soltarPendentes();
      this.anexar(no);
      this.caminho = [no];
      this.artigos += 1;
    } else if (pai) {
      this.caminho.length = this.caminho.indexOf(pai) + 1;
      pai.filhos.push(no);
      this.caminho.push(no);
      this.estender(l.i);
    }
    this.fechaFrase.set(no, true);
    this.redacaoAberta = { no, redacao, notasNoNo: true };
  }

  /**
   * "Pena - …" tachada, ou linha tachada que continua a de cima: no nó provisório, continua a
   * redação dele (CP, art. 185: a pena do artigo de 1940); no dispositivo vigente ou revogado, é
   * uma redação anterior própria (CP, art. 214: cada pena antiga do parágrafo único).
   */
  private continuarTachado(t: LinhaTachada, separador: '\n' | ' '): void {
    const alvo = this.ultimo;
    if (!alvo) {
      this.semDispositivo(t);
      return;
    }
    const aberta = this.redacaoAberta;
    const propria = alvo.redacoesAnteriores[alvo.redacoesAnteriores.length - 1];
    if (this.provisorios.has(alvo) && propria) {
      emendar(propria.trechos, t.trechos, separador);
      propria.linhas.fim = t.linha.i;
      acrescentar(alvo.notas, t.notasFora);
      this.redacaoAberta = { no: alvo, redacao: propria, notasNoNo: true };
    } else if (separador === ' ' && aberta?.no === alvo && aberta.redacao === propria) {
      // Texto antigo em mais de uma linha: continua a redação que a linha de cima abriu.
      emendar(aberta.redacao.trechos, t.trechos, separador);
      aberta.redacao.linhas.fim = t.linha.i;
      anotar(aberta.redacao, t.notasFora);
    } else {
      const redacao = redacaoDe(t.trechos, t.linha.i, t.linha.i);
      anotar(redacao, t.notasFora);
      alvo.redacoesAnteriores.push(redacao);
      this.redacaoAberta = { no: alvo, redacao, notasNoNo: false };
    }
    this.estender(t.linha.i);
  }

  /** Nota tachada ("~~- Artigo 9º com redação dada pela…~~", ALESP): descreve a redação de cima. */
  private notaTachada(t: LinhaTachada): void {
    const aberta = this.redacaoAberta;
    if (!aberta) {
      this.continuarTachado(t, '\n');
      return;
    }
    anotar(aberta.redacao, lerNotasDaLinha(t.linha) ?? [{ texto: textoDe(t.trechos) }]);
    aberta.redacao.linhas.fim = t.linha.i;
    if (this.caminho.includes(aberta.no)) this.estender(t.linha.i);
    else aberta.no.linhas.fim = Math.max(aberta.no.linhas.fim, t.linha.i);
  }

  /**
   * Rubricas tachadas que não chegaram a um artigo ou dispositivo tachado: continuam a redação de
   * cima (texto antigo em mais de uma linha) ou, sem ela, ficam no último dispositivo.
   */
  private soltarRubricasTachadas(): void {
    const rubricas = this.rubricasTachadas;
    this.rubricasTachadas = [];
    this.soltarTachadas(rubricas);
  }

  private soltarTachadas(linhas: readonly LinhaTachada[]): void {
    for (const t of linhas) this.continuarTachado(t, '\n');
  }

  /** Linha tachada sem artigo aberto (antes do 1º artigo): sobra, com aviso. */
  private semDispositivo(t: LinhaTachada): void {
    this.anomalias.push(
      anomalia(
        'tachado_sem_dispositivo',
        `Linha tachada sem dispositivo: "${t.linha.texto.slice(0, 80)}".`,
        { linha: t.linha.i },
      ),
    );
    this.descartes.push({ motivo: 'sobra', linhas: { inicio: t.linha.i, fim: t.linha.i } });
  }

  /** A última linha só de notas que foi com a redação anterior de cima. */
  private notaDeTachada: Linha | undefined;

  /**
   * Linha só de notas logo depois de uma linha tachada é da redação anterior ("(Revogado pela Lei
   * nº 12.015, de 2009)" depois do art. 214 do CP, todo tachado; a nota da ALESP logo depois do
   * inciso tachado): vai para o nó que a linha tachada abriu (provisório ou revogado) ou para a
   * nota da redação.
   */
  private notaDaTachada(l: Linha, anterior: Linha): boolean {
    if (!anterior.tachada && anterior !== this.notaDeTachada) return false;
    const aberta = this.redacaoAberta;
    if (!aberta) return false;
    const notas = lerNotasDaLinha(l);
    if (!notas) return false;
    if (aberta.notasNoNo) acrescentar(aberta.no.notas, notas);
    else {
      anotar(aberta.redacao, notas);
      aberta.redacao.linhas.fim = l.i;
    }
    if (this.caminho.includes(aberta.no)) this.estender(l.i);
    else aberta.no.linhas.fim = Math.max(aberta.no.linhas.fim, l.i);
    this.notaDeTachada = l;
    return true;
  }

  private abrirFecho(l: Linha): void {
    this.resolverRubrica();
    this.fecharArtigo();
    this.cabecalho = undefined;
    this.soltarPendentes();
    this.zona = 'fecho';
    this.fecho = { motivo: 'fecho', linhas: { inicio: l.i, fim: l.i } };
    this.descartes.push(this.fecho);
  }

  /**
   * Regra 11: cada cabeçalho abre um anexo, raiz depois da estrutura, com o texto bruto (o resto
   * da linha e as linhas seguintes, sem estruturar) e as notas do fim do cabeçalho. Regra 8 no
   * anexo (decisão da 8.7): a linha tachada nunca vira texto vigente, também aqui. O cabeçalho todo
   * tachado abre um anexo provisório, como o nó provisório: as linhas dele formam uma redação
   * anterior (todo o bloco sob o cabeçalho tachado é o anexo antigo) e, no fim, ele se junta ao
   * anexo de mesmo endereço (LC-SP 988: os dois anexos antigos, "~~ANEXO~~ / ~~a que se refere o
   * artigo 239…~~", do "ANEXO - Revogado."); sem ele, fica revogado.
   */
  private abrirAnexo(c: CabecalhoDeAnexo, l: Linha): void {
    if (this.zona === 'corpo') {
      // Sem fecho reconhecido antes dele: fecha o que o corpo deixou aberto.
      this.soltarRubricasTachadas();
      this.resolverRubrica();
      this.fecharArtigo();
      this.cabecalho = undefined;
      this.soltarPendentes();
      this.redacaoAberta = undefined;
    }
    this.zona = 'anexo';
    const base = {
      endereco: c.endereco,
      rotulo: c.rotulo,
      rotuloLido: l.texto.slice(0, c.fim).trim(),
    };
    if (!l.tachada) {
      const texto = textoENotas(l, c.fim);
      const no = this.novoNo('anexo', l, { ...base, trechos: texto.trechos, notas: texto.notas });
      this.raizes.push(no);
      this.anexo = { no, noCabecalho: true };
      return;
    }
    this.tachadas += 1;
    const t = tachadoENotasFora(l);
    const redacao = redacaoDe(t.trechos, l.i, l.i);
    const no = this.novoNo('anexo', l, {
      ...base,
      notas: [...t.notasFora],
      redacoesAnteriores: [redacao],
      status: 'revogado',
    });
    this.provisorios.add(no);
    this.raizes.push(no);
    this.anexo = { no, noCabecalho: true, redacao };
  }

  /**
   * Linha do anexo aberto. As linhas só de notas logo depois do cabeçalho são dele (regra 7); a
   * nota no meio do texto fica no texto. No provisório, a linha tachada continua a redação, e a
   * linha só de notas entre as linhas dela é a nota da redação (como a da ALESP depois do
   * tachado), menos a que traz nota de revogação, que é do anexo (como a do artigo todo tachado).
   * A linha sem tachado inteiro (texto, ou tabela com tachado parcial) também continua a redação,
   * com as marcas como vieram: nunca vira texto vigente, e no fim deixa aviso e confiança média
   * (`resolverTachados`). No anexo vigente, a linha toda tachada fica no texto bruto com a marca,
   * como o tachado parcial: a regra 11 não estrutura, e ela só conta em `linhasTachadas` se o anexo
   * for revogado (`aplicarStatus`).
   */
  private lerNoAnexo(a: AnexoAberto, l: Linha): void {
    const { no, redacao } = a;
    no.linhas.fim = l.i;
    const notas = !l.tachada && (a.noCabecalho || redacao) ? lerNotasDaLinha(l) : undefined;
    if (notas && (a.noCabecalho || notas.some((n) => n.tipo === 'revogado'))) {
      acrescentar(no.notas, notas);
      return;
    }
    a.noCabecalho = false;
    if (!redacao) {
      if (l.tachada) this.tachadasNoAnexo.set(no, (this.tachadasNoAnexo.get(no) ?? 0) + 1);
      emendar(no.trechos, aparar(l.trechos), '\n');
      return;
    }
    if (notas) anotar(redacao, notas);
    else if (l.tachada) {
      this.tachadas += 1;
      const t = tachadoENotasFora(l);
      emendar(redacao.trechos, t.trechos, '\n');
      anotar(redacao, t.notasFora);
    } else {
      this.semTachadoNoAnexo.add(no);
      emendar(redacao.trechos, aparar(l.trechos), '\n');
    }
    redacao.linhas.fim = l.i;
  }

  /** Linhas depois do nome do nó que não chegaram a um artigo: sobra, com aviso. */
  private soltarPendentes(): void {
    if (this.pendentes.length === 0) return;
    this.soltar(this.pendentes);
    this.pendentes = [];
  }

  /** Sobra da fonte, com um aviso por linha. */
  private soltar(linhas: readonly Linha[], onde = 'fora de artigo'): void {
    let faixa: FaixaDeLinhas | undefined;
    for (const l of linhas) {
      this.anomalias.push(
        anomalia('linha_solta', `Linha ${onde}: "${l.texto.slice(0, 80)}".`, { linha: l.i }),
      );
      if (faixa && faixa.fim + 1 === l.i) faixa.fim = l.i;
      else {
        faixa = { inicio: l.i, fim: l.i };
        this.descartes.push({ motivo: 'sobra', linhas: faixa });
      }
    }
  }

  /**
   * Nó repetido sem artigo no meio: vale o último ("TÍTULO VI — DOS CRIMES CONTRA OS COSTUMES"
   * sem tachado antes do novo Título VI do CP). O anterior vira redação anterior do último, e os
   * filhos dele passam para o último (e se mesclam com os de mesmo rótulo); o último fica com
   * confiança média (regra 12).
   */
  private mesclarSubstituidos(filhos: NoRascunho[]): void {
    // Cadeias de nós de mesmo segmento em que todos, menos o último, estão sem artigo; cada nó é
    // remontado uma vez só (sem custo quadrático numa página hostil com o mesmo rótulo repetido).
    const abertas = new Map<string, NoRascunho[]>();
    const cadeias: NoRascunho[][] = [];
    for (const no of filhos) {
      const segmento = this.segmentos.get(no);
      // O nó tachado (8.6) não entra: se junta ao de mesmo endereço em `resolverTachados`.
      if (segmento === undefined || this.provisorios.has(no)) continue;
      const cadeia = abertas.get(segmento);
      const ultimo = cadeia?.[cadeia.length - 1];
      if (cadeia && ultimo && !this.temArtigo(ultimo)) cadeia.push(no);
      else {
        const nova = [no];
        abertas.set(segmento, nova);
        cadeias.push(nova);
      }
    }
    const removidos = new Set<NoRascunho>();
    for (const cadeia of cadeias) {
      const ultimo = cadeia.pop();
      if (ultimo === undefined || cadeia.length === 0) continue;
      const redacoes: RedacaoAnterior[] = [];
      const herdados: NoRascunho[] = [];
      for (const anterior of cadeia) {
        removidos.add(anterior);
        const rotuloENome = juntarTrechos([
          [{ texto: anterior.rotulo ?? '' }],
          anterior.filhos.find((f) => f.tipo === 'nome')?.trechos ?? [],
        ]);
        acrescentar(redacoes, anterior.redacoesAnteriores);
        redacoes.push({
          trechos: rotuloENome,
          origemDeteccao: 'heuristica',
          confirmada: false,
          linhas: anterior.linhas,
        });
        acrescentar(
          herdados,
          anterior.filhos.filter((f) => f.tipo !== 'nome'),
        );
        this.anomalias.push(
          anomalia(
            'estrutural_substituido',
            `"${textoDe(rotuloENome)}" aparece antes de outro ${anterior.rotulo ?? ''} sem artigo no meio; ficou o último.`,
            { linha: anterior.linhas.inicio },
          ),
        );
      }
      ultimo.redacoesAnteriores = [...redacoes, ...ultimo.redacoesAnteriores];
      const [nomes, resto] = particionar(ultimo.filhos, (f) => f.tipo === 'nome');
      ultimo.filhos = [...nomes, ...herdados, ...resto];
      this.porHeuristica(ultimo);
    }
    if (removidos.size > 0) {
      const saida = filhos.filter((no) => !removidos.has(no));
      filhos.splice(0, filhos.length, ...saida);
    }
    for (const no of filhos) if (ehEstrutural(no)) this.mesclarSubstituidos(no.filhos);
  }

  /**
   * Nó sem nome seguido da rubrica do 1º artigo: a regra 3 toma a rubrica por nome do nó. Numa
   * norma com rubricas e com os nomes dos nós em caixa alta (o CP: todos menos "das fraudes em
   * certames…"), o "nome" de uma linha em caixa mista logo antes de um artigo sem rubrica é a
   * rubrica dele (confiança média), salvo se começa como nome de nó ("Do", "Da", "Dos", "Das"; no
   * CP, nenhuma rubrica começa assim). No corpus não acontece: todo nó com linha depois do rótulo
   * tem nome.
   */
  private rubricaNoNomeDoNo(): void {
    const estruturais: NoRascunho[] = [];
    const visitar = (nos: readonly NoRascunho[]) => {
      for (const no of nos)
        if (ehEstrutural(no) && !this.provisorios.has(no)) {
          estruturais.push(no);
          visitar(no.filhos);
        }
    };
    visitar(this.raizes);
    const nomes = estruturais.flatMap((no) => no.filhos.filter((f) => f.tipo === 'nome'));
    const emCaixaAlta = nomes.filter((n) => ehCaixaAlta(textoDe(n.trechos))).length;
    if (emCaixaAlta < 0.9 * nomes.length) return;
    for (const no of estruturais) {
      const [nome, artigo] = no.filhos;
      if (nome?.tipo !== 'nome' || artigo?.tipo !== 'artigo') continue;
      const texto = textoDe(nome.trechos);
      if (
        artigo.filhos[0]?.tipo === 'nome' ||
        nome.linhas.inicio !== nome.linhas.fim ||
        nome.linhas.inicio === no.linhas.inicio || // na linha do rótulo, é nome mesmo
        nome.redacoesAnteriores.length > 0 ||
        ehCaixaAlta(texto) ||
        !/^\p{Lu}/u.test(texto) ||
        /^D[oa]s? /u.test(texto) ||
        /[;:,]$/.test(texto)
      )
        continue;
      const [daRubrica, doNo] = particionar(no.notas, (n) => n.linha === nome.linhas.inicio);
      no.notas = doNo;
      no.filhos.shift();
      artigo.filhos.unshift({
        ...nome,
        notas: daRubrica,
        confianca: this.confianca === 'alta' ? 'media' : this.confianca,
      });
      artigo.linhas.inicio = nome.linhas.inicio;
    }
  }

  /** Há artigo na subárvore? (memorizado: cada nó é consultado no máximo uma vez por nível). */
  private readonly comArtigo = new Map<NoRascunho, boolean>();
  private temArtigo(no: NoRascunho): boolean {
    let r = this.comArtigo.get(no);
    if (r === undefined) {
      r = no.filhos.some((f) => f.tipo === 'artigo' || (ehEstrutural(f) && this.temArtigo(f)));
      this.comArtigo.set(no, r);
    }
    return r;
  }

  /**
   * Mesmo endereço de artigo, dispositivo ou anexo mais de uma vez, sem tachado (caso `duplicata`:
   * CP, art. 141, § 2º, "(VETADO)" e depois o texto incluído com a derrubada do veto): vale o
   * último. Os anteriores viram redações anteriores dele (heurística, a confirmar; ele fica com
   * confiança média, regra 12), e os filhos deles passam para ele, antes dos seus. Uma passada por
   * nível (o raso primeiro), porque os filhos trazidos podem repetir os dele; cada grupo se funde
   * de uma vez (sem custo quadrático numa página hostil com o mesmo endereço repetido).
   */
  private fundirRepetidos(): void {
    for (let passada = 0; passada < 10; passada++) {
      const grupos = new Map<string, { no: NoRascunho; lista: NoRascunho[] }[]>();
      const visitar = (lista: NoRascunho[]) => {
        for (const no of lista) {
          if (NORMATIVOS.has(no.tipo) && !this.provisorios.has(no)) {
            const grupo = grupos.get(no.endereco);
            if (grupo) grupo.push({ no, lista });
            else grupos.set(no.endereco, [{ no, lista }]);
          }
          visitar(no.filhos);
        }
      };
      visitar(this.raizes);
      const repetidos = [...grupos.values()].filter((g) => g.length > 1);
      if (repetidos.length === 0) return;
      const nivel = (g: { no: NoRascunho }[]) => g[0]?.no.endereco.split('.').length ?? 0;
      const raso = repetidos.reduce((m, g) => Math.min(m, nivel(g)), Infinity);
      const removidos = new Set<NoRascunho>();
      const listas = new Set<NoRascunho[]>();
      for (const grupo of repetidos) {
        if (nivel(grupo) !== raso) continue;
        const ultimo = grupo[grupo.length - 1];
        if (!ultimo) continue;
        const anteriores = grupo.slice(0, -1);
        this.fundir(
          anteriores.map((g) => g.no),
          ultimo.no,
        );
        for (const { no, lista } of anteriores) {
          removidos.add(no);
          listas.add(lista);
        }
      }
      // Um filtro por lista (sem `indexOf` + `splice` por nó, que fica quadrático).
      for (const lista of listas) {
        const saida = lista.filter((no) => !removidos.has(no));
        lista.length = 0;
        acrescentar(lista, saida);
      }
    }
  }

  private fundir(anteriores: readonly NoRascunho[], no: NoRascunho): void {
    let nome = no.filhos[0]?.tipo === 'nome' ? no.filhos[0] : undefined;
    const filhos: NoRascunho[] = [];
    const redacoes: RedacaoAnterior[] = [];
    for (const antigo of anteriores) {
      for (const f of antigo.filhos)
        if (f.tipo === 'nome') nome ??= f;
        else filhos.push(f);
      antigo.filhos = [];
      acrescentar(redacoes, antigo.redacoesAnteriores);
      // Revogação reescrita (CP, art. 171, § 5º: "§ 5º ~~…~~ (Revogado pela…)" e depois "§ 5º
      // (Revogado). (Redação dada…)"): o revogado de texto vazio só passa as redações dele.
      const ultima = antigo.redacoesAnteriores[antigo.redacoesAnteriores.length - 1];
      if (antigo.status === 'revogado' && antigo.trechos.length === 0 && ultima) {
        anotar(ultima, antigo.notas);
        continue;
      }
      const nota = antigo.notas
        .map((n) => n.texto)
        .join(' ')
        .slice(0, 2_000);
      redacoes.push({
        trechos: juntarTrechos([
          [{ texto: antigo.rotuloLido ?? antigo.rotulo ?? '' }],
          antigo.trechos,
        ]),
        ...(nota ? { nota } : {}),
        origemDeteccao: 'heuristica',
        confirmada: false,
        linhas: antigo.linhas,
      });
      this.porHeuristica(no);
      this.anomalias.push(
        anomalia(
          'duplicata',
          `${no.rotulo ?? ''} (${no.endereco}) aparece mais de uma vez sem tachado; ficou o último, e o anterior virou redação anterior.`,
          { endereco: no.endereco, linha: antigo.linhas.inicio },
        ),
      );
    }
    const saida = nome ? [nome] : [];
    acrescentar(saida, filhos);
    acrescentar(
      saida,
      no.filhos.filter((f) => f.tipo !== 'nome'),
    );
    no.filhos = saida;
    acrescentar(redacoes, no.redacoesAnteriores);
    no.redacoesAnteriores = redacoes;
  }

  /**
   * Regra 8, no fim: cada nó provisório (lido de uma linha toda tachada) se junta ao nó de mesmo
   * endereço, lido antes ou depois dele (o texto antigo vira redação anterior, e os filhos passam
   * para ele). Sem ele, o artigo fica revogado com a rubrica que capturou (caso
   * `artigo-so-tachado`: CP, arts. 185 e 279), e o anexo tachado também (o anexo tachado com texto
   * sem tachado deixa aviso e confiança média no que recebe a redação); o dispositivo e o nó
   * estrutural vão para o ancestral, com `enderecoLido` (a Parte Geral de 1940 do CP; o parágrafo
   * único que virou § 1º na LEP). Do raso ao fundo (o filho já está no lugar do pai quando chega a
   * vez dele), a estrutura antes; cada lista é refeita uma vez só.
   */
  private resolverTachados(): void {
    if (this.provisorios.size === 0) return;
    const pais = new Map<NoRascunho, NoRascunho | undefined>();
    const reais = new Map<string, NoRascunho>();
    const pilha: [NoRascunho, NoRascunho | undefined][] = this.raizes.map((no) => [no, undefined]);
    for (let par = pilha.pop(); par; par = pilha.pop()) {
      const [no, pai] = par;
      pais.set(no, pai);
      if (no.tipo !== 'nome' && !this.provisorios.has(no) && !reais.has(no.endereco))
        reais.set(no.endereco, no);
      for (const f of no.filhos) pilha.push([f, no]);
    }
    const nivel = (no: NoRascunho) => no.endereco.split('.').length;
    const ordem = [...this.provisorios].sort(
      (a, b) =>
        Number(!ehEstrutural(a)) - Number(!ehEstrutural(b)) ||
        nivel(a) - nivel(b) ||
        a.linhas.inicio - b.linhas.inicio,
    );
    const removidos = new Set<NoRascunho>();
    /** O nó estrutural tachado sem o de mesmo endereço dá lugar aos filhos dele. */
    const substitutos = new Map<NoRascunho, NoRascunho[]>();
    const listas = new Set<NoRascunho[]>();
    const destinos = new Set<NoRascunho>();
    const primeiraRaiz = this.raizes.find((r) => ehEstrutural(r) && !this.provisorios.has(r));
    const tirar = (no: NoRascunho) => {
      removidos.add(no);
      listas.add(pais.get(no)?.filhos ?? this.raizes);
    };
    // Os filhos (sem o nome) passam para o destino, antes ou depois dos dele, pela ordem do texto;
    // entram no fim, uma vez por destino (refazer a lista a cada junção ficava quadrático).
    const vindosAntes = new Map<NoRascunho, NoRascunho[]>();
    const vindosDepois = new Map<NoRascunho, NoRascunho[]>();
    const mudarFilhos = (de: NoRascunho, para: NoRascunho) => {
      const vindos = de.filhos.filter((f) => f.tipo !== 'nome');
      if (vindos.length === 0) return;
      for (const f of vindos) pais.set(f, para);
      const vindosDe = de.linhas.inicio < para.linhas.inicio ? vindosAntes : vindosDepois;
      const lista = vindosDe.get(para);
      if (lista) acrescentar(lista, vindos);
      else vindosDe.set(para, vindos);
      listas.add(para.filhos);
    };
    for (const p of ordem) {
      this.provisorios.delete(p);
      const gemeo = reais.get(p.endereco);
      if (this.semTachadoNoAnexo.has(p)) {
        // Anexo tachado com linha sem tachado inteiro: ficou tudo na redação (heurística, regra 12),
        // que vai para o de mesmo endereço ou fica no próprio, revogado.
        this.porHeuristica(gemeo ?? p);
        this.anomalias.push(
          anomalia(
            'artigo_so_tachado',
            `${p.rotulo ?? p.endereco} está tachado, mas tem texto sem tachado depois do cabeçalho; ficou tudo na redação anterior.`,
            { endereco: p.endereco, linha: p.linhas.inicio },
          ),
        );
      }
      // Artigo ou dispositivo tachado com texto vigente lido depois dele (nenhum caso no corpus; o
      // anexo provisório não tem texto): continua o de mesmo endereço; sem ele, o nó fica, vigente,
      // com aviso.
      if (p.trechos.length > 0 && !ehEstrutural(p)) {
        if (gemeo) {
          emendar(gemeo.trechos, p.trechos, '\n');
          gemeo.linhas.fim = Math.max(gemeo.linhas.fim, p.linhas.fim);
          acrescentar(gemeo.notas, p.notas);
          p.notas = [];
        } else {
          p.status = 'vigente';
          reais.set(p.endereco, p);
          this.anomalias.push(
            anomalia(
              'artigo_so_tachado',
              `${p.rotulo ?? p.endereco} está tachado, mas tem texto sem tachado depois dele.`,
              { endereco: p.endereco, linha: p.linhas.inicio },
            ),
          );
          continue;
        }
      }
      const nome = p.filhos.find((f) => f.tipo === 'nome');
      const redacoes = ehEstrutural(p)
        ? [this.redacaoDoNo(p, nome), ...p.redacoesAnteriores]
        : p.redacoesAnteriores;
      const propria = redacoes[0];
      if (!ehEstrutural(p) && propria) {
        // A rubrica que o tachado capturou e as notas de fora do tachado são da redação dele.
        if (nome && gemeo?.filhos[0]?.tipo === 'nome') {
          propria.trechos = juntarLinhasDaRedacao([nome.trechos, propria.trechos]);
          propria.linhas.inicio = Math.min(propria.linhas.inicio, nome.linhas.inicio);
        }
        if (gemeo) anotar(propria, p.notas);
      }
      if (gemeo) {
        if (!ehEstrutural(p) && nome && gemeo.filhos[0]?.tipo !== 'nome') {
          gemeo.filhos.unshift(nome);
          gemeo.linhas.inicio = Math.min(gemeo.linhas.inicio, nome.linhas.inicio);
        }
        acrescentar(gemeo.redacoesAnteriores, redacoes);
        destinos.add(gemeo);
        mudarFilhos(p, gemeo);
        tirar(p);
        continue;
      }
      if (p.tipo === 'artigo' || p.tipo === 'anexo') {
        // Artigo ou anexo só tachado: revogado, com a rubrica (regra 9). Sem nota de revogação, é
        // heurística (regra 12).
        reais.set(p.endereco, p);
        if (!p.notas.some((n) => n.tipo === 'revogado')) this.porHeuristica(p);
        continue;
      }
      const pai = pais.get(p);
      if (!pai || ehEstrutural(p)) {
        // Nó estrutural tachado sem o de mesmo endereço: o antigo vai para o pai; os filhos, para o
        // lugar dele.
        const destino = pai ?? primeiraRaiz;
        if (destino) {
          for (const r of redacoes) destino.redacoesAnteriores.push(comEndereco(r, p.endereco));
          destinos.add(destino);
        } else this.semLugar(p);
        const filhos = p.filhos.filter((f) => f.tipo !== 'nome');
        for (const f of filhos) pais.set(f, pai);
        substitutos.set(p, filhos);
        tirar(p);
        continue;
      }
      // Dispositivo tachado sem o de mesmo endereço: a redação vai para o pai (já resolvido).
      this.dissolver(p, pai, pais, destinos, reais);
      tirar(p);
    }
    for (const para of new Set([...vindosAntes.keys(), ...vindosDepois.keys()])) {
      const [nomes, resto] = particionar(para.filhos, (f) => f.tipo === 'nome');
      para.filhos.length = 0;
      for (const parte of [nomes, vindosAntes.get(para) ?? [], resto, vindosDepois.get(para) ?? []])
        acrescentar(para.filhos, parte);
    }
    const expandir = (no: NoRascunho, saida: NoRascunho[]): void => {
      const lugar = substitutos.get(no);
      if (lugar) for (const f of lugar) expandir(f, saida);
      else if (!removidos.has(no)) saida.push(no);
    };
    for (const lista of listas) {
      const saida: NoRascunho[] = [];
      for (const no of lista) expandir(no, saida);
      lista.length = 0;
      acrescentar(lista, saida);
    }
    for (const no of destinos)
      no.redacoesAnteriores.sort((a, b) => a.linhas.inicio - b.linhas.inicio);
  }

  /**
   * O dispositivo sai da árvore e as redações dele vão para o destino, com o endereço lido. Os
   * filhos: o provisório passa para o destino (a vez dele vem depois); o revogado sem pai sai
   * também (CP, art. 187, parágrafo único, II); o vigente passa para o destino, com aviso e
   * confiança média (regra 12).
   */
  private dissolver(
    no: NoRascunho,
    destino: NoRascunho,
    pais: Map<NoRascunho, NoRascunho | undefined>,
    destinos: Set<NoRascunho>,
    reais: Map<string, NoRascunho>,
  ): void {
    const propria = no.redacoesAnteriores[0];
    if (propria) anotar(propria, no.notas);
    const nome = no.filhos.find((f) => f.tipo === 'nome');
    if (nome && propria) propria.trechos = juntarLinhasDaRedacao([nome.trechos, propria.trechos]);
    for (const r of no.redacoesAnteriores)
      destino.redacoesAnteriores.push(comEndereco(r, no.endereco));
    destinos.add(destino);
    for (const f of no.filhos) {
      if (f.tipo === 'nome') continue;
      if (this.provisorios.has(f) || f.status === 'vigente') {
        pais.set(f, destino);
        destino.filhos.push(f);
        if (!this.provisorios.has(f)) {
          this.porHeuristica(f);
          this.anomalias.push(
            anomalia(
              'sem_pai',
              `${f.rotulo ?? f.endereco} está sob um dispositivo que só existe tachado.`,
              { endereco: f.endereco, linha: f.linhas.inicio },
            ),
          );
        }
      } else {
        // O revogado sem pai sai também: o tachado de mesmo endereço, se vier, vai para o destino.
        if (reais.get(f.endereco) === f) reais.delete(f.endereco);
        this.dissolver(f, destino, pais, destinos, reais);
      }
    }
    no.filhos = [];
  }

  /** A redação anterior de um nó estrutural tachado: o rótulo e o nome, como vieram. */
  private redacaoDoNo(no: NoRascunho, nome: NoRascunho | undefined): RedacaoAnterior {
    const redacao = redacaoDe(
      juntarTrechos([[{ texto: no.rotulo ?? '', tachado: true }], nome?.trechos ?? []]),
      no.linhas.inicio,
      no.linhas.fim,
    );
    anotar(redacao, no.notas);
    return redacao;
  }

  /** Redação sem nó que a receba (nó estrutural tachado antes de qualquer outro): sobra, com aviso. */
  private semLugar(no: NoRascunho): void {
    this.anomalias.push(
      anomalia(
        'tachado_sem_dispositivo',
        `${no.rotulo ?? no.endereco}, tachado, não tem onde ficar.`,
        { linha: no.linhas.inicio },
      ),
    );
    this.descartes.push({ motivo: 'sobra', linhas: { ...no.linhas } });
  }

  /**
   * Regras 9 e 10 e VETADO, na árvore pronta: "(Revogado)" sozinho (ou "Revogado.", ALESP) é o
   * dispositivo revogado, de texto vazio; "(VETADO)" sozinho, o vetado (mantém o endereço e o
   * texto); nota "Renumerado…" (ou o rótulo antigo tachado ao lado do novo, ALESP) dá
   * `renumeradoDe` e o status `renumerado` ao vigente (o revogado continua revogado: LEP, art.
   * 124, § 2º). No anexo, o texto sem tachado se mede sem os espaços e as quebras das pontas (duas
   * linhas tachadas no texto bruto deixam "\n"), e o revogado guarda as linhas tachadas.
   */
  private aplicarStatus(): void {
    const pilha: { no: NoRascunho; pai?: NoRascunho; artigo?: NoRascunho }[] = this.raizes.map(
      (no) => ({ no }),
    );
    for (let item = pilha.pop(); item; item = pilha.pop()) {
      const { no, pai } = item;
      const artigo = no.tipo === 'artigo' ? no : item.artigo;
      if (NORMATIVOS.has(no.tipo)) {
        const semTachado = textoDe(no.trechos.filter((t) => !t.tachado));
        const texto = no.tipo === 'anexo' ? semTachado.trim() : semTachado;
        const revogaPorNota = texto === '' && no.notas.some((n) => n.tipo === 'revogado');
        if (no.status === 'vigente' && (SO_REVOGADO.test(texto) || revogaPorNota)) {
          no.status = 'revogado';
          if (no.tipo === 'anexo') this.guardarTachadoDoAnexo(no);
          no.trechos = [];
        } else if (no.status === 'vigente' && SO_VETADO.test(texto)) no.status = 'vetado';
      }
      if (no.tipo !== 'nome') this.renumeracao(no, pai, artigo);
      for (const f of no.filhos) pilha.push({ no: f, pai: no, ...(artigo ? { artigo } : {}) });
    }
  }

  /**
   * Anexo vigente revogado ("ANEXO - Revogado." ou a nota de revogação) com linhas tachadas no
   * texto bruto: antes de o texto se esvaziar, elas viram uma redação anterior dele (com a faixa do
   * anexo) e passam a contar em `linhasTachadas`, como as outras redações.
   */
  private guardarTachadoDoAnexo(no: NoRascunho): void {
    const trechos = tachadosDoAnexo(no.trechos);
    if (trechos.length === 0) return;
    no.redacoesAnteriores.push(redacaoDe(trechos, no.linhas.inicio, no.linhas.fim));
    no.redacoesAnteriores.sort((a, b) => a.linhas.inicio - b.linhas.inicio);
    this.tachadas += this.tachadasNoAnexo.get(no) ?? 0;
  }

  /** Regra 10: a nota "Renumerado…" ou o rótulo antigo tachado (ALESP, `renumeradoDe`). */
  private renumeracao(no: NoRascunho, pai?: NoRascunho, artigo?: NoRascunho): void {
    const nota = no.notas.find((n) => n.tipo === 'renumerado');
    const antigo = this.rotulosAntigos.get(no);
    if (!nota && antigo === undefined) return;
    const origem = antigo ?? (nota ? lerRenumeracao(nota.texto).origem : undefined);
    if (no.status === 'vigente') no.status = 'renumerado';
    if (!origem) return;
    const base =
      origem.relativo === 'artigo'
        ? (artigo?.endereco ?? pai?.endereco)
        : origem.relativo === 'pai'
          ? pai?.endereco
          : this.prefixoDoArtigo(no);
    no.renumeradoDe = base ? `${base}.${origem.segmento}` : origem.segmento;
  }

  /** Prefixo do bloco do artigo (`adct`), para "Renumerado do art. X" dentro do ADCT. */
  private prefixoDoArtigo(no: NoRascunho): string | undefined {
    const m = /^(\w+)\.art/.exec(no.endereco);
    return m?.[1];
  }

  /** Endereço estrutural = caminho dos segmentos; o do artigo não depende do caminho. */
  private enderecar(nos: NoRascunho[], prefixo: string): void {
    for (const no of nos) {
      const segmento = this.segmentos.get(no);
      if (segmento !== undefined) no.endereco = prefixo ? `${prefixo}.${segmento}` : segmento;
      for (const f of no.filhos) if (f.tipo === 'nome') f.endereco = `${no.endereco}.nome`;
      this.enderecar(
        no.filhos.filter((f) => f.tipo !== 'nome'),
        segmento === undefined ? prefixo : no.endereco,
      );
    }
  }
}

/** Linhas de uma redação anterior (rubricas, texto), separadas por quebra de linha. */
function juntarLinhasDaRedacao(partes: readonly Trecho[][]): Trecho[] {
  const saida: Trecho[] = [];
  for (const p of partes) emendar(saida, p, '\n');
  return saida;
}

/** Emenda os trechos no fim dos de destino, com o separador entre os dois (sem cópia: linear). */
function emendar(destino: Trecho[], trechos: readonly Trecho[], separador: '\n' | ' '): void {
  if (trechos.length === 0) return;
  if (destino.length > 0) destino.push({ texto: separador });
  acrescentar(destino, trechos);
}

/**
 * Os trechos tachados do texto bruto do anexo, linha a linha (as linhas vêm separadas por
 * `{ texto: '\n' }`, de `emendar`, e a quebra entre elas fica); o resto da linha ("Revogado.") sai.
 */
function tachadosDoAnexo(trechos: readonly Trecho[]): Trecho[] {
  const saida: Trecho[] = [];
  let linha: Trecho[] = [];
  for (const t of trechos) {
    if (!t.tachado && t.texto === '\n') {
      emendar(saida, aparar(linha), '\n');
      linha = [];
    } else if (t.tachado || t.texto.trim() === '') linha.push(t);
  }
  emendar(saida, aparar(linha), '\n');
  return saida;
}

/** A redação que foi para o ancestral guarda o endereço lido. */
const comEndereco = (r: RedacaoAnterior, endereco: string): RedacaoAnterior => ({
  ...r,
  enderecoLido: r.enderecoLido ?? endereco,
});

const ultimaLinha = (r: RubricaPendente) =>
  (r.linhasDeNota[r.linhasDeNota.length - 1] ?? r.linha).i;

/**
 * Prefixo do bloco pelo título ou pelo nome do nó que o abre: "ATO DAS DISPOSIÇÕES
 * CONSTITUCIONAIS TRANSITÓRIAS" → `adct`; "Das Disposições Transitórias" (LC-SP 988) e "…Finais e
 * Transitórias" → `dt`.
 */
function prefixoDoBloco(titulo: string): string | undefined {
  const t = titulo.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ');
  if (/DISPOSICOES CONSTITUCIONAIS TRANSITORIAS/.test(t)) return 'adct';
  if (/TRANSITORIAS/.test(t)) return 'dt';
  return undefined;
}

/** Regra 11: o cabeçalho de anexo no começo da linha (na chave, tachada ou não). */
function lerCabecalhoDeAnexo(l: Linha): CabecalhoDeAnexo | undefined {
  const m = ANEXO.exec(l.chave);
  if (!m) return undefined;
  const numero = m[1];
  const sufixo = numero === undefined ? '' : /^[ÚU]NICO$/u.test(numero) ? 'Unico' : numero;
  SEPARADOR_DO_ANEXO.lastIndex = m[0].length;
  SEPARADOR_DO_ANEXO.exec(l.chave);
  return {
    endereco: `anexo${sufixo}`,
    rotulo: l.texto.slice(0, m[0].length).replace(/\s+/gu, ' ').slice(0, 200),
    fim: SEPARADOR_DO_ANEXO.lastIndex,
  };
}

/** A linha fecha a citação (aspas no fim, antes de pontuação, "(NR)" e notas). */
function fechaCitacao(l: Linha): boolean {
  const { fim } = separarNotasFinais(l);
  return FECHA_CITACAO.test(l.chave.slice(0, fim).trimEnd());
}

/**
 * Regra 7: o texto da linha de `inicio` ao fim, sem as notas do fim (a pontuação que vinha depois
 * delas volta para o texto), as notas e se o texto termina a frase (".", ";" ou ":").
 */
function textoENotas(
  l: Linha,
  inicio: number,
): { trechos: Trecho[]; notas: NotaDeVigencia[]; fechaFrase: boolean } {
  const { fim, notas, pontuacao } = separarNotasFinais(l, inicio);
  const trechos = aparar(recortar(l.trechos, inicio, fim));
  const ultimo = trechos[trechos.length - 1];
  if (pontuacao !== undefined && ultimo) {
    if (ultimo.tachado) trechos.push({ texto: pontuacao });
    else ultimo.texto += pontuacao;
  }
  const texto = l.chave.slice(inicio, fim).trimEnd() + (pontuacao ?? '');
  return { trechos, notas, fechaFrase: /[.;:]$/.test(texto) };
}

/** `texto[0, fim)` da linha sem o tachado; o pedaço tachado, como redação anterior. */
function tirarTachado(l: Linha, fim: number): { trechos: Trecho[]; redacao?: RedacaoAnterior } {
  const trechos = recortar(l.trechos, 0, fim);
  if (!trechos.some((t) => t.tachado)) return { trechos: aparar(trechos) };
  return {
    trechos: semTachado(trechos),
    redacao: {
      trechos: aparar(trechos),
      origemDeteccao: 'tachado',
      confirmada: true,
      linhas: { inicio: l.i, fim: l.i },
    },
  };
}

/** "Art." numa linha e o número na seguinte: uma linha só, com um espaço entre as duas. */
function juntarLinhas(a: Linha, b: Linha): Linha {
  const trechos = juntarTrechos([a.trechos, b.trechos]);
  const texto = textoDe(trechos);
  return {
    i: b.i,
    trechos,
    texto,
    chave: chaveDeCasamento(texto),
    tachada: a.tachada && b.tachada,
  };
}

/** Os trechos fora do tachado, sem o espaço duplo que a retirada deixa. */
function semTachado(trechos: readonly Trecho[]): Trecho[] {
  const saida: Trecho[] = [];
  for (const t of trechos) {
    if (t.tachado) continue;
    const ultimo = saida[saida.length - 1];
    const texto = ultimo && /\s$/.test(ultimo.texto) ? t.texto.replace(/^\s+/, '') : t.texto;
    if (texto !== '') saida.push({ ...t, texto });
  }
  return aparar(saida);
}

function particionar<T>(lista: readonly T[], teste: (x: T) => boolean): [T[], T[]] {
  const sim: T[] = [];
  const nao: T[] = [];
  for (const x of lista) (teste(x) ? sim : nao).push(x);
  return [sim, nao];
}
