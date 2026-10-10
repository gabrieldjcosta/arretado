// Stop: não encerra com código alterado e `npm run check` vermelho. Guarda contra laço infinito.
import { readFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const entrada = JSON.parse(readFileSync(0, 'utf8'))
if (entrada.stop_hook_active) process.exit(0)
const alterado = spawnSync('git status --porcelain -- src tests scripts e2e', { shell: true, encoding: 'utf8' }).stdout.trim()
if (!alterado) process.exit(0)
mkdirSync('.claude/tmp', { recursive: true })
const r = spawnSync('npm run check > .claude/tmp/check.txt 2>&1', { shell: true })
if (r.status !== 0) {
  console.error('npm run check está vermelho com alterações pendentes. Corrija (saída em .claude/tmp/check.txt) antes de encerrar.')
  process.exit(2)
}
