// Comparação do rascunho do estruturador com o gabarito da 7.3 (`corpus/normas/*.gabarito.json`),
// para os testes de src/ e de scripts/: a árvore estrutural (8.2), os artigos com a rubrica (8.3),
// os dispositivos da regra 6 com endereço, rubrica e texto (8.4) e as notas de vigência (8.5). A
// 8.9 traz a métrica completa.
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
  /** `notas`: quantas notas de vigência o texto vigente tem (a linha do rótulo e as emendadas). */
  dispositivos: { endereco: string; status: string; notas: number; nome?: boolean }[];
  amostra: {
    endereco: string;
    status: string;
    nome?: string;
    texto: string;
    notas: string[];
  }[];
}

const ESTRUTURAIS = new Set(['parte', 'livro', 'titulo', 'capitulo', 'secao', 'subsecao', 'bloco']);
const NORMATIVOS = new Set(['artigo', 'paragrafo', 'inciso', 'alinea', 'item']);

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
 * A árvore estrutural do gabarito no estágio atual do estruturador: até a 8.6, o artigo revogado
 * todo tachado é descarte (`redacao_anterior`), não nó; o primeiro artigo do nó passa a ser o
 * primeiro não revogado a partir do que o gabarito aponta.
 */
export function estruturaEsperada(gabarito: Gabarito): NoDoGabarito[] {
  const artigos = gabarito.dispositivos.filter((d) => ehArtigo(d.endereco));
  const indice = new Map(artigos.map((d, k) => [d.endereco, k]));
  const naoRevogado = (endereco: string) => {
    let k = indice.get(endereco) ?? -1;
    while (artigos[k]?.status === 'revogado') k++;
    return artigos[k]?.endereco ?? endereco;
  };
  return gabarito.estrutura.map(({ tipo, rotulo, nome, primeiroArtigo }) => ({
    tipo,
    rotulo,
    nome,
    primeiroArtigo: naoRevogado(primeiroArtigo),
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
  /** Texto sem o tachado (até a 8.6, o tachado parcial fica marcado no texto). */
  texto: string;
  /** Texto das notas de vigência, na ordem (sem as da rubrica). */
  notas: string[];
}

/** Artigos, parágrafos, incisos, alíneas e itens do rascunho, em ordem (pré-ordem). */
export function dispositivosDe(nos: readonly NoRascunho[]): DispositivoLido[] {
  const saida: DispositivoLido[] = [];
  const visitar = (no: NoRascunho) => {
    if (NORMATIVOS.has(no.tipo)) {
      const nome = no.filhos.find((f) => f.tipo === 'nome');
      saida.push({
        endereco: no.endereco,
        tipo: no.tipo,
        ...(nome ? { nome: textoDe(nome.trechos) } : {}),
        texto: textoDe(no.trechos.filter((t) => !t.tachado)),
        notas: no.notas.map((n) => n.texto),
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
  /** Texto da rubrica, quando o dispositivo está na amostra (conferida pelo Gabriel). */
  textoDoNome?: string;
  /** Texto e notas, quando está na amostra (vigente). */
  texto?: { texto: string; notas: readonly string[] };
}

/**
 * Os dispositivos (artigo a item) do gabarito, sem o anexo (8.7). O revogado todo tachado continua
 * na lista: até a 8.6 ele fica fora da árvore, e quem compara o tira com `semRevogadosAusentes`.
 * Desde a 8.5 não há tolerância para o gabarito errado: o que o estruturador achou certo e o
 * gabarito não foi acertado em `scripts/corpus/gabarito.mjs` (pena sem hífen, citação entre aspas,
 * pedaço de rótulo fora do tachado, notas soltas e sem fecho). `id` pode ser o de uma compilada:
 * vale o gabarito da página.
 */
export function dispositivosEsperados(gabarito: Gabarito): DispositivoEsperado[] {
  const amostra = new Map(gabarito.amostra.map((a) => [a.endereco, a]));
  return gabarito.dispositivos
    .filter((d) => !d.endereco.startsWith('anexo'))
    .map((d) => {
      const daAmostra = amostra.get(d.endereco);
      return {
        endereco: d.endereco,
        status: d.status,
        nome: d.nome === true,
        notas: d.notas,
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
 * Até a 8.6: tira dos esperados o revogado que não está entre os achados (o artigo ou dispositivo
 * todo tachado é descarte). Casa na ordem.
 */
export function semRevogadosAusentes<T extends { endereco: string; status: string }>(
  esperados: readonly T[],
  achados: readonly string[],
): T[] {
  const saida: T[] = [];
  let j = 0;
  for (const e of esperados) {
    if (achados[j] === e.endereco) {
      saida.push(e);
      j++;
    } else if (e.status !== 'revogado') saida.push(e);
  }
  return saida;
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
