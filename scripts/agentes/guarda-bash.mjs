// Hook PreToolUse do Claude Code para Bash (T19). Lê a chamada em JSON pela entrada padrão
// e sai com código 2 (o Claude Code bloqueia e mostra o motivo ao agente) quando o comando
// fere uma trava de `guarda.mjs`: push no main, push forçado, merge, Supabase remoto, rm -rf.
import { execFileSync } from 'node:child_process';
import { avaliarComando } from './guarda.mjs';
import { lerEntrada } from './entrada.mjs';

function ramoAtual(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

const chamada = await lerEntrada();
const comando = chamada?.tool_input?.command;
if (typeof comando === 'string') {
  const decisao = avaliarComando(comando, { ramoAtual: ramoAtual(chamada.cwd ?? process.cwd()) });
  if (decisao.bloquear) {
    process.stderr.write(`Bloqueado pela trava do Arretado: ${decisao.motivo}\n`);
    process.exit(2);
  }
}
