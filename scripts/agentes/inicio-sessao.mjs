// Hook SessionStart do Claude Code (T19). Na nuvem (contêiner novo a cada sessão), instala
// as dependências quando faltam, para o `npm run check` rodar. No computador do Gabriel não
// faz nada: lá o `node_modules` já existe e instalar sem pedir atrapalharia.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const raiz = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
if (process.env.CLAUDE_CODE_REMOTE === 'true' && !existsSync(join(raiz, 'node_modules'))) {
  execSync('npm ci --no-audit --no-fund', { cwd: raiz, stdio: ['ignore', 'ignore', 'inherit'] });
  process.stdout.write('Dependências instaladas (npm ci).\n');
}
