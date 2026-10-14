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

const [, , comando, entrada, ...resto] = process.argv;
if (!['validar', 'converter'].includes(comando) || !entrada) {
  console.error('Uso: node scripts/catalogo.mjs <validar|converter> <arquivo|-> [--out DIR]');
  process.exit(2);
}
const saida = resto[resto.indexOf('--out') + 1] ?? 'corpus/catalogo';
const texto = readFileSync(entrada === '-' ? 0 : entrada, 'utf8');

const blocos = separarBlocos(texto);
const achados = blocos.erros.map((msg) => ({ nivel: 'erro', linha: 0, regra: 'blocos', msg }));
if (blocos.principal) {
  achados.push(...validarPrincipal(blocos.principal), ...validarComplementares(blocos));
}
const erros = achados.filter((x) => x.nivel === 'erro');
const avisos = achados.filter((x) => x.nivel === 'aviso');
for (const x of [...erros, ...avisos])
  console.log(
    `${x.nivel === 'erro' ? 'ERRO ' : 'aviso'} ${x.linha ? `linha ${x.linha}: ` : ''}[${x.regra}] ${x.msg}`,
  );

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
