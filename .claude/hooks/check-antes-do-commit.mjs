// PreToolUse (Bash): `git commit` só passa com `npm run check` verde.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const entrada = JSON.parse(readFileSync(0, 'utf8'))
const cmd = String(entrada.tool_input?.command ?? '')
if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0)

mkdirSync('.claude/tmp', { recursive: true })
const r = spawnSync('npm run check > .claude/tmp/check.txt 2>&1', { shell: true })
if (r.status !== 0) {
  console.error('npm run check falhou; commit bloqueado. Saída em .claude/tmp/check.txt (filtre, não despeje).')
  process.exit(2)
}
