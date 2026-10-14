// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { lerTemas, medir, razao } from './contraste.mjs';

/** Tokens da identidade anterior (verde-oliva): saíram do app na fundação do redesenho v2. */
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

  it('os tokens da identidade anterior não existem nem são usados em nenhum CSS', () => {
    for (const t of TOKENS_REMOVIDOS) expect(claro).not.toHaveProperty(t);
    const usos = arquivosCss(path.join(import.meta.dirname, '..', 'src')).flatMap((arquivo) =>
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .flatMap((linha, i) =>
          TOKENS_REMOVIDOS.filter((t) => linha.includes(`--${t}`)).map(
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
