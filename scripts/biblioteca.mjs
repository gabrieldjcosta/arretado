// Gera docs/design/biblioteca/index.html e referencias.md a partir de dados.json.
// Uso: node scripts/biblioteca.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../docs/design/biblioteca/', import.meta.url);
const d = JSON.parse(readFileSync(new URL('dados.json', dir), 'utf8'));
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

const cartaoRef = (r) => `<article class="c" data-v="${esc(r.veredito)}">
<h3><a href="${esc(r.url)}">${esc(r.nome)}</a></h3>
<p class="tag"><span>${esc(r.tipo)}</span><span class="v">${esc(r.veredito)}</span></p>
<dl><dt>Pegar</dt><dd>${esc(r.pegar)}</dd><dt>Não pegar</dt><dd>${esc(r.nao_pegar)}</dd>
<dt>Licença</dt><dd>${esc(r.licenca)}</dd><dt>Custo</dt><dd>${esc(r.custo)}</dd>
<dt>Exemplo real</dt><dd>${esc(r.exemplo ?? '—')}</dd><dt>Na nuvem</dt><dd>${esc(r.nuvem)} · verificado ${esc(r.verificado ?? '—')}</dd><dt>No Arretado</dt><dd>${esc(r.estado)}</dd></dl></article>`;
const linhaCaso = (c) =>
  `<tr><td>${esc(c.nome)}</td><td><code>${esc(c.onde)}</code></td><td>${esc(c.mockup)}</td><td>${esc(nomes(c).join(', '))}</td><td>${esc(c.estado)}</td></tr>`;

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biblioteca visual</title>
<style>
:root{--bg:#f6f8fb;--fg:#0f1c3a;--mut:#4a5675;--card:#fff;--bd:#d6dcea;--ac:#a35700}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1322;--fg:#f2f6ff;--mut:#aab6d3;--card:#131d33;--bd:#27344f;--ac:#ffc53d}}
:root[data-theme="dark"]{--bg:#0b1322;--fg:#f2f6ff;--mut:#aab6d3;--card:#131d33;--bd:#27344f;--ac:#ffc53d}
*{box-sizing:border-box}body{margin:0 auto;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;padding:24px 16px;max-width:1100px}
h1{margin:0 0 4px}p.lead{color:var(--mut);margin:0 0 20px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))}
.c{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px}
.c h3{margin:0 0 6px;font-size:1.05rem}a{color:var(--ac)}
.tag{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;font-size:.8rem}.tag span{border:1px solid var(--bd);border-radius:99px;padding:1px 8px}.tag .v{color:var(--ac);font-weight:600}
dl{margin:0;font-size:.88rem}dt{font-weight:600;margin-top:6px}dd{margin:0;color:var(--mut)}
.f{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}.f button{background:var(--card);color:var(--fg);border:1px solid var(--bd);border-radius:99px;padding:6px 12px;min-height:36px;font:inherit;cursor:pointer}.f button[aria-pressed=true]{border-color:var(--ac);color:var(--ac)}
.t{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{border-bottom:1px solid var(--bd);padding:8px;text-align:left;vertical-align:top}
h2{margin:32px 0 10px}
</style></head><body>
<h1>Biblioteca visual do Arretado</h1>
<p class="lead">Atualizado em ${esc(d.atualizado)}. ${esc(d.regra)}</p>
<h2>Referências</h2>
<div class="f" id="f"></div>
<div class="grid" id="g">${d.referencias.map(cartaoRef).join('\n')}</div>
<h2>Casos de uso previstos</h2>
<div class="t"><table><thead><tr><th>Caso</th><th>Onde</th><th>Mockup</th><th>Referências</th><th>Estado</th></tr></thead><tbody>${d.casos.map(linhaCaso).join('')}</tbody></table></div>
<script>
const cs=[...document.querySelectorAll('.c')],vs=['todos',...new Set(cs.map(c=>c.dataset.v))],f=document.getElementById('f');
vs.forEach((v,i)=>{const b=document.createElement('button');b.textContent=v;b.setAttribute('aria-pressed',i===0);b.onclick=()=>{[...f.children].forEach(x=>x.setAttribute('aria-pressed',x===b));cs.forEach(c=>{c.hidden=v!=='todos'&&c.dataset.v!==v})};f.append(b)});
</script></body></html>
`;
writeFileSync(new URL('index.html', dir), html);
console.log('ok', d.referencias.length, 'referências,', d.casos.length, 'casos');
