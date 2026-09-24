// Estruturador (F2; Parte 2 §10.6, "fatiarLei"): blocos do sanitizador ou de `textoParaBlocos` →
// Rascunho. Domínio puro, sem tela nem banco. Ordem das regras: normalização (1, 8.1), blocos
// pré-normativos (2) e hierarquia estrutural (3, 8.2), rubrica (4) e artigo (5) (8.3); o resto vem
// nas seguintes:
// - 8.4: caput, parágrafo, inciso, alínea e item (as demais linhas do artigo ficam na faixa; o
//   texto do artigo é o da linha do rótulo);
// - 8.6: redação anterior. Até lá, linha tachada vira descarte `redacao_anterior`, nunca texto.
// Toda linha cai num nó (pela faixa), nota, metadado ou descarte.
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
import { lerNotasDaLinha, separarNotasFinais } from './notas';
import { lerPreNormativo } from './prenormativo';
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

/**
 * Vai para `VersaoDeNorma.versaoAdaptador`: sobe a cada atividade que muda a saída (0.4 na 8.4…),
 * para a fonte guardada ser reprocessada quando o estruturador melhorar.
 */
export const VERSAO_ESTRUTURADOR = '0.4';

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
  const { nos, descartes, anomalias } = corpo.concluir();
  if (relatorio.perdidos > 0)
    anomalias.unshift({
      tipo: 'caractere_perdido',
      gravidade: 'aviso',
      mensagem: `${String(relatorio.perdidos)} caractere(s) chegaram ilegíveis (�); confira acentos no texto.`,
    });
  return {
    versaoEstruturador: VERSAO_ESTRUTURADOR,
    formatoEntrada: formato,
    totalLinhas: blocos.length,
    normalizacao: relatorio,
    metadados: pre.metadados,
    notasDaNorma: pre.notasDaNorma,
    nos: pre.preambulo ? [pre.preambulo, ...nos] : nos,
    descartes: [...pre.descartes, ...descartes].sort((a, b) => a.linhas.inicio - b.linhas.inicio),
    anomalias,
  };
}

/** Local e data que abrem o fecho ("Brasília, 11 de julho de 1984;", "Palácio dos Bandeirantes, 9 de…"). */
const FECHO = /^\p{Lu}[\p{L} ]{2,40}, (?:em )?\d{1,2}º? de \p{L}+ de \d{4}/u;
const ANEXO = /^ANEXO(?!\p{L})/u;
/** No corpus, o nome mais longo tem 2 linhas (CP, Título XII); o limite evita juntar texto solto. */
const MAX_LINHAS_DO_NOME = 4;

/**
 * "Pena - …", "Pena: …" e "Pena Detenção…" (CDC, sem hífen) continuam o último dispositivo,
 * depois de uma quebra de linha; "Pena de multa" e "Pena cumprida no estrangeiro" são rubricas do CP.
 */
const PENA =
  /^(?:Penas?|PENAS?) *[-:]|^Penas? +(?:[Rr]eclus|[Dd]eten|[Pp]ris|[Mm]ulta)\p{L}*(?!\p{L})/u;
/** Citação da lei alterada, entre aspas ('"IV - a qualquer outro…".', CDC, arts. 110 a 117). */
const ABRE_CITACAO = /^["“«]/u;
/** Fim da citação: aspas no fim do texto, antes de pontuação, "(NR)" e notas. */
const FECHA_CITACAO = /["”»][\s.,;:)]*(?:\(NR\)[\s.]*)?$/u;

/** Artigo e os dispositivos da regra 6: endereço repetido funde (vale o último). */
const NORMATIVOS = new Set<string>(['artigo', 'paragrafo', 'inciso', 'alinea', 'item']);

/** Nó estrutural: os da regra 3 e o bloco com numeração própria (ADCT), que fica acima de todos. */
type TipoDeNo = TipoEstrutural | 'bloco';
const ESTRUTURAIS = new Set<string>([...Object.keys(NIVEL), 'bloco']);
const ehEstrutural = (no: NoRascunho): no is NoRascunho & { tipo: TipoDeNo } =>
  ESTRUTURAIS.has(no.tipo);

/**
 * Rubrica candidata (regras 4 e 6): vira o nome do artigo, parágrafo, inciso ou alínea que vier
 * logo depois (só com notas e tachado no meio) ou vira a última linha do dispositivo anterior.
 * Artigo ou dispositivo tachado de outro endereço entre ela e o vigente (CP, art. 185, revogado,
 * antes do 186) diz que a rubrica é dele: fica com o tachado até a 8.6 (caso `artigo-so-tachado`).
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
  private anexo: NoRascunho | undefined;
  private bloco: BlocoAberto = { prefixo: '', maior: 0 };
  /** Prefixos em uso, com o próximo número para repetir a base (`dt`, `dt2`…). */
  private readonly prefixos = new Map<string, number>();
  private blocos = 1;
  private artigos = 0;
  private rubricas = 0;
  private tachadas = 0;
  private ultima: Linha | undefined;

  constructor(private readonly confianca: Confianca) {}

  /** O último dispositivo lido (o artigo, se nenhum outro abriu depois dele). */
  private get ultimo(): NoRascunho | undefined {
    return this.caminho[this.caminho.length - 1];
  }

  ler(l: Linha): void {
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
    if (this.zona === 'anexo' && this.anexo) {
      this.anexo.linhas.fim = l.i;
      return;
    }
    if (this.zona === 'fecho' && this.fecho) {
      if (ANEXO.test(l.chave)) {
        this.abrirAnexo(l);
        return;
      }
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
    if (l.tachada) this.tachada(l, anterior, inicio, artigo);
    else if (this.artigos > 0 && FECHO.test(l.chave)) this.abrirFecho(l);
    else if (rotulo) this.abrirNo(rotulo, l);
    else if (this.cabecalho && this.lerCabecalho(this.cabecalho, l, artigo)) {
      // nome ou nota do nó recém-aberto
    } else if (artigo) this.abrirArtigo(artigo, l, inicio);
    else if (this.citacao) this.continuarCitacao(l);
    else this.lerDentroDoArtigo(l);
    this.tituloSolto = undefined;
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

  concluir(): { nos: NoRascunho[]; descartes: Descarte[]; anomalias: Anomalia[] } {
    if (this.quebrado) this.lerLinha(this.quebrado);
    this.quebrado = undefined;
    this.resolverRubrica();
    this.soltarPendentes();
    this.mesclarSubstituidos(this.raizes);
    if (this.rubricas > 0) this.rubricaNoNomeDoNo();
    this.enderecar(this.raizes, '');
    this.fundirRepetidos();
    if (this.artigos === 0)
      this.anomalias.push({
        tipo: 'sem_artigos',
        gravidade: 'conflito',
        mensagem: 'Não consegui identificar artigos.',
      });
    if (this.tachadas > 0)
      this.anomalias.push({
        tipo: 'redacao_anterior_nao_tratada',
        gravidade: 'aviso',
        mensagem: `${String(this.tachadas)} linha(s) tachada(s), de redação anterior, ficaram de fora. Para ler só o texto vigente, prefira a página compilada.`,
      });
    return {
      nos: this.anexo ? [...this.raizes, this.anexo] : this.raizes,
      descartes: this.descartes,
      anomalias: this.anomalias,
    };
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

  private abrirNo(rotulo: RotuloEstrutural, l: Linha): void {
    this.resolverRubrica();
    this.fecharArtigo();
    this.soltarPendentes();
    const no = this.novoNo(rotulo.tipo, l, { rotulo: rotulo.rotulo });
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
      this.lerCabecalho(cabecalho, resto);
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
    const artigo = this.novoNo('artigo', l, {
      endereco,
      rotulo,
      rotuloLido: l.texto.slice(0, fim).trim(),
      trechos: aparar(recortar(l.trechos, fim, l.texto.length)),
      filhos: nome ? [nome] : [],
      linhas: { inicio: nome?.linhas.inicio ?? inicio, fim: l.i },
    });
    this.anexar(artigo);
    this.fechaFrase.set(artigo, terminaFrase(l, fim));
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
   * frase (fonte quebrada em duas linhas: LC-SP 988, art. 159), com aviso; em minúscula depois de
   * ponto final, é sobra da fonte ("bracionalização na execução das funções;", ALESP); o resto
   * continua o último dispositivo, depois de uma quebra de linha.
   */
  private semRotulo(l: Linha): void {
    const ultimo = this.ultimo;
    if (!ultimo) return;
    if (/^\p{Ll}/u.test(l.chave)) {
      if (this.fechaFrase.get(ultimo) !== true) {
        this.continuar(l, ' ');
        this.anomalias.push({
          tipo: 'linha_continuada',
          gravidade: 'aviso',
          endereco: ultimo.endereco,
          linha: l.i,
          mensagem: `A linha "${l.texto.slice(0, 80)}" continua o texto de ${ultimo.rotulo ?? 'um dispositivo'}.`,
        });
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
    const no = this.novoNo(rotulo.tipo, l, {
      endereco,
      rotulo: rotulo.rotulo,
      rotuloLido: l.texto.slice(0, rotulo.fim).trim(),
      trechos: aparar(recortar(l.trechos, rotulo.fim, l.texto.length)),
      filhos: nome ? [nome] : [],
      linhas: { inicio: nome?.linhas.inicio ?? l.i, fim: l.i },
    });
    pai.filhos.push(no);
    this.fechaFrase.set(no, terminaFrase(l, rotulo.fim));
    this.caminho.push(no);
    this.estender(l.i);
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

  /** Emenda a linha no texto do último dispositivo. */
  private continuar(l: Linha, separador: '\n' | ' '): void {
    const ultimo = this.ultimo;
    if (!ultimo) return;
    const trechos = aparar(l.trechos);
    if (ultimo.trechos.length > 0 && trechos.length > 0) ultimo.trechos.push({ texto: separador });
    acrescentar(ultimo.trechos, trechos);
    if (trechos.length > 0) this.fechaFrase.set(ultimo, terminaFrase(l, 0));
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
    const ate = ultimaLinha(r);
    const ultimo = this.ultimo;
    if (r.tachado !== undefined) {
      // Rubrica de artigo ou dispositivo todo tachado: fica com ele, fora da árvore, até a 8.6.
      this.descartes.push({ motivo: 'redacao_anterior', linhas: { inicio: r.linha.i, fim: ate } });
    } else if (ultimo) {
      // As notas do fim da linha ficam no texto (até a 8.5); as das linhas só de notas, no dispositivo.
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
    return this.novoNo('nome', r.linha, {
      trechos,
      notas: r.notas,
      redacoesAnteriores: redacao ? [redacao] : [],
      confianca: r.duvidosa && this.confianca === 'alta' ? 'media' : this.confianca,
      linhas: { inicio: r.linha.i, fim: ultimaLinha(r) },
    });
  }

  private tachada(
    l: Linha,
    anterior: Linha | undefined,
    inicio: number,
    artigo: InicioDeArtigo | undefined,
  ): void {
    this.tachadas += 1;
    if (this.rubrica && this.rubrica.tachado === undefined) {
      const rotulo = artigo ? undefined : lerRotuloDeDispositivo(l);
      const pai = rotulo && this.paiDe(rotulo.tipo);
      if (artigo) this.rubrica.tachado = artigo.endereco;
      else if (rotulo && pai) this.rubrica.tachado = `${pai.endereco}.${rotulo.segmento}`;
    }
    const ultimo = this.descartes[this.descartes.length - 1];
    if (
      ultimo?.motivo === 'redacao_anterior' &&
      anterior?.tachada &&
      ultimo.linhas.fim === anterior.i
    )
      ultimo.linhas.fim = l.i;
    else this.descartes.push({ motivo: 'redacao_anterior', linhas: { inicio, fim: l.i } });
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

  /** Regra 11 (a 8.7 completa): da linha "ANEXO" ao fim, um nó `anexo` pela faixa. */
  private abrirAnexo(l: Linha): void {
    this.zona = 'anexo';
    this.anexo = this.novoNo('anexo', l, { endereco: 'anexo', rotulo: l.texto.slice(0, 200) });
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
      this.anomalias.push({
        tipo: 'linha_solta',
        gravidade: 'aviso',
        linha: l.i,
        mensagem: `Linha ${onde}: "${l.texto.slice(0, 80)}".`,
      });
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
   * filhos dele passam para o último (e se mesclam com os de mesmo rótulo).
   */
  private mesclarSubstituidos(filhos: NoRascunho[]): void {
    // Cadeias de nós de mesmo segmento em que todos, menos o último, estão sem artigo; cada nó é
    // remontado uma vez só (sem custo quadrático numa página hostil com o mesmo rótulo repetido).
    const abertas = new Map<string, NoRascunho[]>();
    const cadeias: NoRascunho[][] = [];
    for (const no of filhos) {
      const segmento = this.segmentos.get(no);
      if (segmento === undefined) continue;
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
        this.anomalias.push({
          tipo: 'estrutural_substituido',
          gravidade: 'aviso',
          linha: anterior.linhas.inicio,
          mensagem: `"${textoDe(rotuloENome)}" aparece antes de outro ${anterior.rotulo ?? ''} sem artigo no meio; ficou o último.`,
        });
      }
      ultimo.redacoesAnteriores = [...redacoes, ...ultimo.redacoesAnteriores];
      const [nomes, resto] = particionar(ultimo.filhos, (f) => f.tipo === 'nome');
      ultimo.filhos = [...nomes, ...herdados, ...resto];
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
        if (ehEstrutural(no)) {
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
   * Mesmo endereço de artigo ou dispositivo mais de uma vez, sem tachado (caso `duplicata`: CP,
   * art. 141, § 2º, "(VETADO)" e depois o texto incluído com a derrubada do veto): vale o último. Os
   * anteriores viram redações anteriores dele (heurística, a confirmar), e os filhos deles passam
   * para ele, antes dos seus. Uma passada por nível (o raso primeiro), porque os filhos trazidos
   * podem repetir os dele; cada grupo se funde de uma vez (sem custo quadrático numa página hostil
   * com o mesmo endereço repetido).
   */
  private fundirRepetidos(): void {
    for (let passada = 0; passada < 10; passada++) {
      const grupos = new Map<string, { no: NoRascunho; lista: NoRascunho[] }[]>();
      const visitar = (lista: NoRascunho[]) => {
        for (const no of lista) {
          if (NORMATIVOS.has(no.tipo)) {
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
      this.anomalias.push({
        tipo: 'duplicata',
        gravidade: 'aviso',
        endereco: no.endereco,
        linha: antigo.linhas.inicio,
        mensagem: `${no.rotulo ?? ''} (${no.endereco}) aparece mais de uma vez sem tachado; ficou o último, e o anterior virou redação anterior.`,
      });
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

/** A linha fecha a citação (aspas no fim, antes de pontuação, "(NR)" e notas). */
function fechaCitacao(l: Linha): boolean {
  const { fim } = separarNotasFinais(l);
  return FECHA_CITACAO.test(l.chave.slice(0, fim).trimEnd());
}

/** O texto da linha, de `inicio` ao fim e sem as notas do fim, termina em ".", ";" ou ":". */
function terminaFrase(l: Linha, inicio: number): boolean {
  const { fim } = separarNotasFinais(l, inicio);
  return /[.;:]$/.test(l.chave.slice(inicio, fim).trimEnd());
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
