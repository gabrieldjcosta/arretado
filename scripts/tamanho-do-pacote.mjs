// Falha se o build passar do teto de tamanho (gzip). Rodar depois de `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const PASTA = 'dist/assets';
const TETO_POR_ARQUIVO_KB = 200;
// O teto do JS mora em scripts/tetos-do-pacote.json (uma linha; o histórico de cada alta, com o motivo,
// está no git log dele), para que dois PRs que mexem no teto não briguem pelo mesmo bloco de comentário.
const TETOS = JSON.parse(readFileSync('scripts/tetos-do-pacote.json', 'utf8'));
const TETO_TOTAL_KB = TETOS.totalKb;
// O que a pessoa baixa para abrir o app: o módulo de entrada e os que o index.html pré-carrega
// (React, Dexie, zod, modelo…). As telas sob demanda (Leitor, Importar, Mapa, Supabase) ficam fora
// desta soma, mas continuam na total: mover código para carregamento sob demanda não abre folga no teto
// total, só no do início.
const TETO_INICIO_KB = TETOS.inicioKb;
const html = readFileSync('dist/index.html', 'utf8');
const doInicio = new Set(
  [...html.matchAll(/(?:src|href)="\.\/assets\/([^"]+\.js)"/g)].map((m) => m[1]),
);
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
let inicio = 0;
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
  if (doInicio.has(f)) inicio += kb;
  if (kb > TETO_POR_ARQUIVO_KB)
    falhas.push(`${f}: ${kb.toFixed(0)} kB gzip (teto ${TETO_POR_ARQUIVO_KB})`);
}
console.log(
  `JS do app: ${total.toFixed(0)} kB gzip (teto ${TETO_TOTAL_KB}); início: ${inicio.toFixed(0)} kB gzip em ${String(doInicio.size)} arquivos (teto ${TETO_INICIO_KB}); catálogo: ${catalogo.toFixed(0)} kB gzip (teto ${TETO_CATALOGO_KB}), em ${arquivos.length} arquivos.`,
);
if (catalogo > TETO_CATALOGO_KB)
  falhas.push(`catálogo: ${catalogo.toFixed(0)} kB gzip (teto ${TETO_CATALOGO_KB})`);
if (inicio > TETO_INICIO_KB)
  falhas.push(`início: ${inicio.toFixed(0)} kB gzip (teto ${TETO_INICIO_KB})`);
if (total > TETO_TOTAL_KB)
  falhas.push(`total: ${total.toFixed(0)} kB gzip (teto ${TETO_TOTAL_KB})`);
if (falhas.length > 0) {
  console.error(`Pacote acima do teto:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
