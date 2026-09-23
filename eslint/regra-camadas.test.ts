import path from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import regraCamadas from './regra-camadas.js';

const raiz = path.resolve(import.meta.dirname, '..');

// Configuração mínima, sem análise de tipos, para testar só a regra.
const eslint = new ESLint({
  cwd: raiz,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: { parser: tseslint.parser },
      plugins: { arretado: { rules: { camadas: regraCamadas } } },
      rules: { 'arretado/camadas': 'error' },
    },
  ],
});

async function mensagens(arquivo: string, codigo: string): Promise<string[]> {
  const [resultado] = await eslint.lintText(codigo, { filePath: path.join(raiz, arquivo) });
  const todas = resultado?.messages ?? [];
  const fatais = todas.filter((m) => m.fatal);
  if (fatais.length > 0) throw new Error(fatais.map((m) => m.message).join('\n'));
  return todas.filter((m) => m.ruleId === 'arretado/camadas').map((m) => m.message);
}

describe('regra de camadas (Parte 1 §6)', () => {
  it('está ativa na configuração do projeto', async () => {
    const config = (await new ESLint({ cwd: raiz }).calculateConfigForFile(
      path.join(raiz, 'src/dominios/recall/servico.ts'),
    )) as { rules: Record<string, unknown> };
    expect(config.rules['arretado/camadas']).toEqual([2]);
  });

  it('domínio não importa outro domínio', async () => {
    const m = await mensagens(
      'src/dominios/recall/servico.ts',
      "import { x } from '../plano/servico';\nexport const y = x;\n",
    );
    expect(m).toHaveLength(1);
  });

  it('domínio não importa apresentação', async () => {
    const m = await mensagens(
      'src/dominios/recall/servico.ts',
      "import { App } from '../../apresentacao/App';\nexport const y = App;\n",
    );
    expect(m).toHaveLength(1);
  });

  it('domínio importa core e a si mesmo', async () => {
    const m = await mensagens(
      'src/dominios/recall/servico.ts',
      "import { a } from '../../core/ids';\nimport { b } from './agendamento';\nexport const y = [a, b];\n",
    );
    expect(m).toHaveLength(0);
  });

  it('core não importa domínio', async () => {
    const m = await mensagens(
      'src/core/persistencia/banco.ts',
      "import { x } from '../../dominios/recall/servico';\nexport const y = x;\n",
    );
    expect(m).toHaveLength(1);
  });

  it('suporte não importa domínio', async () => {
    const m = await mensagens(
      'src/suporte/relato.ts',
      "import { x } from '../dominios/recall/servico';\nexport const y = x;\n",
    );
    expect(m).toHaveLength(1);
  });

  it('Dexie só dentro de core/persistencia', async () => {
    const fora = await mensagens(
      'src/dominios/recall/servico.ts',
      "import Dexie from 'dexie';\nexport const d = Dexie;\n",
    );
    const dentro = await mensagens(
      'src/core/persistencia/banco.ts',
      "import Dexie from 'dexie';\nexport const d = Dexie;\n",
    );
    expect(fora).toHaveLength(1);
    expect(dentro).toHaveLength(0);
  });

  it('DOMPurify só dentro de core/seguranca', async () => {
    const m = await mensagens(
      'src/apresentacao/Leitor.tsx',
      "import DOMPurify from 'dompurify';\nexport const d = DOMPurify;\n",
    );
    expect(m).toHaveLength(1);
  });
});

describe('utilitários de teste', () => {
  it('só testes importam src/testes', async () => {
    const codigo = "import { r } from '../../testes/repositorio';\nexport const y = r;\n";
    expect(await mensagens('src/core/persistencia/x.test.ts', codigo)).toHaveLength(0);
    expect(await mensagens('src/core/persistencia/x.ts', codigo)).toHaveLength(1);
  });
});
