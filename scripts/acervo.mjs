// Ponto de entrada do pipeline do acervo: empacota `scripts/acervo/cli.ts` com o Vite (SSR) numa
// pasta temporária e o executa. As dependências (jsdom, zod, dompurify) vêm do node_modules.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const entrada = fileURLToPath(new URL('./acervo/cli.ts', import.meta.url));
// Dentro do repositório, para o Node achar o node_modules das dependências externas.
const base = fileURLToPath(new URL('../node_modules/.cache/acervo/', import.meta.url));
mkdirSync(base, { recursive: true });
const pasta = mkdtempSync(join(base, 'cli-'));
try {
  await build({
    configFile: false,
    logLevel: 'error',
    build: {
      ssr: entrada,
      outDir: pasta,
      emptyOutDir: true,
      target: 'node22',
      rollupOptions: { output: { entryFileNames: 'cli.mjs', format: 'es' } },
    },
    ssr: { noExternal: [] },
  });
  const r = spawnSync(process.execPath, [join(pasta, 'cli.mjs'), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, ACERVO_RAIZ: fileURLToPath(new URL('..', import.meta.url)) },
  });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
