// Comparação do rascunho do estruturador com o gabarito da 7.3 (`corpus/normas/*.gabarito.json`),
// para os testes de src/ e de scripts/: a árvore estrutural (8.2) e os artigos com a rubrica (8.3).
// A 8.9 traz a métrica completa.
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
  amostra: { endereco: string; nome?: string }[];
}

const ESTRUTURAIS = new Set(['parte', 'livro', 'titulo', 'capitulo', 'secao', 'subsecao']);

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

const semPrefixoDeBloco = (endereco: string) => endereco.replace(/^(?:adct|dt)\./, '');

/**
 * A árvore estrutural do gabarito no estágio atual do estruturador:
 * - até a 8.4, sem bloco com numeração própria (nem o nó do ADCT nem o prefixo `adct.`/`dt.`);
 * - até a 8.6, o artigo revogado todo tachado é descarte (`redacao_anterior`), não nó: o primeiro
 *   artigo do nó passa a ser o primeiro não revogado a partir do que o gabarito aponta.
 */
export function estruturaEsperada(id: string, gabarito: Gabarito): NoDoGabarito[] {
  const artigos = gabarito.dispositivos.filter((d) => ehArtigo(d.endereco));
  const indice = new Map(artigos.map((d, k) => [d.endereco, k]));
  const naoRevogado = (endereco: string) => {
    let k = indice.get(endereco) ?? -1;
    while (artigos[k]?.status === 'revogado') k++;
    return artigos[k]?.endereco ?? endereco;
  };
  return gabarito.estrutura
    .filter((no) => no.tipo !== 'bloco')
    .map(({ tipo, rotulo, nome, primeiroArtigo }) => ({
      tipo,
      rotulo,
      nome: NOME_CORRIGIDO[id]?.[`${rotulo} ${nome}`] ?? nome,
      primeiroArtigo: semPrefixoDeBloco(naoRevogado(primeiroArtigo)),
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
  const saida: ArtigoLido[] = [];
  const visitar = (no: NoRascunho) => {
    if (no.tipo === 'artigo') {
      const nome = no.filhos.find((f) => f.tipo === 'nome');
      saida.push({
        endereco: no.endereco,
        ...(nome ? { nome: textoDe(nome.trechos) } : {}),
        linhas: no.linhas,
      });
    }
    no.filhos.forEach(visitar);
  };
  nos.forEach(visitar);
  return saida;
}

/**
 * Onde o estruturador está certo e o gabarito não, na rubrica do artigo (examinado na página em
 * 24/09/2026); `null`: sem rubrica. A 8.5, que já regera o gabarito, acerta as regras de lá
 * (`scripts/corpus/gabarito.mjs`) e esvazia esta lista.
 */
const RUBRICA_CORRIGIDA: Record<string, Record<string, string | null>> = {
  eca: {
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
      ['art64', 'art67', 'art70', 'art71', 'art72', 'art73', 'art74', 'art75'].map((e) => [
        e,
        null,
      ]),
    ),
    // Citações, entre aspas, das leis alteradas (arts. 110 a 117).
    ...Object.fromEntries(
      ['art111', 'art112', 'art113', 'art115', 'art116', 'art117', 'art118'].map((e) => [e, null]),
    ),
  },
};

export interface ArtigoEsperado {
  endereco: string;
  status: string;
  /** Tem rubrica. */
  nome: boolean;
  /** Texto da rubrica, quando o artigo está na amostra (conferida pelo Gabriel). */
  textoDoNome?: string;
}

/**
 * Os artigos do gabarito no estágio atual do estruturador: sem o prefixo do bloco até a 8.4, e com
 * a rubrica corrigida (`RUBRICA_CORRIGIDA`). O revogado todo tachado continua na lista: até a 8.6
 * ele fica fora da árvore, e quem compara o tira com `semRevogadosAusentes`.
 */
export function artigosEsperados(id: string, gabarito: Gabarito): ArtigoEsperado[] {
  const corrigida = RUBRICA_CORRIGIDA[id] ?? {};
  const amostra = new Map(gabarito.amostra.map((a) => [a.endereco, a.nome]));
  return gabarito.dispositivos
    .filter((d) => ehArtigo(d.endereco))
    .map((d) => {
      const endereco = semPrefixoDeBloco(d.endereco);
      const certo = corrigida[endereco];
      const texto = certo === undefined ? amostra.get(d.endereco) : (certo ?? undefined);
      const nome = certo === undefined ? d.nome === true : certo !== null;
      return {
        endereco,
        status: d.status,
        nome,
        ...(texto === undefined ? {} : { textoDoNome: texto }),
      };
    });
}

/**
 * Até a 8.6: tira dos esperados o revogado que não está entre os achados (o artigo todo tachado é
 * descarte). Casa na ordem, porque o prefixo do bloco ainda falta (a CF tem dois `art117`).
 */
export function semRevogadosAusentes(
  esperados: readonly ArtigoEsperado[],
  achados: readonly string[],
): ArtigoEsperado[] {
  const saida: ArtigoEsperado[] = [];
  let j = 0;
  for (const e of esperados) {
    if (achados[j] === e.endereco) {
      saida.push(e);
      j++;
    } else if (e.status !== 'revogado') saida.push(e);
  }
  return saida;
}
