// PreToolUse (Bash|Read): bloqueia o que não pode acontecer, de forma determinística.
// Saída com código 2 = bloqueio; a mensagem de stderr volta para o Claude.
import { readFileSync } from 'node:fs'

const entrada = JSON.parse(readFileSync(0, 'utf8'))
const bloquear = (msg) => {
  console.error(msg)
  process.exit(2)
}

if (entrada.tool_name === 'Bash') {
  const cmd = String(entrada.tool_input?.command ?? '')
  // Só segmentos que começam por `git push` (evita falso positivo em texto de heredoc ou commit message).
  const pushes = cmd
    .split(/\n|&&|;|\|\|/)
    .map((s) => s.trim())
    .filter((s) => /^git\s+push\b/.test(s))
  for (const seg of pushes) {
    const tokens = seg.split(/\s+/).slice(2)
    const forca = tokens.some((t) => t === '-f' || t.startsWith('--force'))
    const destinos = tokens
      .filter((t) => !t.startsWith('-'))
      .map((t) => (t.includes(':') ? t.split(':').pop() : t).replace(/^refs\/heads\//, ''))
    if (destinos.includes('main') && !tokens.includes('--delete'))
      bloquear('Push direto no main é proibido: o merge no main é do Gabriel (fim do dia, via integracao).')
    if (forca && destinos.some((d) => d === 'main' || d === 'integracao'))
      bloquear('Force push em main/integracao é proibido.')
  }
  if (/^\s*git\s+reset\s+--hard\s+origin\/main/m.test(cmd))
    bloquear('Reset duro contra origin/main bloqueado; peça confirmação ao Gabriel.')
}

if (entrada.tool_name === 'Read') {
  const caminho = String(entrada.tool_input?.file_path ?? '')
  const limitado = entrada.tool_input?.limit != null
  if (/corpus\/normas\/[^/]+\.html$|package-lock\.json$|playwright-report\//.test(caminho) && !limitado)
    bloquear('Arquivo grande: use git grep, head ou Read com offset/limit (CLAUDE.md, economia de contexto).')
}
