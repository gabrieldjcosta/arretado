import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { bloco } from './css-bloco';

const SRC = path.join(import.meta.dirname, '..', 'src');
const anel = readFileSync(
  path.join(SRC, 'apresentacao', 'componentes', 'evidencia', 'evidencia.css'),
  'utf8',
);
const semComentarios = anel.replace(/\/\*[\s\S]*?\*\//g, '');

/** Cada regra de declarações do arquivo, sem os comentários: [seletor, corpo], com os espaços normalizados. */
function regras(css: string): Array<[string, string]> {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    ([, seletor, corpo]) => [
      (seletor ?? '').replace(/\s+/g, ' ').trim(),
      (corpo ?? '').replace(/\s+/g, ' ').trim(),
    ],
  );
}

/** Todos os arquivos com a extensão, abaixo da pasta, fora os testes. */
function arquivos(pasta: string, extensao: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(pasta, e.name);
    if (e.isDirectory()) return arquivos(caminho, extensao);
    return e.name.endsWith(extensao) && !/\.test\.tsx?$/.test(e.name) ? [caminho] : [];
  });
}

const quem = (texto: RegExp, extensao: string) =>
  arquivos(SRC, extensao)
    .filter((arquivo) => texto.test(readFileSync(arquivo, 'utf8')))
    .map((arquivo) => path.basename(arquivo))
    .sort();

// O jsdom não aplica o CSS: estas são as regras do anel de evidência (D-D13, contorno B do Gabriel) de
// que o repouso, o acender, o Calmo e as cores forçadas dependem, e a lista fechada de onde ele vale.
// Quem muda uma delas muda também o contrato do Zé (§8c).

describe('o anel de evidência: o que desenha', () => {
  it('a linha e a faixa são sombras duras, sem desfoque; só o halo é desfocado', () => {
    const [linha] = regras(anel).filter(
      ([seletor, corpo]) => seletor.endsWith('.evidencia-foco::after') && /box-shadow/.test(corpo),
    );
    if (linha === undefined) throw new Error('regra da linha não achada');
    const camadas = linha[1]
      .replace(/^box-shadow:\s*/, '')
      .replace(/;$/, '')
      .split(/,(?![^()]*\))/);
    expect(camadas).toHaveLength(2);
    for (const camada of camadas) {
      const medidas = camada.replace(/var\([^)]*\)/g, '').match(/-?[\d.]+(px|rem|em)?(?![\w%])/g);
      expect(parseFloat(medidas?.[2] ?? 'x'), camada).toBe(0);
    }
    const [halo] = regras(anel).filter(
      ([seletor, corpo]) => seletor.endsWith('.evidencia-foco::before') && /box-shadow/.test(corpo),
    );
    expect(halo?.[1]).toContain('opacity: var(--ev-halo-repouso);');
    expect(halo?.[1]).toMatch(/0 0 var\(--ev-halo-raio\) var\(--ev-halo-espalha\) rgb\(/);
  });

  it('não usa filtro, transição nem will-change: só a opacidade do halo anima', () => {
    expect(semComentarios).not.toMatch(
      /(?:^|[\s;{])(?:backdrop-filter|filter|transition|will-change)\s*:/,
    );
    for (const nome of ['ev-acende', 'ev-esmaece']) {
      const propriedades = [...bloco(anel, `@keyframes ${nome}`).matchAll(/([\w-]+)\s*:/g)].map(
        ([, p]) => p,
      );
      expect(new Set(propriedades), nome).toEqual(new Set(['opacity']));
    }
  });

  it('acende ao pico em 33% e assenta no repouso até 900 ms, uma vez', () => {
    expect(bloco(anel, '@keyframes ev-acende')).toBe(
      'from { opacity: 0; } 33% { opacity: var(--ev-halo-aceso); } to { opacity: var(--ev-halo-repouso); }',
    );
    const movimento = bloco(anel, '@media (prefers-reduced-motion: no-preference)');
    expect(movimento).toContain('animation: ev-acende 900ms cubic-bezier(0.2, 0.7, 0.2, 1);');
    // Sem `infinite`, `alternate` nem repetição: nunca pulsa.
    expect(semComentarios).not.toMatch(/infinite|iteration-count|alternate/);
  });

  it('o Calmo não acende: só esmaece o repouso em 240 ms', () => {
    const movimento = bloco(anel, '@media (prefers-reduced-motion: no-preference)');
    expect(movimento).toContain("html[data-perfil='calmo'] .acao-agora.evidencia::before");
    expect(movimento).toContain('animation: ev-esmaece 240ms ease-out;');
  });

  it('com o movimento reduzido não há animação: o repouso fica parado', () => {
    // Toda `animation` do arquivo está dentro do `no-preference`.
    const conta = (texto: string) => (texto.match(/animation\s*:/g) ?? []).length;
    const movimento = bloco(anel, '@media (prefers-reduced-motion: no-preference)');
    expect(conta(movimento)).toBeGreaterThan(0);
    expect(conta(semComentarios)).toBe(conta(movimento));
  });

  it('em cores forçadas o halo e a faixa somem e o cartão ganha uma borda de 2 px do sistema', () => {
    const forcado = bloco(anel, '@media (forced-colors: active)');
    expect(forcado).toContain('display: none;');
    expect(forcado).toContain('border: 2px solid Highlight;');
  });
});

describe('o anel de evidência: o contorno do cartão continua (WCAG 1.4.11)', () => {
  it('o Agora e o artigo do foco mantêm a borda da folha: quem dá o 3:1 é ela, não o anel', () => {
    const estilos = readFileSync(path.join(SRC, 'apresentacao', 'estilos.css'), 'utf8');
    for (const seletor of ['.acao-agora', '.cartao-artigo']) {
      expect(bloco(estilos, seletor), seletor).toContain('border: var(--borda-folha);');
    }
  });

  it('o anel nunca redefine a borda, a não ser em cores forçadas (onde ela vira Highlight)', () => {
    const bordas = (texto: string) =>
      (
        texto.match(
          /(?<![\w-])border(?:-(?:top|right|bottom|left))?(?:-(?:width|style|color))?\s*:/g,
        ) ?? []
      ).length;
    const forcado = bloco(anel, '@media (forced-colors: active)');
    expect(bordas(forcado)).toBeGreaterThan(0);
    expect(bordas(semComentarios)).toBe(bordas(forcado));
  });
});

describe('o anel de evidência: onde vale (lista fechada, D-D13)', () => {
  it('só o Agora do Hoje pede o anel: `emEvidencia` mora no cartão e em dois usos do Hoje', () => {
    expect(quem(/\bemEvidencia\b/, '.tsx')).toEqual([
      'AcaoAgora.tsx',
      'Agora.tsx',
      'RevisaoPorTempo.tsx',
    ]);
    expect(quem(/acao-agora evidencia/, '.tsx')).toEqual(['AcaoAgora.tsx']);
  });

  it('só o Leitor tem o envoltório do artigo em foco', () => {
    expect(quem(/\bevidencia-foco\b/, '.tsx')).toEqual(['Leitor.tsx']);
  });

  it('os tokens `--ev-*` só existem nos tokens do tema e no CSS do anel', () => {
    expect(quem(/--ev-/, '.css')).toEqual(['estilos.css', 'evidencia.css']);
    expect(quem(/--ev-/, '.tsx')).toEqual([]);
  });
});
