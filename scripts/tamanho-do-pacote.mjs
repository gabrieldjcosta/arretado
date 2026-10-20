// Falha se o build passar do teto de tamanho (gzip). Rodar depois de `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const PASTA = 'dist/assets';
const TETO_POR_ARQUIVO_KB = 200;
// 420 → 425 (Gabriel, 19/10/2026, #217): a integracao já estava em 419.
// 425 → 428 (Gabriel, 20/10/2026, Q6, a escrita do nome): o JS foi de 424,6 a 425,9 kB.
// 428 → 429 (Gabriel, 20/10/2026, Chegada e Entrada do Dia): o JS foi de 426,2 a 429,0 kB, 1,6 do
// conteúdo de partida (12 Citações e 12 dicas, baixado só quando a Entrada abre) e 1,1 do código.
// 429 → 431 (Gabriel, 20/10/2026, no mesmo PR): o #238 (exportação em Markdown e CSV) entrou na
// integracao antes e os dois somam 430,0 kB.
const TETO_TOTAL_KB = 431;
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
