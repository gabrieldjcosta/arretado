// Bloqueia push no main, force push e exclusão em main/integracao.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ZERO = /^0+$/;
const protegidos = new Set(['refs/heads/main', 'refs/heads/integracao']);
for (const linha of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
  const [, local, ref, remoto] = linha.split(' ');
  if (ref === 'refs/heads/main') {
    console.error(
      'Push direto no main é proibido: o merge no main é do Gabriel (via PR da integracao).',
    );
    process.exit(1);
  }
  if (!protegidos.has(ref)) continue;
  if (ZERO.test(local)) {
    console.error(`Excluir ${ref} é proibido.`);
    process.exit(1);
  }
  if (!ZERO.test(remoto)) {
    const ff = spawnSync('git', ['merge-base', '--is-ancestor', remoto, local]);
    if (ff.status !== 0) {
      console.error(`Force push (histórico reescrito) em ${ref} é proibido.`);
      process.exit(1);
    }
  }
}
