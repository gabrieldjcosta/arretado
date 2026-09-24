// Comparação do rascunho do estruturador com o gabarito da 7.3 (`corpus/normas/*.gabarito.json`),
// para os testes de src/ e de scripts/: a árvore estrutural (8.2), os artigos com a rubrica (8.3) e
// os dispositivos da regra 6 com endereço, rubrica e texto (8.4). A 8.9 traz a métrica completa.
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
  dispositivos: { endereco: string; status: string; nome?: boolean }[];
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
 * Onde o estruturador está certo e o gabarito não (examinado na página). Chave: id e rótulo + nome
 * do gabarito; valor: o nome certo. A 8.5 (notas) acerta o gabarito e esvazia esta lista.
 */
const NOME_CORRIGIDO: Record<string, Record<string, string>> = {
  // "Regulamento" solto depois do nome é link de nota (regra 7), como no fim do texto.
  cf: {
    'CAPÍTULO III DA POLÍTICA AGRÍCOLA E FUNDIÁRIA E DA REFORMA AGRÁRIA Regulamento':
      'DA POLÍTICA AGRÍCOLA E FUNDIÁRIA E DA REFORMA AGRÁRIA',
  },
};

/**
 * A árvore estrutural do gabarito no estágio atual do estruturador: até a 8.6, o artigo revogado
 * todo tachado é descarte (`redacao_anterior`), não nó; o primeiro artigo do nó passa a ser o
 * primeiro não revogado a partir do que o gabarito aponta.
 */
export function estruturaEsperada(id: string, gabarito: Gabarito): NoDoGabarito[] {
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
    nome: NOME_CORRIGIDO[id]?.[`${rotulo} ${nome}`] ?? nome,
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
        linhas: no.linhas,
      });
    }
    no.filhos.forEach(visitar);
  };
  nos.forEach(visitar);
  return saida;
}

/**
 * Onde o estruturador está certo e o gabarito não, na rubrica (examinado na página em 24/09/2026);
 * `null`: sem rubrica. A 8.5, que já regera o gabarito, acerta as regras de lá
 * (`scripts/corpus/gabarito.mjs`) e esvazia esta lista.
 */
const RUBRICA_CORRIGIDA: Record<string, Record<string, string | null>> = {
  eca: {
    // "I" é o pedaço do rótulo "IV" fora do tachado ("I ~~V - abrigo;~~"), não rubrica.
    'art90.incIV': null,
    // A linha antes do art. 155 é nota da Seção II ("(Expressão substituída…) Vigência").
    art155: null,
    // "Medida Administrativa - …" é a última linha do art. 258-C (vem depois da pena, termina em
    // ponto e nota); a rubrica é só a linha logo antes do artigo.
    art259: 'Disposições Finais e Transitórias',
    // Citação da Lei 6.015/1973 no art. 264 ('"Art. 102 …' / '6º) a perda… "').
    art265: null,
  },
  cdc: {
    // "Pena Detenção de…", sem hífen: a pena do dispositivo anterior.
    ...Object.fromEntries(
      [
        'art64',
        'art65.par1',
        'art67',
        'art67.parUnico',
        'art70',
        'art71',
        'art72',
        'art73',
        'art74',
        'art75',
      ].map((e) => [e, null]),
    ),
    // Citações, entre aspas, das leis alteradas (arts. 110 a 117).
    ...Object.fromEntries(
      ['art111', 'art112', 'art113', 'art115', 'art116', 'art117', 'art118'].map((e) => [e, null]),
    ),
  },
};

/**
 * Dispositivos do gabarito que não existem (examinado na página): os §§ 5º e 6º do art. 113 do
 * CDC são do art. 5º da Lei 7.347/1985, citado entre aspas em várias linhas ('"§ 4.º …' / '§ 5.º …'
 * / '§ 6º …".'), e ficam no texto do art. 113. A 8.5 acerta o gabarito e esvazia esta lista.
 */
const DISPOSITIVO_INEXISTENTE: Record<string, readonly string[]> = {
  cdc: ['art113.par5', 'art113.par6'],
};

/**
 * Texto da amostra que o gabarito tem errado (examinado na página) ou que depende de atividade
 * seguinte; a comparação o pula.
 */
const TEXTO_FORA_DA_COMPARACAO: Record<string, readonly string[]> = {
  // Até a 8.6: artigo revogado com as notas sem o parêntese de fecho ("(Revogado pela Lei nº
  // 9.455, de 7.4.1997"), que a 8.5 não reconhece como nota.
  eca: ['art233', 'art233.par1', 'art233.par2', 'art233.par3'],
  // A pena sem hífen e a citação estão no texto; o gabarito as tomou por rubrica do seguinte.
  cdc: ['art65', 'art67', 'art112', 'art116'],
};

export interface DispositivoEsperado {
  endereco: string;
  status: string;
  /** Tem rubrica. */
  nome: boolean;
  /** Texto da rubrica, quando o dispositivo está na amostra (conferida pelo Gabriel). */
  textoDoNome?: string;
  /** Texto e notas, quando está na amostra (vigente e com o texto comparável). */
  texto?: { texto: string; notas: readonly string[] };
}

/**
 * Os dispositivos (artigo a item) do gabarito no estágio atual do estruturador, com a rubrica
 * corrigida (`RUBRICA_CORRIGIDA`) e sem os inexistentes (`DISPOSITIVO_INEXISTENTE`). O revogado
 * todo tachado continua na lista: até a 8.6 ele fica fora da árvore, e quem compara o tira com
 * `semRevogadosAusentes`. `id` pode ser o de uma compilada: vale o gabarito da página.
 */
export function dispositivosEsperados(id: string, gabarito: Gabarito): DispositivoEsperado[] {
  const norma = id.replace('-compilado', '');
  const corrigida = RUBRICA_CORRIGIDA[norma] ?? {};
  const inexistentes = new Set(DISPOSITIVO_INEXISTENTE[norma] ?? []);
  const semTexto = new Set(TEXTO_FORA_DA_COMPARACAO[norma] ?? []);
  const amostra = new Map(gabarito.amostra.map((a) => [a.endereco, a]));
  return gabarito.dispositivos
    .filter((d) => !d.endereco.startsWith('anexo') && !inexistentes.has(d.endereco))
    .map((d) => {
      const certo = corrigida[d.endereco];
      const daAmostra = amostra.get(d.endereco);
      const textoDoNome = certo === undefined ? daAmostra?.nome : (certo ?? undefined);
      const nome = certo === undefined ? d.nome === true : certo !== null;
      const comparavel = daAmostra?.status === 'vigente' && !semTexto.has(d.endereco);
      return {
        endereco: d.endereco,
        status: d.status,
        nome,
        ...(textoDoNome === undefined ? {} : { textoDoNome }),
        ...(comparavel ? { texto: { texto: daAmostra.texto, notas: daAmostra.notas } } : {}),
      };
    });
}

/** Os artigos de `dispositivosEsperados`. */
export function artigosEsperados(id: string, gabarito: Gabarito): DispositivoEsperado[] {
  return dispositivosEsperados(id, gabarito).filter((d) => ehArtigo(d.endereco));
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
 * Texto comparável com o do gabarito: só letras, algarismos e quebras de linha, com o ordinal
 * unificado ("1º", "1o", "1 o", "1°", "nº", "n o") e sem as notas da amostra (até a 8.5 elas ficam
 * no fim do texto do estruturador). Pontuação, hífen (o gabarito apaga o U+00AD da LC 80:
 * "manifestarse") e espaço ficam de fora.
 */
export function paraComparar(texto: string, notas: readonly string[] = []): string {
  let t = texto;
  for (const nota of [...notas].reverse()) {
    const k = t.lastIndexOf(nota);
    if (k >= 0) t = t.slice(0, k) + t.slice(k + nota.length);
  }
  return t
    .replace(/(\d)\s?[oº°](?!\p{L})/gu, '$1')
    .replace(/\bn\s?[oº°]\s?(?=\d)/giu, 'n')
    .replace(/[^\p{L}\p{N}\n]+/gu, '');
}
