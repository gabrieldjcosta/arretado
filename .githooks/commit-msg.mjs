// Commit só passa com `npm run check` verde; mensagem "wip:" salva progresso sem o check
// (o merge na integracao continua exigindo CI verde).
import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const msg = readFileSync(process.argv[2], 'utf8');
if (/^wip:/i.test(msg.trim())) process.exit(0);

mkdirSync('.claude/tmp', { recursive: true });
const r = spawnSync('npm run check > .claude/tmp/check.txt 2>&1', { shell: true });
if (r.status !== 0) {
  console.error(
    'npm run check falhou; commit bloqueado. Saída em .claude/tmp/check.txt (filtre, não despeje).',
  );
  process.exit(1);
}
