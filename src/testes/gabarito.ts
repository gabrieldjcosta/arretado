// Comparação do rascunho do estruturador com o gabarito da 7.3 (`corpus/normas/*.gabarito.json`),
// para os testes de src/ e de scripts/: a árvore estrutural (8.2), os artigos com a rubrica (8.3),
// os dispositivos da regra 6 com endereço, rubrica e texto (8.4), as notas de vigência (8.5) e o
// status e as redações anteriores (8.6), com o anexo (8.7). A 8.9 traz a métrica completa.
import { textoDe } from '../dominios/legislacao/linhas';
import type { FaixaDeLinhas, NoRascunho } from '../dominios/legislacao/rascunho';

export interface NoDoGabarito {
  tipo: string;
  rotulo: string;
  nome: string;
  primeiroArtigo: string;
}

export interface Gabarito {
  estrutura: (NoDoGabarito & { notas?: string[] })[];
  /**
   * `notas`: quantas notas de vigência o texto vigente tem (a linha do rótulo e as emendadas);
   * `redacoes`: quantas redações anteriores (as que foram para o ancestral contam nele).
   */
  dispositivos: {
    endereco: string;
    status: string;
    notas: number;
    redacoes: number;
    nome?: boolean;
  }[];
  contagens: { redacoesAnteriores: number; redacoesNoAncestral: number };
  /** Situações da página (7.3); `tachado-parcial` traz o endereço. */
  casos: { tipo: string; endereco?: string }[];
  amostra: {
    endereco: string;
    status: string;
    nome?: string;
    texto: string;
    notas: string[];
  }[];
}

const ESTRUTURAIS = new Set(['parte', 'livro', 'titulo', 'capitulo', 'secao', 'subsecao', 'bloco']);
/** Artigo a item e o anexo (regra 11, 8.7: status, notas e redações, como os dispositivos). */
const NORMATIVOS = new Set(['artigo', 'paragrafo', 'inciso', 'alinea', 'item', 'anexo']);

/** Nós estruturais em ordem, com o primeiro artigo que aparece depois de cada um. */
export function estruturaDe(nos: readonly NoRascunho[]): NoDoGabarito[] {
  const saida: NoDoGabarito[] = [];
  const esperando: NoDoGabarito[] = [];
  const visitar = (no: NoRascunho) => {
    if (ESTRUTURAIS.has(no.tipo)) {
      const nome = no.filhos.find((f) => f.tipo === 'nome');
      const item = {
        tipo: no.tipo,
        rotulo: no.rotulo ?? '',
        nome: nome ? textoDe(nome.trechos) : '',
        primeiroArtigo: '',
      };
      saida.push(item);
      esperando.push(item);
    }
    if (no.tipo === 'artigo') for (const e of esperando.splice(0)) e.primeiroArtigo = no.endereco;
    no.filhos.forEach(visitar);
  };
  nos.forEach(visitar);
  return saida;
}

/**
 * A árvore estrutural do gabarito (tipo, rótulo, nome e primeiro artigo de cada nó). Desde a 8.6,
 * sem tolerância: o artigo revogado todo tachado é nó, e o primeiro artigo é o que o gabarito aponta.
 */
export function estruturaEsperada(gabarito: Gabarito): NoDoGabarito[] {
  return gabarito.estrutura.map(({ tipo, rotulo, nome, primeiroArtigo }) => ({
    tipo,
    rotulo,
    nome,
    primeiroArtigo,
  }));
}

const ehArtigo = (endereco: string) => /^(?:\w+\.)?art\d+[A-Z]*$/.test(endereco);

export interface ArtigoLido {
  endereco: string;
  /** Texto do filho `nome` (rubrica); ausente quando não há. */
  nome?: string;
  linhas: FaixaDeLinhas;
}

/** Artigos do rascunho, em ordem, com a rubrica e a faixa de linhas. */
export function artigosDe(nos: readonly NoRascunho[]): ArtigoLido[] {
  return dispositivosDe(nos)
    .filter((d) => d.tipo === 'artigo')
    .map(({ endereco, nome, linhas }) => ({
      endereco,
      ...(nome === undefined ? {} : { nome }),
      linhas,
    }));
}

export interface DispositivoLido extends ArtigoLido {
  tipo: string;
  /**
   * Status no vocabulário do gabarito: o `renumerado` (regra 10) segue `vigente` nele (o
   * gabarito não lê a renumeração).
   */
  status: string;
  /** Texto sem o tachado (o tachado parcial fica marcado no texto, 8.6). */
  texto: string;
  /** Texto das notas de vigência, na ordem (sem as da rubrica). */
  notas: string[];
  /** Quantas redações anteriores. */
  redacoes: number;
  /** Quantas foram para ele como ancestral (`enderecoLido`). */
  noAncestral: number;
}

/** Artigos, parágrafos, incisos, alíneas, itens e anexos do rascunho, em ordem (pré-ordem). */
export function dispositivosDe(nos: readonly NoRascunho[]): DispositivoLido[] {
  const saida: DispositivoLido[] = [];
  const visitar = (no: NoRascunho) => {
    if (NORMATIVOS.has(no.tipo)) {
      const nome = no.filhos.find((f) => f.tipo === 'nome');
      saida.push({
        endereco: no.endereco,
        tipo: no.tipo,
        ...(nome ? { nome: textoDe(nome.trechos) } : {}),
        status: no.status === 'renumerado' ? 'vigente' : no.status,
        texto: textoDe(no.trechos.filter((t) => !t.tachado)),
        notas: no.notas.map((n) => n.texto),
        redacoes: no.redacoesAnteriores.length,
        noAncestral: no.redacoesAnteriores.filter((r) => r.enderecoLido !== undefined).length,
        linhas: no.linhas,
      });
    }
    no.filhos.forEach(visitar);
  };
  nos.forEach(visitar);
  return saida;
}

export interface DispositivoEsperado {
  endereco: string;
  status: string;
  /** Tem rubrica. */
  nome: boolean;
  /** Quantas notas de vigência. */
  notas: number;
  /**
   * Quantas redações anteriores. O gabarito conta como redação a linha com tachado parcial (caso
   * `tachado-parcial`: a expressão tachada no meio do texto vigente, o rótulo antigo ao lado do
   * novo); a 8.6 a deixa marcada no texto, sem duplicar: aqui ela sai da conta.
   */
  redacoes: number;
  /** Texto da rubrica, quando o dispositivo está na amostra (conferida pelo Gabriel). */
  textoDoNome?: string;
  /** Texto e notas, quando está na amostra (vigente). */
  texto?: { texto: string; notas: readonly string[] };
}

/**
 * Os dispositivos (artigo a item) e os anexos do gabarito (desde a 8.7). Desde a 8.6 sem tolerância
 * para o revogado todo tachado (é nó, com a redação anterior). Desde a 8.5 não há tolerância para o
 * gabarito errado: o que o estruturador achou certo e o gabarito não foi acertado em
 * `scripts/corpus/gabarito.mjs` (pena sem hífen, citação entre aspas, pedaço de rótulo fora do
 * tachado, notas soltas e sem fecho). `id` pode ser o de uma compilada: vale o gabarito da página.
 */
export function dispositivosEsperados(gabarito: Gabarito): DispositivoEsperado[] {
  const amostra = new Map(gabarito.amostra.map((a) => [a.endereco, a]));
  const parciais = new Set(
    gabarito.casos.flatMap((c) => (c.tipo === 'tachado-parcial' && c.endereco ? [c.endereco] : [])),
  );
  return gabarito.dispositivos.map((d) => {
    const daAmostra = amostra.get(d.endereco);
    return {
      endereco: d.endereco,
      status: d.status,
      nome: d.nome === true,
      notas: d.notas,
      redacoes: d.redacoes - (parciais.has(d.endereco) ? 1 : 0),
      ...(daAmostra?.nome === undefined ? {} : { textoDoNome: daAmostra.nome }),
      ...(daAmostra?.status === 'vigente'
        ? { texto: { texto: daAmostra.texto, notas: daAmostra.notas } }
        : {}),
    };
  });
}

/** Os artigos de `dispositivosEsperados`. */
export function artigosEsperados(gabarito: Gabarito): DispositivoEsperado[] {
  return dispositivosEsperados(gabarito).filter((d) => ehArtigo(d.endereco));
}

/**
 * Texto (ou nota) comparável com o do gabarito: só letras, algarismos e quebras de linha, com o
 * ordinal unificado ("1º", "1o", "1 o", "1°", "nº", "n o"). Pontuação, hífen (o gabarito apaga o
 * U+00AD da LC 80: "manifestarse") e espaço ficam de fora.
 */
export function paraComparar(texto: string): string {
  return texto
    .replace(/(\d)\s?[oº°](?!\p{L})/gu, '$1')
    .replace(/\bn\s?[oº°]\s?(?=\d)/giu, 'n')
    .replace(/[^\p{L}\p{N}\n]+/gu, '');
}
