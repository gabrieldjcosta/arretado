import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { consolidar, incorporar } from './entradas.mjs';
import { achados, termosDe } from './licoes.mjs';
import { telaDepois } from './revisao-cobre.mjs';

// Ferramentas da estratégia de desenvolvimento (docs/planos/estrategia-de-desenvolvimento.md).

describe('licoes', () => {
  it('procura pelo nome do arquivo e, se o nome é genérico, pela pasta junto', () => {
    expect(termosDe('src/apresentacao/fio/mockup/ajustes.css')).toEqual(['ajustes.css']);
    expect(termosDe('docs/design/biblioteca/index.html')).toEqual(['biblioteca/index.html']);
    expect(termosDe('Leitor.tsx')).toEqual(['Leitor.tsx']);
  });

  it('agrupa os achados pela seção e mostra a linha da tabela por inteiro', () => {
    const texto = [
      '# Registro',
      '## Seção A',
      'mexer em ajustes.css quebra',
      'de novo ajustes.css',
      '## Seção B',
      '| 04/11 | Tela | ajustes.css leva o desvio | x |',
      'nada aqui',
    ].join('\n');
    expect(achados(texto, 'ajustes.css')).toEqual([
      { linha: 2, rotulo: 'Seção A', mencoes: 2 },
      { linha: 6, rotulo: '04/11 Tela ajustes.css leva o desvio x', mencoes: 1 },
    ]);
    expect(achados(texto, 'Leitor.tsx')).toEqual([]);
  });
});

describe('entradas', () => {
  it('na tabela, entra depois da última linha da tabela, antes do texto que a segue', () => {
    const registro = '# D\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nNota final.\n';
    expect(incorporar(registro, '| 3 | 4 |\n', 'tabela')).toBe(
      '# D\n\n| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n\nNota final.\n',
    );
    expect(() => {
      incorporar(registro, '| 3 | 4 |\ntexto solto', 'tabela');
    }).toThrow(/fora da tabela/);
  });

  it('nos outros registros, entra no fim', () => {
    expect(incorporar('# G\n\nlinha\n\n', '\uFEFF## Nova\ntexto\n', 'fim')).toBe(
      '# G\n\nlinha\n\n## Nova\ntexto\n',
    );
  });

  it('consolida em ordem de data e apaga as entradas', () => {
    const raiz = mkdtempSync(path.join(tmpdir(), 'entradas-'));
    mkdirSync(path.join(raiz, 'docs/entradas/glossario'), { recursive: true });
    writeFileSync(path.join(raiz, 'docs/glossario.md'), '# Glossário\n');
    writeFileSync(path.join(raiz, 'docs/entradas/glossario/2026-11-06-b.md'), 'segunda\n');
    writeFileSync(path.join(raiz, 'docs/entradas/glossario/2026-11-05-a.md'), 'primeira\n');
    expect(consolidar(raiz, { seco: true })).toHaveLength(1);
    expect(readdirSync(path.join(raiz, 'docs/entradas/glossario'))).toHaveLength(2);
    consolidar(raiz);
    expect(readFileSync(path.join(raiz, 'docs/glossario.md'), 'utf8')).toBe(
      '# Glossário\n\nprimeira\n\nsegunda\n',
    );
    expect(readdirSync(path.join(raiz, 'docs/entradas/glossario'))).toEqual([]);
  });

  it('recusa nome fora do padrão, para nada ficar esquecido na pasta', () => {
    const raiz = mkdtempSync(path.join(tmpdir(), 'entradas-'));
    mkdirSync(path.join(raiz, 'docs/entradas/desvios'), { recursive: true });
    writeFileSync(path.join(raiz, 'docs/design-desvios.md'), '');
    writeFileSync(path.join(raiz, 'docs/entradas/desvios/sem-data.md'), '| x |');
    expect(() => {
      consolidar(raiz);
    }).toThrow(/fora do padrão/);
  });
});

describe('revisao-cobre', () => {
  it('só conta arquivo de tela que o próprio PR muda', () => {
    const depois = ['src/a/ajustes.css', 'src/b/Outro.tsx', 'docs/x.md', 'src/c/logica.ts'];
    const doPr = ['src/a/ajustes.css', 'docs/x.md', 'src/c/logica.ts'];
    expect(telaDepois(depois, doPr)).toEqual(['src/a/ajustes.css']);
    expect(telaDepois(['docs/x.md', 'src/c/logica.ts'], doPr)).toEqual([]);
  });
});
