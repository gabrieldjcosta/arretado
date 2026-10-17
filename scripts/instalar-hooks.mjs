// Liga os hooks de .githooks no repositório (vale para todas as worktrees, que compartilham o .git/config).
import { execSync } from 'node:child_process';

execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
console.log('Hooks ativos: core.hooksPath = .githooks');
