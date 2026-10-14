// Falha se o build passar do teto de tamanho (gzip). Rodar depois de `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const PASTA = 'dist/assets';
const TETO_POR_ARQUIVO_KB = 200;
const TETO_TOTAL_KB = 420;

const arquivos = readdirSync(PASTA).filter((f) => f.endsWith('.js'));
if (arquivos.length === 0) {
  console.error(`Nenhum .js em ${PASTA}; rode "npm run build" antes.`);
  process.exit(1);
}
let total = 0;
const falhas = [];
for (const f of arquivos) {
  const kb = gzipSync(readFileSync(`${PASTA}/${f}`)).length / 1024;
  total += kb;
  if (kb > TETO_POR_ARQUIVO_KB)
    falhas.push(`${f}: ${kb.toFixed(0)} kB gzip (teto ${TETO_POR_ARQUIVO_KB})`);
}
console.log(
  `JS total: ${total.toFixed(0)} kB gzip em ${arquivos.length} arquivos (teto ${TETO_TOTAL_KB}).`,
);
if (total > TETO_TOTAL_KB)
  falhas.push(`total: ${total.toFixed(0)} kB gzip (teto ${TETO_TOTAL_KB})`);
if (falhas.length > 0) {
  console.error(`Pacote acima do teto:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
