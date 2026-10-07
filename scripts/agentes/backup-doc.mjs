// Hook PreToolUse do Claude Code para Edit e Write (T19): antes da primeira modificação de
// um documento protegido em cada sessão, guarda cópia comprimida em `docs/_backups/`.
// Nunca bloqueia a edição: falha no backup só é avisada.
import { fazerBackup } from './guarda.mjs';
import { lerEntrada } from './entrada.mjs';

const chamada = await lerEntrada();
const arquivo = chamada?.tool_input?.file_path;
if (typeof arquivo === 'string') {
  const raiz = process.env.CLAUDE_PROJECT_DIR ?? chamada.cwd ?? process.cwd();
  try {
    const resultado = await fazerBackup({ raiz, arquivo, sessao: chamada.session_id });
    if ('gravado' in resultado) process.stderr.write(`Backup: ${resultado.gravado}\n`);
  } catch (erro) {
    process.stderr.write(`Backup falhou (edição segue): ${String(erro)}\n`);
  }
}
