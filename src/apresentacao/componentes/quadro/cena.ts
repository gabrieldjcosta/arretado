// A cena do quadro do cacto (D-D7, "A caneta que desenha"): 16 partes, uma por Dia fechado. Cada parte
// é uma lista de fios (path + papel de cor). Coordenadas finais no `VIEWBOX`; o chão fica em y = 156.
// Sem cor literal: o papel de cor (`vidro`, `tinta`, `tinta2`, `caramelo`) vira token em `quadro.css`.

/** O papel de cor de um fio: vidro = o cacto; tinta = bichos e flores; tinta2 = o atenuado; caramelo = só o sol e o miolo das flores. */
export type CorDoFio = 'vidro' | 'tinta' | 'tinta2' | 'caramelo';

/** O lavis (aguada) sob um fio fechado: vidro e tinta diluídos, ou a cal da folha. */
export type TipoDeLavis = 'vidro' | 'tinta' | 'cal';

export interface Fio {
  /** O traço. Subtrações (`M`) desenham-se uma depois da outra. */
  d: string;
  cor: CorDoFio;
  largura: number;
  opacidade?: number;
  /** A aguada sob o fio: `area` é o contorno fechado que ela preenche; aparece na segunda metade do fio. */
  lavis?: { tipo: TipoDeLavis; area: string };
  /** Centro do miolo (as flores): um ponto de caramelo que brota quando o fio termina. */
  miolo?: readonly [number, number];
  /**
   * O olho (os bichos): um ponto de tinta posto quando o fio termina. `d` é um traço de comprimento
   * zero (`M… h0`: sozinho, o `M` não desenha nada) e `largura` é o diâmetro do ponto.
   */
  olho?: { d: string; largura: number };
}

export interface Parte {
  id: string;
  /** Com artigo, para a legenda: "Hoje a caneta desenhou o braço direito." */
  nome: string;
  fios: readonly Fio[];
}

export const VIEWBOX = '0 0 340 200';
/** Onde a caneta fica largada: a ponta no fim do chão desenhado, à direita do cacto. */
export const REPOUSO = { x: 222, y: 156, escala: 0.6 } as const;

const r1 = (n: number) => Math.round(n * 10) / 10;
const rad = (g: number) => (g * Math.PI) / 180;

const COMANDO = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
const NUMERO = /-?\d*\.?\d+(?:e-?\d+)?/g;

/**
 * Move e escala (uniforme) o texto de um path: as coordenadas absolutas levam a translação e a escala;
 * as relativas, só a escala. Os bichos são desenhados em coordenadas locais e postos no lugar.
 */
export function mover(d: string, tx: number, ty: number, escala = 1): string {
  let saida = '';
  for (const [, comando = '', argumentos = ''] of d.matchAll(COMANDO)) {
    const maiusculo = comando.toUpperCase();
    if (maiusculo === 'Z') {
      saida += 'Z';
      continue;
    }
    const n = (argumentos.match(NUMERO) ?? []).map(Number);
    const absoluto = comando === maiusculo;
    const x = (v: number) => (absoluto ? v * escala + tx : v * escala);
    const y = (v: number) => (absoluto ? v * escala + ty : v * escala);
    const novos: number[] = [];
    if (maiusculo === 'H') {
      for (const v of n) novos.push(x(v));
    } else if (maiusculo === 'V') {
      for (const v of n) novos.push(y(v));
    } else if (maiusculo === 'A') {
      for (let i = 0; i + 6 < n.length; i += 7) {
        const [rx = 0, ry = 0, giro = 0, grande = 0, sentido = 0, fx = 0, fy = 0] = n.slice(
          i,
          i + 7,
        );
        novos.push(rx * escala, ry * escala, giro, grande, sentido, x(fx), y(fy));
      }
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) novos.push(x(n[i] ?? 0), y(n[i + 1] ?? 0));
    }
    saida += comando + novos.map(r1).join(' ');
  }
  return saida;
}

/** Flor de cinco pétalas, num traço só: cada pétala sai do centro e volta a ele. */
export function flor(cx: number, cy: number, raio: number): string {
  let d = '';
  for (let k = 0; k < 5; k += 1) {
    const a = -90 + 72 * k;
    const p = (r: number, g: number) =>
      `${String(r1(cx + r * Math.cos(rad(a + g))))} ${String(r1(cy + r * Math.sin(rad(a + g))))}`;
    d += `M${String(r1(cx))} ${String(r1(cy))}C${p(0.55 * raio, -40)} ${p(1.08 * raio, -17)} ${p(raio, 0)}`;
    d += `C${p(1.08 * raio, 17)} ${p(0.55 * raio, 40)} ${String(r1(cx))} ${String(r1(cy))}`;
  }
  return d;
}

export function circulo(cx: number, cy: number, raio: number): string {
  const direita = `${String(r1(cx + raio))} ${String(r1(cy))}`;
  const esquerda = `${String(r1(cx - raio))} ${String(r1(cy))}`;
  const arco = `A${String(raio)} ${String(raio)} 0 1 1`;
  return `M${direita}${arco} ${esquerda}${arco} ${direita}`;
}

/** `n` raios de `de` a `ate` em volta de (cx, cy), a partir do ângulo `inicio` (graus). */
export function raios(
  cx: number,
  cy: number,
  de: number,
  ate: number,
  n: number,
  inicio: number,
): string {
  let d = '';
  for (let k = 0; k < n; k += 1) {
    const a = rad(inicio + (360 / n) * k);
    d += `M${String(r1(cx + de * Math.cos(a)))} ${String(r1(cy + de * Math.sin(a)))}`;
    d += `L${String(r1(cx + ate * Math.cos(a)))} ${String(r1(cy + ate * Math.sin(a)))}`;
  }
  return d;
}

/** Uma ave de longe: dois arcos, de largura `l`, a partir de (x, y). */
export function ave(x: number, y: number, l: number): string {
  const h = l * 0.32;
  const p = (dx: number, dy: number) => `${String(r1(x + l * dx))} ${String(r1(y + dy))}`;
  return (
    `M${String(x)} ${String(y)}C${p(0.15, -h)} ${p(0.4, -h)} ${p(0.5, 0)}` +
    `C${p(0.6, -h)} ${p(0.85, -h)} ${p(1, 0)}`
  );
}

/** Um tufo de capim de três folhas, de altura `a`, com a raiz em (x, y). */
export function capim(x: number, y: number, a: number): string {
  const c = (n: number) => String(r1(n));
  return (
    `M${c(x)} ${c(y)}C${c(x - 1)} ${c(y - a * 0.5)} ${c(x - 3)} ${c(y - a * 0.8)} ${c(x - 5)} ${c(y - a)}` +
    `M${c(x)} ${c(y)}C${c(x)} ${c(y - a * 0.6)} ${c(x)} ${c(y - a * 0.9)} ${c(x + 0.5)} ${c(y - a * 1.15)}` +
    `M${c(x)} ${c(y)}C${c(x + 1)} ${c(y - a * 0.5)} ${c(x + 3)} ${c(y - a * 0.8)} ${c(x + 5.5)} ${c(y - a * 0.95)}`
  );
}

// ── Bichos, desenhados em coordenadas locais (chão em y = 40) e movidos para o lugar ──────────────

const CALANGO =
  'M96 31C92 26 86 24 80 25C76 25 72 26 68 27C62 24 52 22 42 25C34 28 26 31 18 31C12 31 6 28 3 22C8 30 14 35 22 35C32 36 42 36 52 36C62 36 72 36 80 35C86 34 92 34 96 31Z';
const CALANGO_PATAS = 'M74 35L79 40L84 40M66 35L70 40M38 35L31 40L25 40M46 35L42 40';
const CASCO = 'M18 40C18 26 28 24 40 24C52 24 62 28 62 40Z';
/** As cintas do tatu-bola, sobre a cúpula do casco (a curva é a de uma elipse de 22 × 16). */
const BANDAS = [26, 33, 40, 47, 54]
  .map((x) => {
    const topo = 40 - 16 * Math.sqrt(1 - ((x - 40) / 22) ** 2);
    return `M${String(x)} ${String(r1(topo))}Q${String(x - 2.5)} ${String(r1((topo + 40) / 2))} ${String(x - 1)} 40`;
  })
  .join('');
const TATU_CABECA = 'M60 35C64 33 68 34 72 38L74 40L60 40';
const TATU_ORELHA = 'M62 31L64 27L67 31';
const TATU_RABO = 'M19 37C12 37 8 35 6 30';
const ASA_E = 'M25 10C22 2 10 0 8 8C7 14 16 17 25 14Z';
const ASA_E2 = 'M25 14C18 15 10 18 12 24C14 29 22 27 25 20Z';
const ASA_D = 'M25 10C28 2 40 0 42 8C43 14 34 17 25 14';
const ASA_D2 = 'M25 14C32 15 40 18 38 24C36 29 28 27 25 20Z';
const BORBOLETA_CORPO = 'M25 8V22M25 8C23 3 21 2 19 3M25 8C27 3 29 2 31 3';

const CALANGO_T = [22, 128.8, 0.68] as const;
const TATU_T = [172, 133.6, 0.56] as const;
const BORBOLETA_T = [214, 82, 0.55] as const;

const calango = mover(CALANGO, ...CALANGO_T);
const casco = mover(CASCO, ...TATU_T);
const asas = mover(ASA_E + ASA_E2 + ASA_D + ASA_D2, ...BORBOLETA_T);

/** As 16 partes do quadro, na ordem em que a caneta as desenha: o cacto, as flores e o sertão chegando. */
export const PARTES: readonly [Parte, ...Parte[]] = [
  {
    id: 'chao',
    nome: 'o chão',
    fios: [{ d: 'M14 156C60 153 100 159 150 156S250 153 326 157', cor: 'tinta2', largura: 2.4 }],
  },
  {
    id: 'tronco',
    nome: 'o tronco',
    fios: [
      {
        d: 'M133 156V122M133 94V57A17 17 0 0 1 167 57V110M167 138V156',
        cor: 'vidro',
        largura: 3,
        lavis: { tipo: 'vidro', area: 'M133 156V57A17 17 0 0 1 167 57V156Z' },
      },
    ],
  },
  {
    id: 'braco-esquerdo',
    nome: 'o braço esquerdo',
    fios: [
      {
        d: 'M133 94H111V82A11 11 0 0 0 89 82V111A11 11 0 0 0 100 122H133',
        cor: 'vidro',
        largura: 3,
        lavis: {
          tipo: 'vidro',
          area: 'M133 94H111V82A11 11 0 0 0 89 82V111A11 11 0 0 0 100 122H133Z',
        },
      },
    ],
  },
  {
    id: 'braco-direito',
    nome: 'o braço direito',
    fios: [
      {
        d: 'M167 110H189V98A11 11 0 0 1 211 98V127A11 11 0 0 1 200 138H167',
        cor: 'vidro',
        largura: 3,
        lavis: {
          tipo: 'vidro',
          area: 'M167 110H189V98A11 11 0 0 1 211 98V127A11 11 0 0 1 200 138H167Z',
        },
      },
    ],
  },
  {
    id: 'espinhos',
    nome: 'as nervuras e os espinhos',
    fios: [
      { d: 'M150 150V62M100 116V92M200 132V108', cor: 'vidro', largura: 1.6, opacidade: 0.55 },
      {
        d: 'M127 70l-6-2M127 86l-6-2M127 134l-6-1M173 72l6-2M173 90l6-2M173 146l6-1M86 96l-6-2M86 104l-6-2M214 112l6-2M214 120l6-1',
        cor: 'vidro',
        largura: 1.8,
      },
    ],
  },
  {
    id: 'flor-da-coroa',
    nome: 'a flor da coroa',
    fios: [
      {
        d: flor(150, 28, 11),
        cor: 'tinta',
        largura: 2.1,
        lavis: { tipo: 'cal', area: flor(150, 28, 11) },
        miolo: [150, 28],
      },
    ],
  },
  {
    id: 'flor-do-braco-esquerdo',
    nome: 'a flor do braço esquerdo',
    fios: [
      {
        d: flor(100, 63, 9),
        cor: 'tinta',
        largura: 2,
        lavis: { tipo: 'cal', area: flor(100, 63, 9) },
        miolo: [100, 63],
      },
    ],
  },
  {
    id: 'flor-do-braco-direito',
    nome: 'a flor do braço direito',
    fios: [
      {
        d: flor(200, 80, 9),
        cor: 'tinta',
        largura: 2,
        lavis: { tipo: 'cal', area: flor(200, 80, 9) },
        miolo: [200, 80],
      },
    ],
  },
  {
    id: 'sol',
    nome: 'o sol',
    fios: [
      { d: circulo(56, 48, 11), cor: 'caramelo', largura: 2.4 },
      { d: raios(56, 48, 16, 22, 8, 22.5), cor: 'caramelo', largura: 2.4 },
    ],
  },
  {
    id: 'aves',
    nome: 'as aves',
    fios: [
      { d: ave(172, 42, 24), cor: 'tinta', largura: 2.2 },
      { d: ave(204, 26, 16), cor: 'tinta', largura: 2 },
      { d: ave(184, 14, 11), cor: 'tinta', largura: 1.8 },
    ],
  },
  {
    id: 'calango',
    nome: 'o calango',
    fios: [
      {
        d: calango,
        cor: 'tinta',
        largura: 2,
        lavis: { tipo: 'tinta', area: calango },
        olho: { d: mover('M85 29h0', ...CALANGO_T), largura: 2.8 },
      },
      { d: mover(CALANGO_PATAS, ...CALANGO_T), cor: 'tinta', largura: 2 },
    ],
  },
  {
    id: 'nuvem',
    nome: 'a nuvem',
    fios: [
      {
        d: 'M266 66C254 66 254 50 268 50C270 38 292 36 298 46C312 42 324 54 314 66Z',
        cor: 'tinta2',
        largura: 2.2,
        lavis: {
          tipo: 'cal',
          area: 'M266 66C254 66 254 50 268 50C270 38 292 36 298 46C312 42 324 54 314 66Z',
        },
      },
    ],
  },
  {
    id: 'chuva',
    nome: 'a chuva',
    fios: [
      {
        d: 'M276 74l-3 9M288 74l-3 9M300 74l-3 9M312 74l-3 9M282 88l-3 8M294 88l-3 8M306 88l-3 8',
        cor: 'vidro',
        largura: 2.2,
      },
    ],
  },
  {
    id: 'capim',
    nome: 'o capim',
    fios: [
      {
        d: [capim(10, 157, 10), capim(98, 157, 9), capim(318, 157, 12), capim(330, 157, 8)].join(
          '',
        ),
        cor: 'vidro',
        largura: 2,
      },
    ],
  },
  {
    id: 'tatu-bola',
    nome: 'o tatu-bola',
    fios: [
      { d: casco, cor: 'tinta', largura: 2, lavis: { tipo: 'tinta', area: casco } },
      { d: mover(BANDAS, ...TATU_T), cor: 'tinta', largura: 1.6 },
      {
        d: mover(TATU_CABECA + TATU_ORELHA + TATU_RABO, ...TATU_T),
        cor: 'tinta',
        largura: 2,
        olho: { d: mover('M68 37h0', ...TATU_T), largura: 2.4 },
      },
    ],
  },
  {
    id: 'borboleta',
    nome: 'a borboleta',
    fios: [
      { d: asas, cor: 'tinta', largura: 1.7, lavis: { tipo: 'cal', area: asas } },
      { d: mover(BORBOLETA_CORPO, ...BORBOLETA_T), cor: 'tinta', largura: 1.8 },
    ],
  },
];

/**
 * Qual parte o Dia fechado desenha: conta o total de Dias fechados (nunca uma sequência), e depois da
 * última parte o Dia seguinte abre uma folha nova. `indice` é de 0 a 15; as partes já feitas ficam
 * antes dele.
 */
export function parteDoDia(diasFechados: number): { indice: number; parte: Parte } {
  const n = Number.isFinite(diasFechados) ? Math.max(1, Math.trunc(diasFechados)) : 1;
  const indice = (n - 1) % PARTES.length;
  return { indice, parte: PARTES[indice] ?? PARTES[0] };
}

/** A legenda de quem desenhou, lida pelo leitor de tela quando o desenho termina. Sem número nem meta. */
export function legendaDaParte(parte: Parte): string {
  return `Hoje a caneta desenhou ${parte.nome}.`;
}
