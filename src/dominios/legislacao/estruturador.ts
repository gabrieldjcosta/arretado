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
 * Vai para `VersaoDeNorma.versaoAdaptador`: sobe a cada atividade que muda a saída (0.3 na 8.3…),
 * para a fonte guardada ser reprocessada quando o estruturador melhorar.
 */
export const VERSAO_ESTRUTURADOR = '0.3';

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

const ESTRUTURAIS = new Set<string>(Object.keys(NIVEL));
const ehEstrutural = (no: NoRascunho): no is NoRascunho & { tipo: TipoEstrutural } =>
  ESTRUTURAIS.has(no.tipo);

/**
 * Rubrica candidata (regra 4): vira o nome do artigo que vier logo depois (só com notas e tachado no
 * meio) ou volta para o artigo anterior. Artigo tachado de outro número entre ela e o artigo
 * vigente (CP, art. 185, revogado, antes do 186) diz que a rubrica é dele: fica com o tachado até
 * a 8.6 (caso `artigo-so-tachado`).
 */
interface RubricaPendente {
  linha: Linha;
  fim: number;
  notas: NotaDeVigencia[];
  duvidosa: boolean;
  /** As linhas só de notas logo depois dela (são dela, se ela se confirmar). */
  linhasDeNota: Linha[];
  /** Endereço do primeiro artigo tachado depois dela. */
  tachado?: string;
}

/** Nó estrutural recém-aberto: as linhas seguintes podem ser nota ou nome dele. */
interface Cabecalho {
  no: NoRascunho;
  /** `rotulo`: ainda sem nome; `nome`: lendo o nome (continua em caixa alta); `fim`: nota depois do nome. */
  estado: 'rotulo' | 'nome' | 'fim';
  nome: Linha[];
}

class Corpo {
  private readonly raizes: NoRascunho[] = [];
  private readonly pilha: NoRascunho[] = [];
  private readonly segmentos = new Map<NoRascunho, string>();
  private readonly descartes: Descarte[] = [];
  private readonly anomalias: Anomalia[] = [];
  private cabecalho: Cabecalho | undefined;
  private artigo: NoRascunho | undefined;
  private pendentes: Linha[] = [];
  private rubrica: RubricaPendente | undefined;
  /** Linha só com "Art." (ou "Artigo"), à espera do número na linha seguinte. */
  private quebrado: Linha | undefined;
  private zona: 'corpo' | 'fecho' | 'anexo' = 'corpo';
  private fecho: Descarte | undefined;
  private anexo: NoRascunho | undefined;
  private artigos = 0;
  private rubricas = 0;
  private tachadas = 0;
  private ultima: Linha | undefined;

  constructor(private readonly confianca: Confianca) {}

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
      // Depois do fecho, só artigo ou rótulo reabre o corpo (o ADCT da CF; o bloco é da 8.4).
      if (l.tachada || !(lerInicioDeArtigo(l.chave) || lerRotuloEstrutural(l))) {
        this.fecho.linhas.fim = l.i;
        return;
      }
      this.zona = 'corpo';
    }
    const rotulo = l.tachada ? undefined : lerRotuloEstrutural(l);
    const artigo = lerInicioDeArtigo(l.chave);
    if (l.tachada) this.tachada(l, anterior, inicio, artigo);
    else if (this.artigos > 0 && FECHO.test(l.chave)) this.abrirFecho(l);
    else if (rotulo) this.abrirNo(rotulo, l);
    else if (this.cabecalho && this.lerCabecalho(this.cabecalho, l, artigo)) return;
    else if (artigo) this.abrirArtigo(artigo, l, inicio);
    else this.lerOutra(l);
  }

  concluir(): { nos: NoRascunho[]; descartes: Descarte[]; anomalias: Anomalia[] } {
    if (this.quebrado) this.lerLinha(this.quebrado);
    this.quebrado = undefined;
    this.resolverRubrica();
    this.soltarPendentes();
    this.mesclarSubstituidos(this.raizes);
    if (this.rubricas > 0) this.rubricaNoNomeDoNo();
    this.enderecar(this.raizes, '');
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
    this.artigo = undefined;
    this.soltarPendentes();
    const no = this.novoNo(rotulo.tipo, l, { rotulo: rotulo.rotulo });
    this.segmentos.set(no, rotulo.segmento);
    const nivel = NIVEL[rotulo.tipo];
    while (this.pilha.length > 0) {
      const topo = this.pilha[this.pilha.length - 1];
      if (topo === undefined || NIVEL[topo.tipo as TipoEstrutural] < nivel) break;
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
    const { endereco, rotulo, fim } = inicioDeArtigo;
    const r = this.rubrica;
    this.rubrica = undefined;
    let nome: NoRascunho | undefined;
    if (r && (r.tachado === undefined || r.tachado === endereco)) {
      nome = this.nomeDoArtigo(r);
      this.rubricas += 1;
    } else if (r) this.devolverRubrica(r);
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
    this.artigo = artigo;
    this.artigos += 1;
  }

  /** Linha que não é rótulo, artigo, fecho nem tachada: rubrica candidata ou texto do artigo. */
  private lerOutra(l: Linha): void {
    const r = this.rubrica;
    if (r) {
      // Nota em linha própria logo depois da rubrica é dela (se ela se confirmar).
      const notas = lerNotasDaLinha(l);
      if (notas) {
        acrescentar(r.notas, notas);
        r.linhasDeNota.push(l);
        return;
      }
      this.resolverRubrica();
    }
    const rubrica = lerRubrica(l);
    if (rubrica) this.rubrica = { linha: l, ...rubrica, linhasDeNota: [] };
    else if (this.artigo) this.artigo.linhas.fim = l.i;
    else this.pendentes.push(l);
  }

  /** Rubrica que não chegou a um artigo: volta para o artigo anterior (ou fica solta). */
  private resolverRubrica(): void {
    const r = this.rubrica;
    this.rubrica = undefined;
    if (r) this.devolverRubrica(r);
  }

  private devolverRubrica(r: RubricaPendente): void {
    const ate = ultimaLinha(r);
    if (r.tachado !== undefined) {
      // Rubrica de artigo todo tachado: fica com ele, fora da árvore, até a 8.6.
      this.descartes.push({ motivo: 'redacao_anterior', linhas: { inicio: r.linha.i, fim: ate } });
    } else if (this.artigo) this.artigo.linhas.fim = ate;
    else {
      this.pendentes.push(r.linha);
      acrescentar(this.pendentes, r.linhasDeNota);
    }
  }

  /** Regra 4: a rubrica vira o filho `nome` do artigo; o pedaço tachado, redação anterior dele. */
  private nomeDoArtigo(r: RubricaPendente): NoRascunho {
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
    if (this.rubrica && artigo) this.rubrica.tachado ??= artigo.endereco;
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
    this.artigo = undefined;
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
    let faixa: FaixaDeLinhas | undefined;
    for (const l of this.pendentes) {
      this.anomalias.push({
        tipo: 'linha_solta',
        gravidade: 'aviso',
        linha: l.i,
        mensagem: `Linha fora de artigo: "${l.texto.slice(0, 80)}".`,
      });
      if (faixa && faixa.fim + 1 === l.i) faixa.fim = l.i;
      else {
        faixa = { inicio: l.i, fim: l.i };
        this.descartes.push({ motivo: 'sobra', linhas: faixa });
      }
    }
    this.pendentes = [];
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
