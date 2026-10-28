// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { lerTemas, medir, razao } from './contraste.mjs';

/**
 * Os tokens que saíram, por identidade e por fase: a verde-oliva saiu na fundação do redesenho v2; a paleta
 * da D-D5 (creme, marinho, sol) e os seus aliases saíram com o Ponto de luz (D-D7); a paleta da D-D7
 * (areia, cal, vidro, noite-*) saiu com "Tinta e noite" (D-D9). Dentro da D-D9: a Q3 tirou a borda
 * transparente da folha do Agora (`--bloco-borda`); a Q4 trocou `--caneta-*` por `--pen-*` e tirou o
 * caramelo; a Q7 tirou `--atual-*` (a aba e a seção atuais usam os papéis `--superficie` e o contorno do
 * controle), `--sombra-flutuante` (as camadas que flutuam perderam a sombra: o contrato só dá profundidade
 * à sombra dura do botão de dia), `--raio-pilula` e `--ponto-nucleo`; a Q8 tirou `--quente`, o apelido de
 * `--superficie-2` que já não tinha uso. `tinta`, `tinta-2` e `luz` voltam com outro sentido e não
 * estão aqui. A varredura casa o nome inteiro (`--cal` não pega `--calha-estrela`).
 */
const TOKENS_REMOVIDOS = [
  // Antes da D-D9
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
  // Q3
  'bloco-borda',
  // Q4
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
  // Q7
  'atual-fundo',
  'atual-texto',
  'atual-sombra',
  'sombra-flutuante',
  'raio-pilula',
  'ponto-nucleo',
  // Q8
  'quente',
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
  'sombra-folha': 'inset 0 0 0 1px var(--linha)',
  'peso-titulo-folha': '800',
  'espaco-titulo-folha': '-0.02em',
};
const CONTROLES_DA_NOITE = {
  'aperto-botao': 'scale(0.975)',
  'sombra-botao-aperto': 'none',
  'sombra-folha': 'inset 0 0 0 1px var(--n-borda)',
  'peso-titulo-folha': '600',
  'espaco-titulo-folha': '-0.005em',
};
/** A forma do ponto do Dia (Q3): uma máscara para o anel e uma para cada estado com miolo (atual, feito). */
const FORMAS_DO_PONTO = ['forma-ponto-anel', 'forma-ponto-atual', 'forma-ponto-feito'];

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
/**
 * O Hoje (D-D9, Q5): a faixa e o ponto da linha de parada só existem de dia (1 e 0), e o rótulo do "Em
 * seguida" é o título de dia (Schibsted, 15 px) e a interface à noite (Atkinson, 14 px), como no contrato.
 */
const HOJE_DO_DIA = {
  'marca-da-parada': '1',
  'fonte-rotulo': 'var(--fonte-titulo)',
  'tamanho-rotulo': '0.9375rem',
};
const HOJE_DA_NOITE = {
  'marca-da-parada': '0',
  'fonte-rotulo': 'var(--fonte-interface)',
  'tamanho-rotulo': '0.875rem',
};
/** Os tokens que existem nos três blocos de tema: a forma, a casca, o hover da ação e a fonte do título. */
const TOKENS_POR_MUNDO = [
  ...Object.keys(FORMA_DO_DIA),
  ...Object.keys(CASCA_DO_DIA),
  'acao-hover',
  'fonte-titulo',
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

/**
 * O néon suave e o Zé (D-D10): o brilho é azul piscina nos dois mundos; de dia não deixa nada em repouso
 * (0,16 só no Zé) e à noite deixa 30% (32% no Zé). A linha do Zé é branca; a faixa de dia afunda a 32 e 24 px.
 * O ponto da flor é amarelo e igual nos dois mundos.
 */
const ZE_DO_DIA = {
  'neon-cor': '#39caef',
  'neon-aceso': '0.55',
  'neon-repouso': '0',
  'z-nucleo': '#ffffff',
  'z-banda': '#39caef',
  'z-banda-p': '#0e93b4',
  'z-miolo': '#39caef',
  'z-olho': 'var(--tinta)',
  'z-olho-halo': 'transparent',
  'z-haste': 'var(--tinta)',
  'z-bochecha': '#ec5675',
  'z-bochecha-op': '0.85',
  'z-bloom-aceso': '0.55',
  'z-bloom-repouso': '0.16',
  'z-dia': 'inline',
  'z-noite': 'none',
  'z-ponto': '#ffc53d',
  'z-ponto-brilho': '#ffc53d',
};
/** O que a noite troca; o resto (a cor do brilho, a linha, o miolo, a faixa e o ponto) é o mesmo e fica só na raiz. */
const ZE_DA_NOITE = {
  'neon-aceso': '0.6',
  'neon-repouso': '0.3',
  'z-banda-p': '#39caef',
  'z-olho': '#ffffff',
  'z-olho-halo': '#39caef',
  'z-haste': '#ffffff',
  'z-bochecha': '#ff86a6',
  'z-bochecha-op': '1',
  'z-bloom-aceso': '0.6',
  'z-bloom-repouso': '0.32',
  'z-dia': 'none',
  'z-noite': 'inline',
};
const ZE_IGUAL_NOS_DOIS_MUNDOS = [
  'neon-cor',
  'z-nucleo',
  'z-banda',
  'z-miolo',
  'z-ponto',
  'z-ponto-brilho',
];
/**
 * Os únicos CSS que podem falar de `neon` ou `bloom`: os tokens (`estilos.css`) e os arquivos dos traços
 * que a caneta desenha: o Zé, a escrita do nome, o traço de seleção e o quadro do cacto (e, quando
 * entrar, os ícones do Passeio). Botão, texto, cartão, borda e ícone parado não brilham.
 */
const CSS_COM_NEON = [
  'estilos.css',
  'ze.css',
  'escrita.css',
  'escrita-b.css',
  'traco.css',
  'quadro.css',
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

  it('a caneta e o quadro do cacto têm os tokens dos dois mundos nos três blocos (Q4)', () => {
    expect(claro).toMatchObject(CANETA_DO_DIA);
    for (const bloco of [escuroSistema, escuroManual]) expect(bloco).toMatchObject(CANETA_DA_NOITE);
  });

  it('o néon suave e o Zé têm os tokens dos dois mundos nos três blocos (D-D10)', () => {
    expect(claro).toMatchObject(ZE_DO_DIA);
    for (const bloco of [escuroSistema, escuroManual]) expect(bloco).toMatchObject(ZE_DA_NOITE);
  });

  it('o azul do brilho e o amarelo do ponto não mudam com o mundo: um valor só, na raiz', () => {
    for (const nome of ZE_IGUAL_NOS_DOIS_MUNDOS) {
      expect(escuroSistema, nome).not.toHaveProperty(nome);
      expect(escuroManual, nome).not.toHaveProperty(nome);
    }
    expect(claro['neon-cor']).toBe(claro['z-banda']);
  });

  it('a casca muda de um mundo para o outro como no contrato da D-D9 (Q2)', () => {
    expect(claro).toMatchObject(CASCA_DO_DIA);
    expect(escuroManual).toMatchObject(CASCA_DA_NOITE);
  });

  it('a linha de parada e o rótulo do "Em seguida" mudam de mundo nos três blocos (Q5)', () => {
    expect(claro).toMatchObject(HOJE_DO_DIA);
    for (const bloco of [escuroSistema, escuroManual]) expect(bloco).toMatchObject(HOJE_DA_NOITE);
  });

  it('os tokens que saíram não existem nem são usados em nenhum CSS', () => {
    const removidos = TOKENS_REMOVIDOS;
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
  });

  describe('varredura das telas (D-D9, Q7)', () => {
    const css = () => arquivosCss(path.join(import.meta.dirname, '..', 'src'));

    it('nenhum CSS usa raio de pílula: a forma vem dos tokens de raio de cada mundo', () => {
      const pilulas = css().flatMap((arquivo) =>
        readFileSync(arquivo, 'utf8')
          .split('\n')
          .flatMap((linha, i) =>
            /border-radius:\s*\d{3,}px/.test(linha) ? [`${path.basename(arquivo)}:${i + 1}`] : [],
          ),
      );
      expect(pilulas).toEqual([]);
    });

    it('o brilho do néon só existe nos traços de caneta e nos tokens (D-D10)', () => {
      const usos = css()
        .filter((arquivo) => !CSS_COM_NEON.includes(path.basename(arquivo)))
        .flatMap((arquivo) =>
          readFileSync(arquivo, 'utf8')
            .split('\n')
            .flatMap((linha, i) =>
              /neon|bloom/i.test(linha) ? [`${path.basename(arquivo)}:${i + 1}`] : [],
            ),
        );
      expect(usos).toEqual([]);
    });

    it('nenhuma sombra tem desfoque: a profundidade é só a sombra dura do botão de dia', () => {
      // Cada `box-shadow` e cada `--sombra*` com um comprimento de desfoque (o terceiro) acima de zero.
      const comDesfoque = css().flatMap((arquivo) => {
        const texto = readFileSync(arquivo, 'utf8');
        return [...texto.matchAll(/(box-shadow|--sombra[\w-]*):\s*([^;]+);/g)].flatMap(
          ([, nome, valor]) =>
            (valor ?? '')
              .replace(/(rgb|rgba|color-mix|var)\([^)]*(\([^)]*\))?[^)]*\)/g, '')
              .split(',')
              .filter((camada) => {
                const medidas = camada.match(/-?[\d.]+(px|rem|em)?(?![\w%])/g) ?? [];
                return medidas.length >= 3 && parseFloat(medidas[2] ?? '0') > 0;
              })
              .map((camada) => `${path.basename(arquivo)} ${nome ?? ''}:${camada.trim()}`),
        );
      });
      expect(comDesfoque).toEqual([]);
    });
  });
});
