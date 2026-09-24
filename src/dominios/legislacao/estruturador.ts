// Estruturador (F2; Parte 2 §10.6, "fatiarLei"): blocos do sanitizador ou de `textoParaBlocos` →
// Rascunho. Domínio puro, sem tela nem banco. Ordem das regras: normalização (1, 8.1), blocos
// pré-normativos (2) e hierarquia estrutural (3) nesta atividade (8.2); o resto vem nas seguintes:
// - 8.3: artigo tolerante e rubrica (hoje `INICIO_DE_ARTIGO` só delimita o artigo, com as linhas
//   pendentes antes dele — a rubrica — dentro da faixa; o texto é o da linha do rótulo);
// - 8.4: caput, parágrafo, inciso, alínea e item (as demais linhas do artigo ficam na faixa);
// - 8.6: redação anterior. Até lá, linha tachada vira descarte `redacao_anterior`, nunca texto.
// Toda linha cai num nó (pela faixa), nota, metadado ou descarte.
import type { Bloco, Trecho } from '../../core/seguranca/sanitizador';
import {
  lerRotuloEstrutural,
  NIVEL,
  type RotuloEstrutural,
  type TipoEstrutural,
} from './estrutura';
import {
  aparar,
  ehCaixaAlta,
  juntarTrechos,
  recortar,
  textoDe,
  type Linha,
  prepararLinhas,
} from './linhas';
import { normalizarBlocos } from './normalizacao';
import { lerNotasDaLinha, separarNotasFinais } from './notas';
import { INICIO_DE_ARTIGO, lerPreNormativo } from './prenormativo';
import type {
  Anomalia,
  Confianca,
  Descarte,
  FaixaDeLinhas,
  FormatoEntrada,
  NoRascunho,
  Rascunho,
  RedacaoAnterior,
} from './rascunho';

/**
 * Vai para `VersaoDeNorma.versaoAdaptador`: sobe a cada atividade que muda a saída (0.3 na 8.3…),
 * para a fonte guardada ser reprocessada quando o estruturador melhorar.
 */
export const VERSAO_ESTRUTURADOR = '0.2';

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
  private zona: 'corpo' | 'fecho' | 'anexo' = 'corpo';
  private fecho: Descarte | undefined;
  private anexo: NoRascunho | undefined;
  private artigos = 0;
  private tachadas = 0;
  private ultima: Linha | undefined;

  constructor(private readonly confianca: Confianca) {}

  ler(l: Linha): void {
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
      if (l.tachada || !(INICIO_DE_ARTIGO.test(l.chave) || lerRotuloEstrutural(l))) {
        this.fecho.linhas.fim = l.i;
        return;
      }
      this.zona = 'corpo';
    }
    const rotulo = l.tachada ? undefined : lerRotuloEstrutural(l);
    if (l.tachada) this.tachada(l, anterior);
    else if (this.artigos > 0 && FECHO.test(l.chave)) this.abrirFecho(l);
    else if (rotulo) this.abrirNo(rotulo, l);
    else if (this.cabecalho && this.lerCabecalho(this.cabecalho, l)) return;
    else if (INICIO_DE_ARTIGO.test(l.chave)) this.abrirArtigo(l);
    else if (this.artigo) this.artigo.linhas.fim = l.i;
    else this.pendentes.push(l);
  }

  concluir(): { nos: NoRascunho[]; descartes: Descarte[]; anomalias: Anomalia[] } {
    this.soltarPendentes();
    this.mesclarSubstituidos(this.raizes);
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
  private lerCabecalho(c: Cabecalho, l: Linha): boolean {
    const notas = lerNotasDaLinha(l);
    if (notas) {
      c.no.notas.push(...notas);
      c.no.linhas.fim = l.i;
      if (c.estado === 'nome') c.estado = 'fim';
      return true;
    }
    if (INICIO_DE_ARTIGO.test(l.chave)) return this.fecharCabecalho();
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
    const trechosDoNome = recortar(l.trechos, 0, fim);
    if (trechosDoNome.some((t) => t.tachado))
      c.no.redacoesAnteriores.push({
        trechos: aparar(trechosDoNome),
        origemDeteccao: 'tachado',
        confirmada: true,
        linhas: { inicio: l.i, fim: l.i },
      });
    c.nome.push({ ...l, trechos: semTachado(trechosDoNome) });
    c.no.notas.push(...finais);
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

  private abrirArtigo(l: Linha): void {
    this.cabecalho = undefined;
    const m = INICIO_DE_ARTIGO.exec(l.chave);
    const numero = (m?.[1] ?? '').replace(/\./g, '');
    const sufixo = (m?.[2] ?? '').replace(/-/g, '');
    const primeira = this.pendentes[0] ?? l;
    this.pendentes = [];
    const fimRotulo = m?.[0].length ?? 0;
    const artigo = this.novoNo('artigo', l, {
      endereco: `art${numero}${sufixo}`,
      rotulo: `Art. ${numero}${Number(numero) < 10 ? 'º' : ''}${sufixo ? '-' + sufixo.split('').join('-') : ''}`,
      rotuloLido: l.texto.slice(0, fimRotulo).trim(),
      trechos: aparar(recortar(l.trechos, fimRotulo, l.texto.length)),
      linhas: { inicio: primeira.i, fim: l.i },
    });
    this.anexar(artigo);
    this.artigo = artigo;
    this.artigos += 1;
  }

  private tachada(l: Linha, anterior: Linha | undefined): void {
    this.tachadas += 1;
    const ultimo = this.descartes[this.descartes.length - 1];
    if (
      ultimo?.motivo === 'redacao_anterior' &&
      anterior?.tachada &&
      ultimo.linhas.fim === anterior.i
    )
      ultimo.linhas.fim = l.i;
    else this.descartes.push({ motivo: 'redacao_anterior', linhas: { inicio: l.i, fim: l.i } });
  }

  private abrirFecho(l: Linha): void {
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
        redacoes.push(...anterior.redacoesAnteriores, {
          trechos: rotuloENome,
          origemDeteccao: 'heuristica',
          confirmada: false,
          linhas: anterior.linhas,
        });
        herdados.push(...anterior.filhos.filter((f) => f.tipo !== 'nome'));
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
