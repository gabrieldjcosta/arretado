// Lista o que a `integracao` tem a mais que o `main` (um merge commit por atividade).
// Para tirar uma atividade ruim sem perder as outras: git revert -m 1 <sha> (na integracao), antes do merge no main.
import { execSync } from 'node:child_process';

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
sh('git fetch origin main integracao');
const merges = sh(
  'git log origin/main..origin/integracao --merges --first-parent --format="%h %s"',
);
console.log(merges || 'Nada novo na integracao.');
console.log(
  '\nBackup mais recente:',
  sh('git branch -r --list "origin/backup/*" --sort=-refname').split('\n')[0] || '(nenhuma)',
);
