// Incidência por assunto (TEC). Contrato em docs/planos/incidencia-tec.md.
//   node scripts/incidencia.mjs achatar <pasta-json> <saida.csv>   achata os jsonMateria baixados (dados ficam FORA do repo)
//   node scripts/incidencia.mjs validar <tabela.csv>                relatório; sai com 1 se houver erro
//   node scripts/incidencia.mjs pacote <artigos.csv> <saida.json> <id-uuid> <titulo>   pacote de estrelas (Altíssima e Alta) por item do acervo
//   node scripts/incidencia.mjs mapa <artigos.csv> <public/incidencia> <id-recorte> <titulo> [questoes] [periodo]   arquivos do Mapa da norma (AP-04)
//   node scripts/incidencia.mjs artigos <tabela.csv> <saida.csv> [ano_de-ano_ate]   peso e faixa por artigo (CP e ECA) de um recorte
import fs from 'node:fs';
import path from 'node:path';
import { pesoPorArtigo } from './incidencia/artigos.mjs';
import { montarMapas } from './incidencia/mapa.mjs';
import { montarPacote } from './incidencia/pacote.mjs';
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
} else if (cmd === 'pacote' && a && b && recorte && process.argv[6]) {
  const { pacote, ignoradas } = montarPacote(lerCsv(fs.readFileSync(a, 'utf8')), {
    id: recorte,
    titulo: process.argv[6],
  });
  fs.writeFileSync(b, JSON.stringify(pacote));
  console.log(
    `${Object.keys(pacote.normas).length} normas em ${b}; sem item do acervo: ${ignoradas.join(', ') || '—'}`,
  );
} else if (cmd === 'mapa' && a && b && recorte && process.argv[6]) {
  const [, , , , , , titulo, questoes, periodo] = process.argv;
  const noAcervo = new Set(
    JSON.parse(fs.readFileSync('public/acervo/indice.json', 'utf8')).itens.map((i) => i.id),
  );
  const { indice, mapas, semItem, foraDoAcervo } = montarMapas(
    lerCsv(fs.readFileSync(a, 'utf8')),
    {
      id: recorte,
      titulo,
      ...(questoes ? { questoes: Number(questoes) } : {}),
      ...(periodo ? { periodo } : {}),
    },
    (item) => noAcervo.has(item),
  );
  fs.rmSync(path.join(b, recorte), { recursive: true, force: true });
  fs.mkdirSync(path.join(b, recorte), { recursive: true });
  fs.writeFileSync(path.join(b, 'indice.json'), JSON.stringify(indice) + '\n');
  for (const m of mapas)
    fs.writeFileSync(path.join(b, recorte, `${m.norma}.json`), JSON.stringify(m) + '\n');
  const artigos = mapas.reduce((s, m) => s + m.artigos.length, 0);
  console.log(
    `${mapas.length} normas, ${artigos} artigos em ${b}/${recorte}; sem item do acervo: ${semItem.join(', ') || '—'}; item fora do acervo: ${foraDoAcervo.join(', ') || '—'}`,
  );
} else {
  console.error(
    'uso: achatar <pasta-json> <saida.csv> | validar <tabela.csv> | artigos <tabela.csv> <saida.csv> [ano_de-ano_ate] | pacote <artigos.csv> <saida.json> <id> <titulo> | mapa <artigos.csv> <pasta> <recorte> <titulo> [questoes] [periodo]',
  );
  process.exit(2);
}
