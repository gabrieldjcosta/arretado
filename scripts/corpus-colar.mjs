// Captura o "colar da página" de cada norma do corpus (F2, atividade 7.2).
//
//   npm run corpus:colar                  captura tudo; só regrava o que mudou e tira do índice
//                                         o que saiu do catálogo
//   npm run corpus:colar -- --so lep,cp   só as normas indicadas (também --so=lep,cp)
//
// Faz o que o Gabriel faz no navegador: abre a página, seleciona tudo (Ctrl+A), copia (Ctrl+C)
// e cola (Ctrl+V) numa página de destino, que guarda o `text/html` e o `text/plain` do evento
// `paste` (o mesmo que a tela de importação da 9.5 vai ler). Sem rede: a página vem dos bytes
// do corpus, servida no endereço original (os links saem absolutos, como no colar real) e com o
// charset do manifesto no `Content-Type` (o Planalto não declara charset; sem o cabeçalho o
// Chromium adivinharia). CSS, JS e imagens externos são bloqueados.
import { rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  NORMAS,
  arquivoConfere,
  lerManifesto,
  lerOpcoes,
  verificarCorpus,
} from './corpus/normas.mjs';
import {
  NOME_INDICE_COLADOS,
  SUFIXO_COLADO_HTML,
  SUFIXO_COLADO_TEXTO,
  atualizarColado,
  conferirCaptura,
  descreverArquivo,
  lerColados,
  serializarColados,
} from './corpus/derivados.mjs';

const DIRETORIO = fileURLToPath(new URL('../corpus/normas/', import.meta.url));
const USO = 'Uso: npm run corpus:colar [-- --so id,id]';
/** Endereço reservado (RFC 2606): nunca resolve; a rota do Playwright o atende. */
const DESTINO = 'https://colar.arretado.invalid/';
const PAGINA_DESTINO = `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><title>Colar</title>
<div id="alvo" contenteditable="true">Cole aqui</div>
<script>
  document.addEventListener('paste', (evento) => {
    evento.preventDefault();
    const dados = evento.clipboardData;
    window.colado = {
      tipos: [...dados.types],
      html: dados.getData('text/html'),
      texto: dados.getData('text/plain'),
    };
  });
</script>
</html>`;
const TEMPO_MAXIMO_MS = 120_000;

/** @param {string} mensagem */
function recusar(mensagem) {
  console.error(`${mensagem}\n${USO}`);
  process.exit(2);
}

/** @returns {string[] | null} */
function argumentos() {
  const { so, problema } = lerOpcoes(process.argv.slice(2), { ids: NORMAS.map((n) => n.id) });
  if (problema) recusar(problema);
  return so;
}

/**
 * Um navegador novo por norma: a área de transferência é do navegador inteiro, e um colar que
 * falhasse em silêncio devolveria a norma anterior (a LEP e a compilada têm os mesmos marcadores).
 * @param {{ urlFinal: string, charset: string }} pagina
 * @param {Uint8Array} bytes
 */
async function capturar(pagina, bytes) {
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ serviceWorkers: 'block' });
    let bloqueados = 0;
    await contexto.route('**/*', async (rota) => {
      const url = rota.request().url();
      if (url === pagina.urlFinal) {
        await rota.fulfill({
          status: 200,
          headers: { 'Content-Type': `text/html; charset=${pagina.charset}` },
          body: Buffer.from(bytes),
        });
      } else if (url === DESTINO) {
        await rota.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          body: PAGINA_DESTINO,
        });
      } else {
        bloqueados += 1;
        await rota.abort('blockedbyclient');
      }
    });
    const origem = await contexto.newPage();
    await origem.goto(pagina.urlFinal, { waitUntil: 'load', timeout: TEMPO_MAXIMO_MS });
    // Nada de clicar para dar foco: o canto da página da ALESP é um link.
    await origem.keyboard.press('ControlOrMeta+A');
    await origem.keyboard.press('ControlOrMeta+C');
    if (origem.url() !== pagina.urlFinal) {
      throw new Error(`a página navegou para ${origem.url()} antes de copiar`);
    }
    const destino = await contexto.newPage();
    await destino.goto(DESTINO);
    await destino.locator('#alvo').focus();
    await destino.keyboard.press('ControlOrMeta+V');
    await destino.waitForFunction(() => 'colado' in globalThis, null, { timeout: TEMPO_MAXIMO_MS });
    const colado = /** @type {{ tipos: string[], html: string, texto: string }} */ (
      await destino.evaluate(() => /** @type {any} */ (globalThis).colado)
    );
    return { ...colado, navegador: `chromium ${navegador.version()}`, bloqueados };
  } finally {
    await navegador.close();
  }
}

async function colar() {
  const so = argumentos();
  const problemasCorpus = await verificarCorpus(DIRETORIO);
  if (problemasCorpus.length > 0) {
    for (const p of problemasCorpus) console.error(`✗ ${p}`);
    console.error('Corpus com problema: rode npm run corpus antes de capturar.');
    process.exit(1);
  }
  const manifesto = await lerManifesto(DIRETORIO);
  const paginas = new Map(manifesto.normas.map((e) => [e.id, e]));
  const indice = await lerColados(DIRETORIO);
  const porId = new Map(indice.colados.map((e) => [e.id, e]));
  let falhas = 0;
  let alteracoes = 0;
  for (const norma of NORMAS.filter((n) => !so || so.includes(n.id))) {
    try {
      const pagina = paginas.get(norma.id);
      if (!pagina) throw new Error('ausente do manifesto');
      const bytes = await readFile(join(DIRETORIO, pagina.arquivo));
      const captura = await capturar(pagina, bytes);
      if (!captura.tipos.includes('text/html')) {
        throw new Error(
          `a área de transferência não trouxe text/html (${captura.tipos.join(', ')})`,
        );
      }
      const problemas = conferirCaptura(norma.id, captura.html, captura.texto);
      if (problemas.length > 0) throw new Error(problemas.join('; '));
      const html = Buffer.from(captura.html, 'utf8');
      const texto = Buffer.from(captura.texto, 'utf8');
      const { entrada, mudou } = atualizarColado(
        porId.get(norma.id),
        {
          id: norma.id,
          origemSha256Conteudo: pagina.sha256Conteudo,
          html: descreverArquivo(`${norma.id}${SUFIXO_COLADO_HTML}`, html),
          texto: descreverArquivo(`${norma.id}${SUFIXO_COLADO_TEXTO}`, texto),
          navegador: captura.navegador,
          plataforma: process.platform,
        },
        new Date().toISOString(),
      );
      // Captura igual, mas o arquivo local sumiu ou foi alterado: regrava sem mexer no índice.
      const reparo =
        !mudou &&
        !(
          (await arquivoConfere(DIRETORIO, entrada.html)) &&
          (await arquivoConfere(DIRETORIO, entrada.texto))
        );
      if (mudou || reparo) {
        await writeFile(join(DIRETORIO, entrada.html.arquivo), html);
        await writeFile(join(DIRETORIO, entrada.texto.arquivo), texto);
      }
      if (mudou) {
        porId.set(norma.id, entrada);
        alteracoes += 1;
      }
      /** @param {number} n */
      const kb = (n) => `${String(Math.round(n / 1024))} KB`;
      console.log(
        `${mudou ? '↻' : reparo ? '⚒' : '='} ${norma.id}: html ${kb(html.length)}, texto ${kb(texto.length)}, ` +
          `${String(captura.bloqueados)} requisição(ões) externa(s) bloqueada(s)`,
      );
    } catch (excecao) {
      falhas += 1;
      console.error(
        `✗ ${norma.id}: ${excecao instanceof Error ? excecao.message : String(excecao)}`,
      );
    }
  }
  // Execução completa: índice e pasta passam a ter só os colados do catálogo.
  if (!so) {
    const conhecidos = new Set(NORMAS.map((n) => n.id));
    for (const id of [...porId.keys()]) {
      if (!conhecidos.has(id)) {
        porId.delete(id);
        alteracoes += 1;
        console.log(`− ${id}: saiu do catálogo`);
      }
    }
    const referenciados = new Set(
      [...porId.values()].flatMap((e) => [e.html.arquivo, e.texto.arquivo]),
    );
    for (const nome of await readdir(DIRETORIO)) {
      const colado = nome.endsWith(SUFIXO_COLADO_HTML) || nome.endsWith(SUFIXO_COLADO_TEXTO);
      if (colado && !referenciados.has(nome)) {
        await rm(join(DIRETORIO, nome));
        console.log(`− ${nome}: colado sem entrada no índice, apagado`);
      }
    }
  }
  if (alteracoes > 0) {
    indice.colados = [...porId.values()];
    await writeFile(join(DIRETORIO, NOME_INDICE_COLADOS), serializarColados(indice));
  }
  console.log(`${String(alteracoes)} alteração(ões) no índice, ${String(falhas)} falha(s).`);
  if (falhas > 0) process.exit(1);
}

await colar();
