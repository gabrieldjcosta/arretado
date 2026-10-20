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

/** Os controles e a folha (D-D9, Q3): o aperto do botão (de dia ele desce 1 px e a sombra baixa junto; à noite
 * encolhe), a sombra da folha (a mesma linha de 1 px, por dentro) e o título dela. */
const CONTROLES_DO_DIA = {
  'aperto-botao': 'translateY(1px)',
  'sombra-botao-aperto': '0 1px 0 var(--tinta-funda)',
  'espessura-contorno': '1.5px',
  'fundo-controle': 'var(--superficie)',
  'sombra-folha': 'inset 0 0 0 1px var(--linha)',
  'peso-titulo-folha': '800',
  'espaco-titulo-folha': '-0.02em',
};
const CONTROLES_DA_NOITE = {
  'aperto-botao': 'scale(0.975)',
  'sombra-botao-aperto': 'none',
  'espessura-contorno': '1px',
  'fundo-controle': 'var(--superficie-2)',
  'sombra-folha': 'inset 0 0 0 1px var(--n-borda)',
  'peso-titulo-folha': '600',
  'espaco-titulo-folha': '-0.005em',
};
/** A forma do ponto do Dia (Q3): uma máscara para o anel e uma para cada estado com miolo (atual, feito). */
const FORMAS_DO_PONTO = ['forma-ponto-anel', 'forma-ponto-atual', 'forma-ponto-feito'];

/** O que a Q3 tirou: a borda transparente da folha do Agora (`--bloco-borda`); agora a folha e o cartão levam
 * a mesma linha, `--borda-folha`. */
const TOKENS_REMOVIDOS_NA_Q3 = ['bloco-borda'];

/** A forma de cada mundo (D-D9): o dia é angular; a noite é arredondada. A folha em repouso leva a linha de
 * 1 px do mundo nos dois (a `--borda` das pranchas Dia fechado: #838FA7 de dia, #34425E à noite), não o
 * filete decorativo (#DDE2EA) nem a falta de linha: sem ela a folha some no chão (1,06:1 e 1,10:1). */
const FORMA_DO_DIA = {
  'raio-botao': '6px',
  'raio-folha': '8px',
  'raio-chip': '6px',
  'sombra-botao': '0 2px 0 var(--tinta-funda)',
  'borda-folha': '1px solid var(--linha)',
  'peso-titulo': '800',
};
const FORMA_DA_NOITE = {
  'raio-botao': '12px',
  'raio-folha': '14px',
  'raio-chip': '10px',
  'sombra-botao': 'none',
  'borda-folha': '1px solid var(--n-borda)',
  'peso-titulo': '700',
};
/** Os tokens que existem nos três blocos de tema: a forma, o hover da ação e a fonte do título. */
const TOKENS_POR_MUNDO = [...Object.keys(FORMA_DO_DIA), 'acao-hover', 'fonte-titulo'];

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

  describe('controles, folha e pontos do Dia (D-D9, Q3)', () => {
    it('os tokens dos controles, da folha e da forma do ponto estão nos três blocos', () => {
      const nomes = [...Object.keys(CONTROLES_DO_DIA), ...FORMAS_DO_PONTO];
      for (const [bloco, tokens] of [
        ['claro', claro],
        ['escuro (sistema)', escuroSistema],
        ['escuro (manual)', escuroManual],
      ] as const) {
        const faltam = nomes.filter((t) => !(t in tokens));
        expect(faltam, `faltam no bloco ${bloco}`).toEqual([]);
      }
    });

    it('o aperto, o contorno e o título da folha mudam de um mundo para o outro', () => {
      expect(claro).toMatchObject(CONTROLES_DO_DIA);
      expect(escuroManual).toMatchObject(CONTROLES_DA_NOITE);
    });

    it('o ponto do Dia tem uma forma por estado e uma por mundo: o estado nunca é só a cor', () => {
      for (const tokens of [claro, escuroSistema, escuroManual]) {
        const formas = FORMAS_DO_PONTO.map((f) => tokens[f]);
        expect(new Set(formas).size, 'anel, atual e feito diferem').toBe(FORMAS_DO_PONTO.length);
        for (const forma of formas) expect(forma).toMatch(/^url\("data:image\/svg\+xml,/);
      }
      for (const f of FORMAS_DO_PONTO)
        expect(claro[f], `${f} muda com o mundo`).not.toBe(escuroManual[f]);
    });

    it('os tokens que a Q3 tirou não existem nem são usados em nenhum CSS', () => {
      for (const t of TOKENS_REMOVIDOS_NA_Q3) expect(claro).not.toHaveProperty(t);
      const usos = arquivosCss(path.join(import.meta.dirname, '..', 'src')).flatMap((arquivo) =>
        readFileSync(arquivo, 'utf8')
          .split('\n')
          .flatMap((linha, i) =>
            TOKENS_REMOVIDOS_NA_Q3.filter((t) => new RegExp(`--${t}(?![\\w-])`).test(linha)).map(
              (t) => `${path.basename(arquivo)}:${i + 1} --${t}`,
            ),
          ),
      );
      expect(usos).toEqual([]);
    });
  });
});
