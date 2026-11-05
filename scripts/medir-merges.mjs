// Mede os merges de manutenção (a integracao trazida para dentro de um branch) desde uma data:
// quantos, quantos com conflito de texto e em que arquivos. Medida da estratégia de desenvolvimento
// (docs/planos/estrategia-de-desenvolvimento.md). Conflito "como o GitHub vê": sem o merge=union.
//
// Uso:  node scripts/medir-merges.mjs 2026-11-06 [origin/integracao]
import { execFileSync, spawnSync } from 'node:child_process';

const [desde, ramo = 'origin/integracao'] = process.argv.slice(2);
if (!desde || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || ramo.startsWith('-')) {
  console.error('Uso: node scripts/medir-merges.mjs AAAA-MM-DD [ramo]');
  process.exit(2);
}
// git sem shell: os argumentos vão como lista, nada do que se digita vira comando.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const linhas = (s) => s.split('\n').filter(Boolean);
// Árvore vazia como fonte de atributos: o merge-tree ignora o .gitattributes (merge=union), como o
// botão do GitHub.
const ARVORE_VAZIA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

const merges = linhas(git('rev-list', '--merges', `--since=${desde}`, ramo));
let prs = 0;
let manutencao = 0;
let comConflito = 0;
const porArquivo = new Map();
for (const c of merges) {
  if (git('log', '-1', '--format=%s', c).startsWith('Merge pull request')) {
    prs++;
    continue;
  }
  manutencao++;
  const r = spawnSync(
    'git',
    [
      '--attr-source',
      ARVORE_VAZIA,
      'merge-tree',
      '--write-tree',
      '--name-only',
      '--no-messages',
      `${c}^1`,
      `${c}^2`,
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 1) continue;
  comConflito++;
  for (const f of linhas(r.stdout).slice(1)) porArquivo.set(f, (porArquivo.get(f) ?? 0) + 1);
}
console.log(
  `Desde ${desde} em ${ramo}: ${prs} PRs mesclados, ${manutencao} merges de manutenção (${(manutencao / Math.max(prs, 1)).toFixed(2)} por PR), ${comConflito} com conflito.`,
);
for (const [f, n] of [...porArquivo].sort((a, b) => b[1] - a[1]).slice(0, 12))
  console.log(`  ${n}  ${f}`);
console.log(
  `Commits que citam desvio no título: ${linhas(git('log', '--no-merges', `--since=${desde}`, '--format=%s', ramo)).filter((s) => /desvio/i.test(s)).length}`,
);
