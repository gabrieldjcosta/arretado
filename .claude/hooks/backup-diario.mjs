// SessionStart: uma vez por dia, branch backup/AAAA-MM-DD apontando para o origin/main
// (só código; dados de estudo ficam no backup do app). Branch e não tag: o push de tag falha no proxy das sessões remotas.
import { spawnSync } from 'node:child_process'

const sh = (c) => spawnSync(c, { shell: true, encoding: 'utf8' })
const ref = `backup/${new Date().toISOString().slice(0, 10)}`
if (sh(`git ls-remote --heads origin refs/heads/${ref}`).stdout.trim()) process.exit(0)
if (sh('git fetch origin main').status !== 0) process.exit(0)
const p = sh(`git push origin origin/main:refs/heads/${ref}`)
console.log(p.status === 0 ? `Backup do dia: branch ${ref}.` : `Backup ${ref} falhou no push.`)
