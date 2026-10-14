// Falha se o build passar do teto de tamanho (gzip). Rodar depois de `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const PASTA = 'dist/assets';
const TETO_POR_ARQUIVO_KB = 200;
const TETO_TOTAL_KB = 420;
// Dados do catálogo de concursos (um bloco por carreira, baixado só quando a pessoa a escolhe no
// onboarding do plano): não entram no teto do app, mas têm teto próprio.
const TETO_POR_CARREIRA_KB = 400;
const TETO_CATALOGO_KB = 1000;
const slugsDoCatalogo = JSON.parse(
  readFileSync('corpus/catalogo/index.json', 'utf8'),
).carreiras.map((c) => c.slug);
const eDoCatalogo = (f) => slugsDoCatalogo.some((slug) => f.startsWith(`${slug}-`));

const arquivos = readdirSync(PASTA).filter((f) => f.endsWith('.js'));
if (arquivos.length === 0) {
  console.error(`Nenhum .js em ${PASTA}; rode "npm run build" antes.`);
  process.exit(1);
}
let total = 0;
let catalogo = 0;
const falhas = [];
for (const f of arquivos) {
  const kb = gzipSync(readFileSync(`${PASTA}/${f}`)).length / 1024;
  if (eDoCatalogo(f)) {
    catalogo += kb;
    if (kb > TETO_POR_CARREIRA_KB)
      falhas.push(`${f}: ${kb.toFixed(0)} kB gzip (teto da carreira ${TETO_POR_CARREIRA_KB})`);
    continue;
  }
  total += kb;
  if (kb > TETO_POR_ARQUIVO_KB)
    falhas.push(`${f}: ${kb.toFixed(0)} kB gzip (teto ${TETO_POR_ARQUIVO_KB})`);
}
console.log(
  `JS do app: ${total.toFixed(0)} kB gzip (teto ${TETO_TOTAL_KB}); catálogo: ${catalogo.toFixed(0)} kB gzip (teto ${TETO_CATALOGO_KB}), em ${arquivos.length} arquivos.`,
);
if (catalogo > TETO_CATALOGO_KB)
  falhas.push(`catálogo: ${catalogo.toFixed(0)} kB gzip (teto ${TETO_CATALOGO_KB})`);
if (total > TETO_TOTAL_KB)
  falhas.push(`total: ${total.toFixed(0)} kB gzip (teto ${TETO_TOTAL_KB})`);
if (falhas.length > 0) {
  console.error(`Pacote acima do teto:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
