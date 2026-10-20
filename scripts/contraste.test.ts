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
/**
 * A casca (D-D9, Q2): o ponto do lockup do cabeçalho (a tinta com o halo de lima de dia, só o âmbar à
 * noite), a espessura do contorno do controle e o fundo dele (o "+" do título; a Q3 liga campo e chip).
 */
const CASCA_DO_DIA = {
  'marca-ponto': 'var(--ponto-luz)',
  'marca-disco': 'var(--ponto-halo)',
  'espessura-contorno': '1.5px',
  'fundo-controle': 'var(--superficie)',
};
const CASCA_DA_NOITE = {
  'marca-ponto': 'var(--ponto-halo)',
  'marca-disco': 'transparent',
  'espessura-contorno': '1px',
  'fundo-controle': 'var(--superficie-2)',
};
/** Os tokens que existem nos três blocos de tema: a forma, a casca, o hover da ação e a fonte do título. */
const TOKENS_POR_MUNDO = [
  ...Object.keys(FORMA_DO_DIA),
  ...Object.keys(CASCA_DO_DIA),
  'acao-hover',
  'fonte-titulo',
];

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

  it('os tokens de forma, da casca, o hover da ação e a fonte do título estão nos três blocos', () => {
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

  it('a casca muda de um mundo para o outro como no contrato da D-D9 (Q2)', () => {
    expect(claro).toMatchObject(CASCA_DO_DIA);
    expect(escuroManual).toMatchObject(CASCA_DA_NOITE);
  });

  it('os tokens da identidade anterior não existem nem são usados em nenhum CSS', () => {
    for (const t of TOKENS_REMOVIDOS) expect(claro).not.toHaveProperty(t);
    // O nome inteiro: depois de `--nome` não vem letra, número, hífen nem sublinhado.
    const usadoEm = (linha: string, t: string) => new RegExp(`--${t}(?![\\w-])`).test(linha);
    const usos = arquivosCss(path.join(import.meta.dirname, '..', 'src')).flatMap((arquivo) =>
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .flatMap((linha, i) =>
          TOKENS_REMOVIDOS.filter((t) => usadoEm(linha, t)).map(
            (t) => `${path.basename(arquivo)}:${i + 1} --${t}`,
          ),
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
