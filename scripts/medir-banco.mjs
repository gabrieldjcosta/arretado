// Mede um pacote .arretado SEM cifra (Conta › Dados › Exportar tudo, sem senha): registros e bytes por
// coleção, tamanho do log e o que pesa mais. Insumo da F4-A (A0): decide cota e custo antes de prometer limite.
// Uso: node scripts/medir-banco.mjs caminho/do/pacote.arretado
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

const caminho = process.argv[2];
if (!caminho) {
  console.error('Uso: node scripts/medir-banco.mjs caminho/do/pacote.arretado');
  process.exit(2);
}

const arquivos = unzipSync(new Uint8Array(readFileSync(caminho)));
if (arquivos['conteudo.cifrado']) {
  console.error('Pacote cifrado: exporte "Tudo" sem senha para medir (apague o arquivo depois).');
  process.exit(1);
}
const manifesto = arquivos['manifesto.json']
  ? JSON.parse(strFromU8(arquivos['manifesto.json']))
  : {};

const linhas = [];
let totalBytes = 0;
for (const [nome, bytes] of Object.entries(arquivos)) {
  totalBytes += bytes.length;
  if (nome.startsWith('dados/')) {
    const registros = JSON.parse(strFromU8(bytes));
    linhas.push({ item: nome.slice(6, -5), registros: registros.length, bytes: bytes.length });
  } else if (nome === 'log.json') {
    const log = JSON.parse(strFromU8(bytes));
    linhas.push({ item: 'LOG', registros: log.length, bytes: bytes.length });
  } else if (nome.startsWith('anexos/')) {
    linhas.push({ item: nome, registros: 1, bytes: bytes.length });
  }
}
linhas.sort((a, b) => b.bytes - a.bytes);

const mb = (n) => (n / 1048576).toFixed(2);
console.log(`Pacote: ${caminho}`);
console.log(
  `Esquema ${manifesto.versaoEsquema ?? '?'} · app ${manifesto.versaoApp ?? '?'} · ${manifesto.criadoEm ?? '?'}`,
);
console.log(`Total descompactado: ${mb(totalBytes)} MB\n`);
console.log(
  'item'.padEnd(34),
  'registros'.padStart(10),
  'MB'.padStart(8),
  '% do total'.padStart(11),
);
for (const l of linhas.slice(0, 20)) {
  console.log(
    l.item.padEnd(34),
    String(l.registros).padStart(10),
    mb(l.bytes).padStart(8),
    `${((100 * l.bytes) / totalBytes).toFixed(1)}%`.padStart(11),
  );
}
const log = linhas.find((l) => l.item === 'LOG');
if (log) console.log(`\nLog = ${((100 * log.bytes) / totalBytes).toFixed(0)}% do pacote.`);
