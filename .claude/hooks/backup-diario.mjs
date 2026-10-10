// SessionStart: uma vez por dia, tag backup/AAAA-MM-DD no origin/main (só código; dados de estudo ficam no backup do app).
import { spawnSync } from 'node:child_process'

const sh = (c) => spawnSync(c, { shell: true, encoding: 'utf8' })
const hoje = new Date().toISOString().slice(0, 10)
const tag = `backup/${hoje}`
if (sh(`git ls-remote --tags origin refs/tags/${tag}`).stdout.trim()) process.exit(0)
if (sh('git fetch origin main').status !== 0) process.exit(0)
if (sh(`git tag ${tag} origin/main`).status === 0) {
  const p = sh(`git push origin ${tag}`)
  console.log(p.status === 0 ? `Backup do dia: tag ${tag}.` : `Tag ${tag} criada só localmente (push falhou).`)
}
