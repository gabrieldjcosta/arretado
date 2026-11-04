// A cena do pouso (D-D25, protótipo v16 da Marca): o cacto da marca florindo diante de um lugar da vereda,
// sob um céu de noite. Cinco lugares (o juazeiro, o carcará, o açude, o Velho Chico e a asa-branca); cada pouso
// planta uma flor no chão do Zé, e a quinta fecha o jardim. Contas puras e deterministas: o mesmo pouso desenha
// sempre a mesma cena. Nada aqui lê banco, tela ou relógio.

/** Um lugar da vereda: o nome, o título do pouso, onde a lua fica e o desenho (um `d` de SVG, em 320 por 236). */
export interface LugarDoPouso {
  nome: string;
  /** O título do pouso, que termina sempre em "Pode descansar." (sem cobrança, sem placar). */
  titulo: string;
  lua: readonly [number, number];
  desenho: string;
}

/** A tela da cena: o `viewBox` do SVG. O chão fica em `y = 226`. */
export const LARGURA_DA_CENA = 320;
export const ALTURA_DA_CENA = 236;
export const CHAO_DA_CENA = 226;

/** Quantos lugares a vereda tem; o jardim do Zé tem uma flor por pouso, até cinco. */
export const LUGARES_POR_VOLTA = 5;

/** Onde cada flor nasce (o pé da flor fica no chão), na ordem em que o jardim enche. */
export const FLORES_DO_JARDIM: readonly (readonly [number, number])[] = [
  [146, 212],
  [168, 216],
  [52, 214],
  [192, 218],
  [34, 210],
];

/** A lua crescente: um arco grande por fora e outro menor por dentro. */
export const luaEm = (x: number, y: number): string =>
  `M${String(x)} ${String(y - 16)} a17 17 0 1 0 15 25 a13 13 0 1 1 -15 -25 z`;

/** A serra ao fundo, de ponta a ponta do desenho (320 por 236), como no `cena()` do mockup aprovado. */
export const SERRA =
  'M0 236 V196 C40 186 70 192 100 184 C140 174 170 188 210 182 C250 176 280 186 320 178 V236 Z';

/** O gerador do protótipo: sempre a mesma sequência para a mesma semente. */
function sorteio(semente: number): () => number {
  let s = semente;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const casas = (n: number, k = 1) => n.toFixed(k);

/** Uma folha miúda: duas curvas de `(x, y)` a `L` unidades, na direção `ang` (graus), com largura `w`. */
function folha(x: number, y: number, ang: number, L: number, w: number): string {
  const a = (ang * Math.PI) / 180;
  const tx = x + Math.cos(a) * L;
  const ty = y + Math.sin(a) * L;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  const nx = -Math.sin(a) * w;
  const ny = Math.cos(a) * w;
  return ` M${casas(x)} ${casas(y)} Q${casas(mx + nx)} ${casas(my + ny)} ${casas(tx)} ${casas(ty)} Q${casas(mx - nx)} ${casas(my - ny)} ${casas(x)} ${casas(y)}`;
}

type Galho = readonly [x: number, y: number, curva: string];
const RAMOS: readonly (readonly [tronco: string, galhos: readonly Galho[]])[] = [
  [
    'M232 166 C220 152 208 140 196 130',
    [
      [196, 130, 'C184 124 170 116 158 104'],
      [196, 130, 'C190 112 180 94 170 80'],
      [196, 130, 'C196 110 194 84 192 62'],
      [196, 130, 'C202 120 206 110 208 98'],
    ],
  ],
  [
    'M236 165 C236 146 232 130 232 116',
    [
      [232, 116, 'C228 92 224 70 220 48'],
      [232, 116, 'C238 92 242 66 246 40'],
      [232, 116, 'C232 104 232 92 232 82'],
    ],
  ],
  [
    'M240 166 C254 154 266 142 276 130',
    [
      [276, 130, 'C270 110 266 84 262 58'],
      [276, 130, 'C280 108 284 82 288 56'],
      [276, 130, 'C290 116 298 100 304 80'],
      [276, 130, 'C292 124 304 116 314 104'],
      [276, 130, 'C280 120 282 110 282 98'],
    ],
  ],
];

/** O ponto onde a curva `C…` de um galho termina: os dois últimos números. */
function pontaDaCurva(curva: string): [number, number] {
  const n = curva.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return [n.at(-2) ?? 0, n.at(-1) ?? 0];
}

/**
 * O juazeiro: um tronco curto e torto que abre em galhos, cada galho terminando num tufo de folhas miúdas
 * (tem folha e tem vão, não é nuvem), com a sombra fresca no chão.
 */
export function desenhoDoJuazeiro(): string {
  const rnd = sorteio(17);
  let d =
    ' M229 226 C226 212 234 198 230 184 C228 176 229 170 232 165 M243 226 C241 212 247 198 243 185 C241 177 241 170 240 165';
  const pontas: [number, number][] = [];
  for (const [tronco, galhos] of RAMOS) {
    d += ` ${tronco}`;
    for (const [x, y, curva] of galhos) {
      d += ` M${String(x)} ${String(y)} ${curva}`;
      pontas.push(pontaDaCurva(curva));
    }
  }
  pontas.forEach(([x, y], k) => {
    const n = 11 + (k % 3);
    for (let q = 0; q < n; q += 1) {
      const ang = -90 + (q - (n - 1) / 2) * (320 / n) + (rnd() - 0.5) * 14;
      const a = (ang * Math.PI) / 180;
      const r0 = 3 + rnd() * 6;
      d += folha(x + Math.cos(a) * r0, y + Math.sin(a) * r0, ang, 9 + rnd() * 4, 3.4);
    }
  });
  return `${d} M150 232 H178 M190 232 H284 M296 232 H318`;
}

interface BaseDoLugar extends Omit<LugarDoPouso, 'desenho'> {
  /** O desenho pronto, ou quem o desenha (o juazeiro é gerado, uma vez, na primeira vez que alguém o pede). */
  desenho: string | (() => string);
}

/** Os cinco lugares, na ordem da vereda. */
const LUGARES_DA_VEREDA: readonly BaseDoLugar[] = [
  {
    nome: 'Juazeiro',
    titulo: 'Sombra de juazeiro. Pode descansar.',
    lua: [44, 36],
    desenho: desenhoDoJuazeiro,
  },
  {
    nome: 'Carcará',
    titulo: 'O carcará passou. Pode descansar.',
    lua: [262, 40],
    desenho:
      'M150 82 C164 68 180 66 192 76 C196 70 202 68 208 72 C204 74 202 76 202 80 C216 68 234 64 250 74 M202 80 L196 92 L207 87 M180 78 L172 84 M226 72 L236 80 M302 224 C300 202 306 186 298 166 M300 192 C290 184 280 184 272 188 M300 176 C308 168 314 166 318 168 M210 120 q6 -5 12 0 q6 -5 12 0',
  },
  {
    nome: 'Açude',
    titulo: 'Água no açude. Pode descansar.',
    lua: [262, 40],
    desenho:
      'M150 208 Q170 203 190 208 T 230 208 T 270 208 T 310 208 M166 218 Q186 213 206 218 T 246 218 T 286 218 T 320 218 M182 228 Q202 223 222 228 T 262 228 T 302 228 M254 196 h16 M250 204 h24 M256 212 h12 M140 224 L150 200 H320',
  },
  {
    nome: 'Velho Chico',
    titulo: 'Na beira do Velho Chico. Pode descansar.',
    lua: [262, 40],
    desenho:
      'M150 204 C190 196 230 212 270 204 C290 200 306 202 320 198 M140 218 C180 210 220 226 260 218 C284 214 304 216 320 212 M156 230 C196 224 236 236 276 230 M214 190 H262 L254 200 H222 Z M238 190 V150 L262 184 Z M238 150 L232 158',
  },
  {
    nome: 'Asa-branca',
    titulo: 'A asa-branca voltou. Pode descansar.',
    lua: [262, 40],
    desenho:
      'M150 66 q9 -8 18 0 q9 -8 18 0 M196 42 q8 -7 16 0 q8 -7 16 0 M232 80 q7 -6 14 0 q7 -6 14 0 M184 104 q6 -5 12 0 q6 -5 12 0 M270 108 q5 -4 10 0 q5 -4 10 0 M140 120 q5 -4 10 0 q5 -4 10 0',
  },
];

let juazeiroPronto: string | undefined;

/** O lugar de número `indice` (de 0 a 4); fora disso, a vereda dá a volta. */
export function lugarDaVereda(indice: number): LugarDoPouso {
  const i = ((Math.trunc(indice) % LUGARES_POR_VOLTA) + LUGARES_POR_VOLTA) % LUGARES_POR_VOLTA;
  const base = LUGARES_DA_VEREDA[i];
  if (!base) throw new Error('A vereda não tem esse lugar.');
  if (typeof base.desenho === 'function') {
    juazeiroPronto ??= base.desenho();
    return { ...base, desenho: juazeiroPronto };
  }
  return { ...base, desenho: base.desenho };
}

/** Um pouso na vereda: o número dele (a partir de 1), o lugar (e a posição dele, de 0 a 4) e as flores do jardim. */
export interface PousoNaVereda {
  numero: number;
  indice: number;
  lugar: LugarDoPouso;
  flores: number;
}

/** O pouso de número `numero` (a partir de 1): o lugar da vez e o jardim, que cresce até cinco flores. */
export function pousoNaVereda(numero: number): PousoNaVereda {
  const n = Math.max(1, Math.trunc(numero));
  const indice = (n - 1) % LUGARES_POR_VOLTA;
  return { numero: n, indice, lugar: lugarDaVereda(indice), flores: indice + 1 };
}

/**
 * Os pousos da volta em que `numero` está, do primeiro dela até ele: o jardim começa de novo a cada cinco.
 * É o que as pílulas do pouso mostram (só o que já foi visitado).
 */
export function pousosDaVolta(numero: number): PousoNaVereda[] {
  const atual = pousoNaVereda(numero);
  const primeiro = atual.numero - (atual.flores - 1);
  return Array.from({ length: atual.flores }, (_, i) => pousoNaVereda(primeiro + i));
}

/** O céu: estrelas miúdas na metade de cima, sempre as mesmas para o mesmo lugar (o `cena()` do mockup aprovado). */
export interface Estrela {
  x: number;
  y: number;
  r: number;
  opacidade: number;
}

export function estrelasDoCeu(indiceDoLugar: number, quantidade = 28): Estrela[] {
  const rnd = sorteio(Math.max(0, Math.trunc(indiceDoLugar)) + 4);
  return Array.from({ length: quantidade }, () => ({
    x: Number(casas(rnd() * LARGURA_DA_CENA, 0)),
    y: Number(casas(rnd() * 130, 0)),
    r: Number(casas(rnd() * 1.1 + 0.3, 1)),
    opacidade: Number(casas(rnd() * 0.5 + 0.2, 2)),
  }));
}
