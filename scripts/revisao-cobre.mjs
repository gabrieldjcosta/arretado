// A revisão (da Marca ou de outro revisor) vale para o SHA que ela viu. Antes de mesclar um PR de tela,
// a Fila confere se o que entrou depois desse SHA mexe na cara do app. Caso do #424 (05/11/2026): a
// Marca revisou um commit e o dono mudou a tela depois.
//
// Uso:  npm run revisao:cobre -- <sha-revisado> [<head>=HEAD] [<base>=origin/integracao]
// Sai 0 quando a revisão cobre o head; 1 quando há mudança de tela depois dela (lista os arquivos).
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// O que muda a cara do app: CSS, componentes, páginas, imagens e o mockup de referência.
export const TELA =
  /^(src\/.*\.(css|tsx)|public\/.*\.(svg|png|webp|html)|index\.html|docs\/design\/fio\/.*)$/;

/** Arquivos de tela mudados depois da revisão que são do próprio PR (não os que vieram da base). */
export function telaDepois(mudadosDepois, doPr) {
  const meus = new Set(doPr);
  return mudadosDepois.filter((f) => TELA.test(f) && meus.has(f));
}

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const linhas = (s) => s.split('\n').filter(Boolean);

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [revisado, head = 'HEAD', base = 'origin/integracao'] = process.argv.slice(2);
  if (!revisado) {
    console.error('Uso: npm run revisao:cobre -- <sha-revisado> [head] [base]');
    process.exit(2);
  }
  try {
    execSync(`git merge-base --is-ancestor ${revisado} ${head}`);
  } catch {
    console.log(
      `✗ ${revisado} não é ancestral de ${head} (reescrito ou SHA errado): peça nova revisão.`,
    );
    process.exit(1);
  }
  const depois = linhas(sh(`git diff --name-only ${revisado} ${head}`));
  const doPr = linhas(sh(`git diff --name-only ${base}...${head}`));
  const tela = telaDepois(depois, doPr);
  const commits = sh(`git log --no-merges --format="%h %s" ${revisado}..${head}`);
  if (!tela.length) {
    console.log(`✓ A revisão de ${revisado} cobre ${head}: nada de tela mudou depois dela.`);
    if (commits) console.log(`Commits depois (sem tela):\n${commits}`);
    process.exit(0);
  }
  console.log(
    `✗ Mudou tela depois da revisão de ${revisado}:\n${tela.join('\n')}\n\nCommits:\n${commits}`,
  );
  process.exit(1);
}
