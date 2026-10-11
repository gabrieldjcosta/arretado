// Reancoragem de grifos e notas (Parte 2 §10.6): o trecho marcado volta ao texto novo do mesmo
// dispositivo na ordem exata → aproximada → pendente. Pura; serve à atualização do acervo (6a) e à
// correção do texto publicado (11.7). Fica no core porque um domínio não importa outro.

export interface Ancora {
  texto: string;
  inicio: number;
  fim: number;
}

export type Reancoragem =
  | {
      /** `valida`: o trecho está onde estava; `reancorada`: achado em outro lugar ou parecido. */
      status: 'valida' | 'reancorada';
      /** Como foi achado: o mesmo texto, ou um parecido (caixa, acento, espaço ou poucas letras). */
      modo: 'exata' | 'aproximada';
      inicio: number;
      fim: number;
      /** O texto da âncora no texto novo (na aproximada, difere do de antes). */
      texto: string;
    }
  | { status: 'pendente' };

/** Abaixo disso, parecido não basta: o trecho curto casaria com qualquer coisa. */
export const MINIMO_PARA_APROXIMAR = 20;
/** Diferença aceita na aproximada: até 1 letra em 5 (inserida, apagada ou trocada). */
const PROPORCAO_DE_DIFERENCA = 0.2;
/** Teto da conta letra a letra (trecho × texto), para a correção nunca travar a tela. */
const TETO_DA_CONTA = 5_000_000;

/** A ocorrência de `agulha` em `palheiro` mais perto de `perto`; -1 sem nenhuma. */
function maisPerto(palheiro: string, agulha: string, perto: number): number {
  let melhor = -1;
  for (let k = palheiro.indexOf(agulha); k >= 0; k = palheiro.indexOf(agulha, k + 1)) {
    if (melhor < 0 || Math.abs(k - perto) < Math.abs(melhor - perto)) melhor = k;
  }
  return melhor;
}

/** Texto sem caixa, sem acento e com um espaço só onde havia vários; `origem[k]` é o índice de antes. */
function normalizar(texto: string): { s: string; origem: number[] } {
  let s = '';
  const origem: number[] = [];
  let espaco = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i);
    if (/\s/u.test(c)) {
      if (!espaco) {
        s += ' ';
        origem.push(i);
      }
      espaco = true;
      continue;
    }
    espaco = false;
    for (const d of c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()) {
      s += d;
      origem.push(i);
    }
  }
  return { s, origem };
}

/**
 * O trecho de `texto` mais parecido com `padrao` (distância de edição; o começo é livre), se a
 * diferença couber em `maximo`. Empate: o mais perto de `perto`.
 */
function maisParecido(
  texto: string,
  padrao: string,
  maximo: number,
  perto: number,
): { inicio: number; fim: number } | undefined {
  const m = padrao.length;
  let anterior = Array.from({ length: m + 1 }, (_, i) => i);
  let inicioAnterior = new Array<number>(m + 1).fill(0);
  let melhor: { inicio: number; fim: number; distancia: number } | undefined;
  for (let j = 1; j <= texto.length; j++) {
    const c = texto.charAt(j - 1);
    const atual = new Array<number>(m + 1);
    const inicioAtual = new Array<number>(m + 1);
    atual[0] = 0;
    inicioAtual[0] = j;
    for (let i = 1; i <= m; i++) {
      const troca = (anterior[i - 1] ?? 0) + (padrao.charAt(i - 1) === c ? 0 : 1);
      const sobra = (anterior[i] ?? 0) + 1;
      const falta = (atual[i - 1] ?? 0) + 1;
      if (troca <= sobra && troca <= falta) {
        atual[i] = troca;
        inicioAtual[i] = inicioAnterior[i - 1] ?? 0;
      } else if (sobra <= falta) {
        atual[i] = sobra;
        inicioAtual[i] = inicioAnterior[i] ?? 0;
      } else {
        atual[i] = falta;
        inicioAtual[i] = inicioAtual[i - 1] ?? 0;
      }
    }
    const distancia = atual[m] ?? Infinity;
    const inicio = inicioAtual[m] ?? 0;
    if (
      distancia <= maximo &&
      (melhor === undefined ||
        distancia < melhor.distancia ||
        (distancia === melhor.distancia &&
          Math.abs(inicio - perto) < Math.abs(melhor.inicio - perto)))
    ) {
      melhor = { inicio, fim: j, distancia };
    }
    anterior = atual;
    inicioAnterior = inicioAtual;
  }
  return melhor;
}

/** O intervalo sem os espaços das pontas (como `ancorar` faz ao grifar). */
function aparar(texto: string, inicio: number, fim: number): [number, number] {
  let de = inicio;
  let ate = fim;
  while (de < ate && /\s/u.test(texto.charAt(de))) de++;
  while (ate > de && /\s/u.test(texto.charAt(ate - 1))) ate--;
  return [de, ate];
}

/**
 * Leva a âncora ao texto novo. Exata: o mesmo texto no mesmo lugar (`valida`) ou na ocorrência
 * mais perto (`reancorada`). Aproximada (`reancorada`): o mesmo texto sem olhar caixa, acento e
 * espaços, ou, no trecho de 20 letras ou mais, o trecho com até 1 letra diferente em 5. Sem nada
 * disso, `pendente`: a marcação não se perde, espera a releitura.
 */
export function reancorar(ancora: Ancora, textoNovo: string): Reancoragem {
  const achado = (
    status: 'valida' | 'reancorada',
    modo: 'exata' | 'aproximada',
    inicio: number,
    fim: number,
  ): Reancoragem => ({ status, modo, inicio, fim, texto: textoNovo.slice(inicio, fim) });

  if (ancora.texto === '') return { status: 'pendente' };
  if (textoNovo.slice(ancora.inicio, ancora.fim) === ancora.texto) {
    return achado('valida', 'exata', ancora.inicio, ancora.fim);
  }
  const exata = maisPerto(textoNovo, ancora.texto, ancora.inicio);
  if (exata >= 0) return achado('reancorada', 'exata', exata, exata + ancora.texto.length);

  const novo = normalizar(textoNovo);
  const agulha = normalizar(ancora.texto).s.trim();
  if (agulha === '') return { status: 'pendente' };
  // Posição de antes, em coordenadas do texto normalizado (para escolher a ocorrência mais perto).
  let perto = novo.origem.findIndex((i) => i >= ancora.inicio);
  if (perto < 0) perto = novo.s.length;
  const k = maisPerto(novo.s, agulha, perto);
  if (k >= 0) {
    const fim = (novo.origem[k + agulha.length - 1] ?? 0) + 1;
    const [de, ate] = aparar(textoNovo, novo.origem[k] ?? 0, fim);
    if (de < ate) return achado('reancorada', 'aproximada', de, ate);
  }

  if (agulha.length < MINIMO_PARA_APROXIMAR) return { status: 'pendente' };
  if (agulha.length * novo.s.length > TETO_DA_CONTA) return { status: 'pendente' };
  const parecido = maisParecido(
    novo.s,
    agulha,
    Math.floor(agulha.length * PROPORCAO_DE_DIFERENCA),
    perto,
  );
  if (!parecido || parecido.fim <= parecido.inicio) return { status: 'pendente' };
  const [de, ate] = aparar(
    textoNovo,
    novo.origem[parecido.inicio] ?? 0,
    (novo.origem[parecido.fim - 1] ?? 0) + 1,
  );
  if (de >= ate) return { status: 'pendente' };
  return achado('reancorada', 'aproximada', de, ate);
}
