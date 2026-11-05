// Entradas novas dos registros que crescem por acréscimo (desvios, decisões de design, glossário e
// soluções de problemas) vão num arquivo próprio em docs/entradas/<destino>/, e não no fim do
// registro: dois PRs que acrescentam no mesmo fim davam conflito no GitHub (30 de 38 merges de
// manutenção de 03 a 05/11/2026). Uma vez por dia, quem leva a integracao ao main consolida.
//
// Uso:  npm run entradas:consolidar            (acrescenta cada entrada ao registro e apaga o arquivo)
//       npm run entradas:consolidar -- --seco  (só mostra o que faria)
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DESTINOS = {
  desvios: { arquivo: 'docs/design/desvios.md', modo: 'tabela' },
  'decisoes-design': { arquivo: 'docs/design/decisoes-design.md', modo: 'fim' },
  glossario: { arquivo: 'docs/glossario.md', modo: 'fim' },
  'solucao-de-problemas': { arquivo: 'docs/solucao-de-problemas.md', modo: 'fim' },
};

// AAAA-MM-DD-<nome>.md: a data põe as entradas em ordem; o resto do nome só evita colisão.
export const NOME_DE_ENTRADA = /^\d{4}-\d{2}-\d{2}-[\w.-]+\.md$/;

/** Acrescenta uma entrada ao texto do registro. Tabela: depois da última linha da tabela. */
export function incorporar(registro, entrada, modo) {
  const corpo = entrada.replace(/^\uFEFF/, '').trim();
  if (!corpo) return registro;
  if (modo === 'tabela') {
    const linhas = registro.split('\n');
    let ultima = -1;
    linhas.forEach((l, i) => {
      if (l.trimStart().startsWith('|')) ultima = i;
    });
    if (ultima < 0) throw new Error('registro sem tabela');
    const fora = corpo.split('\n').find((l) => l.trim() && !l.trimStart().startsWith('|'));
    if (fora) throw new Error(`entrada de tabela com linha fora da tabela: "${fora.slice(0, 60)}"`);
    linhas.splice(ultima + 1, 0, ...corpo.split('\n'));
    return linhas.join('\n');
  }
  return `${registro.replace(/\s*$/, '')}\n\n${corpo}\n`;
}

export function consolidar(raiz, { seco = false } = {}) {
  const feito = [];
  for (const [destino, { arquivo, modo }] of Object.entries(DESTINOS)) {
    const pasta = path.join(raiz, 'docs/entradas', destino);
    if (!existsSync(pasta)) continue;
    const nomes = readdirSync(pasta).sort();
    const invalidos = nomes.filter((n) => n.endsWith('.md') && !NOME_DE_ENTRADA.test(n));
    if (invalidos.length)
      throw new Error(
        `nome fora do padrão AAAA-MM-DD-nome.md em ${destino}: ${invalidos.join(', ')}`,
      );
    const entradas = nomes.filter((n) => NOME_DE_ENTRADA.test(n));
    if (!entradas.length) continue;
    const alvo = path.join(raiz, arquivo);
    let texto = readFileSync(alvo, 'utf8');
    for (const n of entradas)
      texto = incorporar(texto, readFileSync(path.join(pasta, n), 'utf8'), modo);
    if (!seco) {
      writeFileSync(alvo, texto);
      for (const n of entradas) rmSync(path.join(pasta, n));
    }
    feito.push(`${arquivo}: ${entradas.length} entrada(s) (${entradas.join(', ')})`);
  }
  return feito;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const seco = process.argv.includes('--seco');
  const feito = consolidar(raiz, { seco });
  console.log(
    feito.length
      ? `${seco ? 'Faria' : 'Feito'}:\n${feito.join('\n')}`
      : 'Nenhuma entrada a consolidar.',
  );
}
