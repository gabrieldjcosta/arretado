// Portão local para QUALQUER agente (Claude, Gemini, Antigravity, OpenCode, DeepSeek, Hermes) e para humanos.
// Espelha .claude/hooks, que só valem para o Claude Code. Instalação: npm run hooks:instalar
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const git = (c) => execSync(`git ${c}`, { encoding: 'utf8' }).trim();
const ramo = git('rev-parse --abbrev-ref HEAD');
const emMerge = existsSync(git('rev-parse --git-path MERGE_HEAD'));

if ((ramo === 'main' || ramo === 'integracao') && !emMerge) {
  console.error(
    `Commit direto em "${ramo}" é proibido. Trabalhe em claude/<atividade> e abra PR para a integracao.`,
  );
  process.exit(1);
}
