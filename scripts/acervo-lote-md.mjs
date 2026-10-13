// Converte um lote de atos oficiais (PDF ou página do CNJ) em Markdown em `acervo/fontes/` e acrescenta
// (ou atualiza) os itens em `acervo/curadoria.json`. Precisa de rede e do `pdftotext`.
// Uso: node scripts/acervo-lote-md.mjs <manifesto.json> [--so <id>,<id>]
// Manifesto: lista de { id, arquivo, titulo, tituloCurto?, grupo, tipo, esfera, vinculos, avisos?,
//   urlOficial, cnj? (página do ato), pdfModo? ("original"), pdf? (URL direta), manual? (Markdown já transcrito à mão; só registra), cortarEm? (regex: o texto
//   acaba na primeira linha que casar, para deixar o anexo de fora), semArtigos?, anomaliasAceitas? }.
import { readFileSync, writeFileSync } from 'node:fs';
import { htmlParaTexto } from './acervo-html-para-md.mjs';
import { baixar, comTitulos, limpar, pdfDoCnj, pdfParaTexto } from './acervo-pdf-para-md.mjs';

const [, , caminho, flag, lista] = process.argv;
const so = flag === '--so' ? new Set(lista.split(',')) : null;
const manifesto = JSON.parse(readFileSync(caminho, 'utf8'));
const curadoria = JSON.parse(readFileSync('acervo/curadoria.json', 'utf8'));

for (const m of manifesto) {
  if (so && !so.has(m.id)) continue;
  try {
    let texto = '';
    let url = m.pdf ?? (m.cnj ? await pdfDoCnj(m.cnj, m.pdfModo) : null);
    if (m.html) {
      url = m.html;
      texto = htmlParaTexto((await baixar(m.html)).toString('utf8'), m.seletor);
      if (m.cortarEm) {
        const i = texto.search(new RegExp(m.cortarEm, 'm'));
        if (i > 0) texto = texto.slice(0, i).trim();
      }
      if (m.semArtigos) texto = comTitulos(texto);
      if (texto.length < 200) throw new Error(`texto curto (${texto.length})`);
      writeFileSync(
        `acervo/fontes/${m.arquivo}`,
        `# ${m.titulo}
${texto}
`,
      );
    } else if (m.manual) {
      // PDF escaneado: o Markdown já foi transcrito à mão em `acervo/fontes/`; só entra na curadoria.
      url = m.urlOficial;
      texto = readFileSync(`acervo/fontes/${m.arquivo}`, 'utf8');
    } else {
      if (!url) throw new Error('sem PDF');
      texto = limpar(pdfParaTexto(await baixar(url)));
      if (m.cortarEm) {
        const i = texto.search(new RegExp(m.cortarEm, 'm'));
        if (i > 0) texto = texto.slice(0, i).trim();
      }
      if (m.semArtigos) texto = comTitulos(texto);
      if (texto.length < 200) throw new Error(`texto curto (${texto.length}); PDF escaneado?`);
      writeFileSync(`acervo/fontes/${m.arquivo}`, `# ${m.titulo}\n${texto}\n`);
    }
    const item = {
      id: m.id,
      titulo: m.titulo,
      grupo: m.grupo,
      ...(m.tituloCurto ? { tituloCurto: m.tituloCurto } : {}),
      tipo: m.tipo,
      esfera: m.esfera,
      vinculos: m.vinculos ?? [],
      avisos: m.avisos ?? [],
      fonte: { adaptador: 'markdown', arquivo: m.arquivo, urlOficial: m.urlOficial ?? url },
      ...(m.semArtigos ? { semArtigos: true } : {}),
      anomaliasAceitas: m.anomaliasAceitas ?? [],
    };
    const i = curadoria.itens.findIndex((x) => x.id === m.id);
    if (i >= 0) curadoria.itens[i] = item;
    else curadoria.itens.push(item);
    console.log(`ok  ${m.id}  ${texto.length}  ${url}`);
  } catch (e) {
    console.log(`ERRO ${m.id}: ${e.message}`);
  }
}
writeFileSync('acervo/curadoria.json', JSON.stringify(curadoria, null, 2) + '\n');
