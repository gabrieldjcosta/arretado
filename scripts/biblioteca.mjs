// Gera docs/design/biblioteca/index.html e referencias.md a partir de dados.json.
// Uso: node scripts/biblioteca.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../docs/design/biblioteca/', import.meta.url);
const d = JSON.parse(readFileSync(new URL('dados.json', dir), 'utf8'));
const porId = new Map(d.referencias.map((r) => [r.id, r]));
const nomes = (c) => c.refs.map((i) => porId.get(i)?.nome ?? i);

const md = [
  '# Referências (gerado de dados.json; não editar à mão)',
  '',
  `Atualizado em ${d.atualizado}. ${d.regra}`,
  '',
  '| Referência | Tipo | Licença | Custo | Na nuvem | Veredito | Pegar | Não pegar | Estado no Arretado |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...d.referencias.map(
    (r) =>
      `| [${r.nome}](${r.url}) | ${r.tipo} | ${r.licenca} | ${r.custo} | ${r.nuvem} | ${r.veredito} | ${r.pegar} | ${r.nao_pegar} | ${r.estado} |`,
  ),
  '',
  '## Casos de uso',
  '',
  '| Caso | Onde | Mockup | Referências | Estado |',
  '| --- | --- | --- | --- | --- |',
  ...d.casos.map(
    (c) => `| ${c.nome} | \`${c.onde}\` | ${c.mockup} | ${nomes(c).join(', ')} | ${c.estado} |`,
  ),
  '',
];
writeFileSync(new URL('referencias.md', dir), md.join('\n'));

const modelo = readFileSync(new URL('visual.template.html', dir), 'utf8');
const dados = JSON.stringify(d).replace(/</g, '\\u003c');
writeFileSync(new URL('index.html', dir), modelo.replace('/*__DADOS__*/null', dados));
console.log('ok', d.referencias.length, 'referências,', d.casos.length, 'casos');
