// Catálogo de concursos (B0): valida e converte o CSV do Perplexity. Contrato em docs/planos/catalogo-formato.md.
//   node scripts/catalogo.mjs validar <arquivo>                 só relatório; sai com 1 se houver erro
//   node scripts/catalogo.mjs converter <arquivo> [--out DIR]   valida e grava DIR/<carreira>.csv e .json (padrão: corpus/catalogo)
// <arquivo> pode ser o CSV puro ou a resposta inteira do Perplexity (blocos entre ```); "-" lê da entrada padrão.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  carreiraCanonica,
  carreirasDoPrincipal,
  converter,
  csvNormalizado,
  separarBlocos,
  validarComplementares,
  validarPrincipal,
} from './catalogo/nucleo.mjs';

const [, , comando, ...args] = process.argv;
const iOut = args.indexOf('--out');
const saida = iOut >= 0 ? (args[iOut + 1] ?? 'corpus/catalogo') : 'corpus/catalogo';
const entradas = args.filter(
  (a, i) => a !== '--tudo' && (iOut < 0 || (i !== iOut && i !== iOut + 1)),
);
if (!['validar', 'converter'].includes(comando) || !entradas.length) {
  console.error(
    'Uso: node scripts/catalogo.mjs <validar|converter> <arquivo|-> [outros arquivos] [--out DIR]',
  );
  process.exit(2);
}

// Vários arquivos (um por bloco: conteúdo, disciplinas, editais) são juntados como se fossem uma resposta só.
const blocos = { principal: null, consolidadas: null, editais: null, erros: [] };
for (const entrada of entradas) {
  const b = separarBlocos(readFileSync(entrada === '-' ? 0 : entrada, 'utf8'));
  blocos.erros.push(...b.erros.map((m) => `${entrada}: ${m}`));
  for (const k of ['principal', 'consolidadas', 'editais']) {
    if (!b[k]) continue;
    if (blocos[k]) blocos.erros.push(`${entrada}: bloco "${k}" repetido entre arquivos`);
    else blocos[k] = b[k];
  }
}
if (!blocos.principal && !blocos.erros.length)
  blocos.erros.push('nenhum bloco principal nos arquivos');
const achados = blocos.erros.map((msg) => ({ nivel: 'erro', linha: 0, regra: 'blocos', msg }));
if (blocos.principal) {
  achados.push(...validarPrincipal(blocos.principal), ...validarComplementares(blocos));
}
const erros = achados.filter((x) => x.nivel === 'erro');
const avisos = achados.filter((x) => x.nivel === 'aviso');
// Agrupa por nível e regra; mostra os primeiros exemplos de cada (--tudo mostra todos).
const tudo = process.argv.includes('--tudo');
for (const [nivel, lista] of [
  ['erro', erros],
  ['aviso', avisos],
]) {
  const porRegra = Object.groupBy(lista, (x) => x.regra);
  for (const [regra, xs] of Object.entries(porRegra)) {
    console.log(`\n${nivel.toUpperCase()} [${regra}] ${xs.length}x`);
    for (const x of tudo ? xs : xs.slice(0, 5))
      console.log(`  ${x.linha ? `linha ${x.linha}: ` : ''}${x.msg}`);
    if (!tudo && xs.length > 5) console.log(`  … +${xs.length - 5} (use --tudo)`);
  }
}

const n = blocos.principal?.length ?? 0;
console.log(
  `\n${n} linhas no bloco principal · ${blocos.consolidadas?.length ?? 'sem'} consolidadas · ${blocos.editais?.length ?? 'sem'} editais usados · ${erros.length} erros · ${avisos.length} avisos`,
);
if (erros.length) process.exit(1);

if (comando === 'converter') {
  mkdirSync(saida, { recursive: true });
  for (const nome of carreirasDoPrincipal(blocos.principal)) {
    const { slug } = carreiraCanonica(nome);
    const doCarreira = blocos.principal.filter(({ l }) => carreiraCanonica(l[0])?.nome === nome);
    writeFileSync(join(saida, `${slug}.csv`), csvNormalizado(doCarreira));
    const json = converter(blocos, nome);
    writeFileSync(join(saida, `${slug}.json`), JSON.stringify(json, null, 2) + '\n');
    console.log(`gravado ${join(saida, slug)}.{csv,json} (${json.editais.length} editais)`);
  }
}
