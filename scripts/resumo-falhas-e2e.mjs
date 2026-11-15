// Lê o JSON do Playwright e imprime as falhas agrupadas pela primeira linha do erro (o CI do WebKit
// gera um relatório de centenas de MB que a nuvem não consegue baixar). Do primeiro teste de cada
// grupo sai a mensagem inteira (até 14 linhas).
import { readFileSync } from 'node:fs';

// eslint-disable-next-line no-control-regex
const limpa = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');
const grupos = new Map();
const visita = (suite) => {
  for (const filho of suite.suites ?? []) visita(filho);
  for (const spec of suite.specs ?? []) {
    for (const teste of spec.tests ?? []) {
      const ultimo = teste.results?.at(-1);
      if (!ultimo || ['passed', 'skipped'].includes(ultimo.status)) continue;
      const erro = limpa(ultimo.error?.message ?? ultimo.status);
      const chave = erro.split('\n')[0].slice(0, 120);
      const g = grupos.get(chave) ?? { erro, testes: [] };
      g.testes.push(`${spec.file}:${String(spec.line)} ${spec.title.slice(0, 60)}`);
      grupos.set(chave, g);
    }
  }
};
const relatorio = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const s of relatorio.suites ?? []) visita(s);
for (const [chave, { erro, testes }] of [...grupos].sort(
  (a, b) => b[1].testes.length - a[1].testes.length,
)) {
  console.log(`\n== ${String(testes.length)}x ${chave}`);
  for (const t of testes.slice(0, 4)) console.log(`   ${t}`);
  console.log(
    erro
      .split('\n')
      .slice(0, 14)
      .map((l) => `   | ${l}`)
      .join('\n'),
  );
}
