// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { lerTemas, medir, razao } from './contraste.mjs';

/** Tokens das identidades anteriores: a verde-oliva saiu na fundação do redesenho v2; a paleta da
 * D-D5 (creme, marinho, sol) e os seus aliases saíram com o Ponto de luz (D-D7); a paleta da D-D7
 * (areia, cal, vidro, noite-*) saiu com "Tinta e noite" (D-D9). `tinta`, `tinta-2` e `luz` voltam com
 * outro sentido e não estão aqui. A varredura casa o nome inteiro (`--cal` não pega `--calha-estrela`). */
const TOKENS_REMOVIDOS = [
  'primaria',
  'primaria-texto',
  'agora-fundo',
  'agora-borda',
  'depois',
  'progresso',
  'cartao-agora-fundo',
  'cartao-agora-texto',
  'cartao-agora-atenuado',
  'creme',
  'marinho',
  'sol',
  'argila',
  'verde-foco',
  'azul-ceu',
  'ponto-fundo',
  'palha',
  'terracota',
  'caatinga',
  'acqua',
  'solace',
  'sobre-solace',
  'noite-cartao',
  'areia',
  'areia-funda',
  'cal',
  'vidro',
  'vidro-texto',
  'traco',
  'noite',
  'noite-funda',
  'noite-folha',
  'noite-quente',
  'noite-tinta',
  'noite-tinta-2',
  'noite-vidro',
  'noite-traco',
];

/** A paleta de cada mundo, como nas pranchas m2-agora (dia) e m1-agora (noite): é o contrato da D-D9. */
const PALETA_DO_DIA = {
  papel: '#f6f8fb',
  folha: '#ffffff',
  tinta: '#0f1c3a',
  'tinta-2': '#4a5878',
  'tinta-funda': '#0a1428',
  contorno: '#6e7a96',
  linha: '#838fa7',
  filete: '#dde2ea',
  marca: '#eefa4b',
};
const PALETA_DA_NOITE = {
  'n-noite': '#0b1322',
  'n-serra': '#131d31',
  'n-serra-2': '#1c2942',
  'n-texto': '#eef2fa',
  'n-texto-2': '#a4b1cb',
  'n-ambar': '#ffc53d',
  'n-luz': '#f2f6ff',
  'n-borda': '#34425e',
  'n-linha': '#5c6b8c',
  'n-vidro': '#9db7e8',
};

/** A forma de cada mundo (D-D9): o dia é angular e leva filete; a noite é arredondada e sem filete. */
const FORMA_DO_DIA = {
  'raio-botao': '6px',
  'raio-folha': '8px',
  'raio-chip': '6px',
  'sombra-botao': '0 2px 0 var(--tinta-funda)',
  'borda-folha': '1px solid var(--filete)',
  'peso-titulo': '800',
};
const FORMA_DA_NOITE = {
  'raio-botao': '12px',
  'raio-folha': '14px',
  'raio-chip': '10px',
  'sombra-botao': 'none',
  'borda-folha': 'none',
  'peso-titulo': '700',
};
/** Os tokens que existem nos três blocos de tema: a forma, o hover da ação e a fonte do título. */
const TOKENS_POR_MUNDO = [...Object.keys(FORMA_DO_DIA), 'acao-hover', 'fonte-titulo'];

/** Os tokens da caneta e do quadro do cacto que a Q4 trocou: `--caneta-*` virou `--pen-*` e o
 * caramelo saiu (o sol e o miolo das flores agora são tinta; a ponta do núcleo leva a marca do mundo). */
const TOKENS_REMOVIDOS_NA_Q4 = [
  'caramelo',
  'caneta-0',
  'caneta-1',
  'caneta-2',
  'caneta-3',
  'caneta-4',
  'caneta-miolo',
  'caneta-borda',
  'caneta-borda-opacidade',
  'caneta-brilho',
  'caneta-halo-dia',
  'caneta-halo-noite',
];

/** A caneta de vidro e o quadro do cacto, como nas pranchas m2/m1-dia-fechado e no kit (`pen.mjs` v5):
 * o dia leva o vidro claro, a tinta e o halo lima; a noite, o vidro a 14%, o furo âmbar e o halo âmbar. */
const CANETA_DO_DIA = {
  'pen-rim': 'var(--tinta-funda)',
  'pen-vidro': '#edf0f6',
  'pen-vidro2': '#c7cedb',
  'pen-vidro-a': '0.9',
  'pen-tinta': 'var(--tinta)',
  'pen-tinta2': 'var(--tinta)',
  'pen-brilho': '#ffffff',
  'pen-halo': 'var(--marca)',
  'pen-halo-op': '1',
  'pen-esfera': 'var(--tinta)',
  'pen-luz': '#ffffff',
  'pen-sombra': 'var(--tinta)',
  'pen-sombra-op': '0.16',
  'quadro-chao': 'var(--linha)',
  'quadro-aro': 'var(--tinta)',
  'quadro-marca': 'var(--marca)',
};
/** O que a noite troca; `--pen-luz` e `--pen-sombra` ficam como no dia (a sombra some em `--pen-sombra-op` 0). */
const CANETA_DA_NOITE = {
  'pen-rim': 'var(--n-vidro)',
  'pen-vidro': 'var(--n-vidro)',
  'pen-vidro2': 'var(--n-vidro)',
  'pen-vidro-a': '0.14',
  'pen-tinta': '#fff1c2',
  'pen-tinta2': 'var(--n-ambar)',
  'pen-brilho': '#e8f0ff',
  'pen-halo': '#ffd978',
  'pen-halo-op': '0.9',
  'pen-esfera': '#fffbe8',
  'pen-sombra-op': '0',
  'quadro-chao': 'var(--n-borda)',
  'quadro-aro': 'color-mix(in srgb, var(--n-vidro) 70%, var(--n-noite))',
  'quadro-marca': 'transparent',
};

function arquivosCss(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(pasta, e.name);
    if (e.isDirectory()) return arquivosCss(caminho);
    return e.name.endsWith('.css') ? [caminho] : [];
  });
}

describe('contraste dos tokens (AA nos dois temas)', () => {
  const { claro, escuroSistema, escuroManual } = lerTemas();

  it('a razão WCAG bate com os valores de referência', () => {
    expect(razao({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(21, 5);
    expect(razao({ r: 119, g: 119, b: 119, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(
      4.48,
      1,
    );
  });

  it('o escuro por preferência do sistema tem os mesmos valores do escuro manual', () => {
    expect(escuroSistema).toEqual(escuroManual);
  });

  it('a paleta de cada mundo tem os valores das pranchas (D-D9)', () => {
    expect(claro).toMatchObject(PALETA_DO_DIA);
    expect(claro).toMatchObject(PALETA_DA_NOITE);
    // As duas paletas ficam no bloco claro e valem nos dois temas: o escuro não as redefine.
    for (const nome of [...Object.keys(PALETA_DO_DIA), ...Object.keys(PALETA_DA_NOITE)]) {
      expect(escuroManual).not.toHaveProperty(nome);
    }
  });

  it('os tokens de forma, o hover da ação e a fonte do título estão nos três blocos', () => {
    for (const [bloco, tokens] of [
      ['claro', claro],
      ['escuro (sistema)', escuroSistema],
      ['escuro (manual)', escuroManual],
    ] as const) {
      const faltam = TOKENS_POR_MUNDO.filter((t) => !(t in tokens));
      expect(faltam, `faltam no bloco ${bloco}`).toEqual([]);
    }
  });

  it('a forma muda de um mundo para o outro como na D-D9', () => {
    expect(claro).toMatchObject(FORMA_DO_DIA);
    expect(escuroManual).toMatchObject(FORMA_DA_NOITE);
    expect(claro['fonte-titulo']).toMatch(/^'Schibsted Grotesk'/);
    expect(escuroManual['fonte-titulo']).toMatch(/^'Familjen Grotesk'/);
  });

  it('a caneta e o quadro do cacto têm os tokens dos dois mundos nos três blocos (Q4)', () => {
    expect(claro).toMatchObject(CANETA_DO_DIA);
    for (const bloco of [escuroSistema, escuroManual]) expect(bloco).toMatchObject(CANETA_DA_NOITE);
  });

  it('os tokens da identidade anterior não existem nem são usados em nenhum CSS', () => {
    const removidos = [...TOKENS_REMOVIDOS, ...TOKENS_REMOVIDOS_NA_Q4];
    for (const t of removidos) expect(claro).not.toHaveProperty(t);
    // O nome inteiro: depois de `--nome` não vem letra, número, hífen nem sublinhado.
    const usadoEm = (linha: string, t: string) => new RegExp(`--${t}(?![\\w-])`).test(linha);
    const usos = arquivosCss(path.join(import.meta.dirname, '..', 'src')).flatMap((arquivo) =>
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .flatMap((linha, i) =>
          removidos
            .filter((t) => usadoEm(linha, t))
            .map((t) => `${path.basename(arquivo)}:${i + 1} --${t}`),
        ),
    );
    expect(usos).toEqual([]);
  });

  it.each([
    ['claro', claro],
    ['escuro', { ...claro, ...escuroManual }],
  ])('todos os pares passam no tema %s', (_nome, tema) => {
    const reprovados = medir(tema).filter((l) => !l.ok);
    expect(reprovados.map((l) => `${l.fg}/${l.bg} ${l.valor.toFixed(2)}<${l.minimo}`)).toEqual([]);
  });
});
