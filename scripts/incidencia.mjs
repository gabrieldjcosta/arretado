// Incidência por assunto (TEC). Contrato em docs/planos/incidencia-tec.md.
//   node scripts/incidencia.mjs achatar <pasta-json> <saida.csv>   achata os jsonMateria baixados (dados ficam FORA do repo)
//   node scripts/incidencia.mjs validar <tabela.csv>                relatório; sai com 1 se houver erro
//   node scripts/incidencia.mjs artigos <tabela.csv> <saida.csv> [ano_de-ano_ate]   peso e faixa por artigo (CP e ECA) de um recorte
import fs from 'node:fs';
import path from 'node:path';
import { pesoPorArtigo } from './incidencia/artigos.mjs';
import { achatar, lerCsv, paraCsv, validar } from './incidencia/nucleo.mjs';

const [cmd, a, b, recorte] = process.argv.slice(2);
if (cmd === 'achatar' && a && b) {
  const linhas = fs
    .readdirSync(a)
    .filter((f) => f.endsWith('.json') && !f.startsWith('materias-') && f !== 'erros.json')
    .flatMap((f) => achatar(JSON.parse(fs.readFileSync(path.join(a, f), 'utf8'))));
  fs.writeFileSync(b, paraCsv(linhas));
  console.log(`${linhas.length} linhas em ${b}`);
} else if (cmd === 'validar' && a) {
  const r = validar(lerCsv(fs.readFileSync(a, 'utf8')));
  for (const x of [...r.erros.map((e) => ['erro', e]), ...r.avisos.map((e) => ['aviso', e])])
    console.log(`${x[0]} linha ${x[1].linha} [${x[1].regra}] ${x[1].msg}`);
  console.log(`${r.erros.length} erros, ${r.avisos.length} avisos`);
  process.exit(r.erros.length ? 1 : 0);
} else if (cmd === 'artigos' && a && b) {
  const [de, ate] = (recorte ?? '').split('-');
  const linhas = lerCsv(fs.readFileSync(a, 'utf8')).filter(
    (l) => !de || (l.ano_de === de && l.ano_ate === ate),
  );
  const res = pesoPorArtigo(linhas);
  const q = (s) => `"${s.replace(/"/g, '""')}"`;
  fs.writeFileSync(
    b,
    [
      'norma,artigo,peso,faixa,fonte',
      ...res.map((r) => [r.norma, r.artigo, r.peso, r.faixa, q(r.fonte)].join(',')),
    ].join('\n') + '\n',
  );
  console.log(`${res.length} artigos em ${b}`);
} else {
  console.error(
    'uso: achatar <pasta-json> <saida.csv> | validar <tabela.csv> | artigos <tabela.csv> <saida.csv> [ano_de-ano_ate]',
  );
  process.exit(2);
}
