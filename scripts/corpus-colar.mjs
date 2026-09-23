// Captura o "colar da página" de cada norma do corpus (F2, atividade 7.2).
//
//   npm run corpus:colar                  captura todas; só regrava o que mudou
//   npm run corpus:colar -- --so lep,cp   só as normas indicadas (também --so=lep,cp)
//
// Sem rede: cada página é servida do disco por `route` na URL oficial (os links saem absolutos,
// como no colar de verdade), com o charset do manifesto no Content-Type — o Planalto não declara
// charset e, sem o cabeçalho, o Chromium adivinharia. Todo o resto (CSS, imagens, scripts) é
// bloqueado, e a página abre sem JavaScript. Seleciona tudo, copia e cola numa página de
// captura, que grava o text/html e o text/plain do evento `paste`: o mesmo caminho da tela de
// importação (9.5). Usa o Chromium do Playwright (o mesmo do E2E).
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import {
  NORMAS,
  NOME_MANIFESTO,
  arquivoConfere,
  atualizarColado,
  conferirColado,
  decodificar,
  lerManifesto,
  nomeColadoHtml,
  nomeColadoTexto,
  serializarManifesto,
  sha256Hex,
} from './corpus/normas.mjs';

const DIRETORIO = fileURLToPath(new URL('../corpus/normas/', import.meta.url));
const TEMPO_MAXIMO_MS = 60_000;
const USO = 'Uso: npm run corpus:colar [-- --so id,id]';

/** Página que recebe o colar; guarda o que o evento `paste` entrega, sem inserir nada. */
const PAGINA_DE_CAPTURA = `<!doctype html><meta charset="utf-8"><title>captura</title>
<div id="alvo" contenteditable="true">cole aqui</div>
<script>
  globalThis.colado = new Promise((resolver) => {
    document.addEventListener('paste', (evento) => {
      evento.preventDefault();
      resolver({
        html: evento.clipboardData.getData('text/html'),
        texto: evento.clipboardData.getData('text/plain'),
      });
    }, { once: true });
  });
</script>`;

/** @param {string} mensagem */
function recusar(mensagem) {
  console.error(`${mensagem}\n${USO}`);
  process.exit(2);
}

/** @returns {string[] | null} */
function argumentos() {
  /** @type {string[] | null} */
  let so = null;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? '';
    if (arg === '--so' || arg.startsWith('--so=')) {
      const valor = arg === '--so' ? args[(i += 1)] : arg.slice('--so='.length);
      so = (valor ?? '').split(',').filter(Boolean);
      if (so.length === 0) recusar('--so precisa de ao menos um id.');
    } else {
      recusar(`Argumento desconhecido: ${arg}`);
    }
  }
  const desconhecidos = (so ?? []).filter((id) => !NORMAS.some((n) => n.id === id));
  if (desconhecidos.length > 0) recusar(`Normas desconhecidas: ${desconhecidos.join(', ')}`);
  return so;
}

/**
 * Abre a página a partir dos bytes do corpus, seleciona tudo, copia e cola na página de captura.
 * @param {import('playwright-core').Browser} navegador
 * @param {import('./corpus/normas.mjs').EntradaManifesto} entrada
 * @param {Uint8Array} bytes
 * @returns {Promise<{ html: string, texto: string }>}
 */
async function capturar(navegador, entrada, bytes) {
  const origem = await navegador.newContext({ javaScriptEnabled: false });
  const captura = await navegador.newContext();
  try {
    await origem.route('**/*', (rota) =>
      rota.request().url() === entrada.urlFinal
        ? rota.fulfill({
            status: 200,
            headers: { 'Content-Type': `text/html; charset=${entrada.charset}` },
            body: Buffer.from(bytes),
          })
        : rota.abort('blockedbyclient'),
    );
    const pagina = await origem.newPage();
    await pagina.goto(entrada.urlFinal, { waitUntil: 'load', timeout: TEMPO_MAXIMO_MS });
    await pagina.keyboard.press('ControlOrMeta+A');
    await pagina.keyboard.press('ControlOrMeta+C');

    const alvo = await captura.newPage();
    await alvo.setContent(PAGINA_DE_CAPTURA);
    await alvo.locator('#alvo').focus();
    await alvo.keyboard.press('ControlOrMeta+V');
    const colado = /** @type {Promise<{ html: string, texto: string }>} */ (
      alvo.evaluate('globalThis.colado')
    );
    const semColar = new Promise((_, rejeitar) => {
      setTimeout(
        () => rejeitar(new Error('o colar não chegou à página de captura')),
        TEMPO_MAXIMO_MS,
      ).unref();
    });
    return /** @type {{ html: string, texto: string }} */ (await Promise.race([colado, semColar]));
  } finally {
    await origem.close();
    await captura.close();
  }
}

async function colarCorpus() {
  const so = argumentos();
  const manifesto = await lerManifesto(DIRETORIO);
  const paginaPorId = new Map(manifesto.normas.map((e) => [e.id, e]));
  const coladoPorId = new Map((manifesto.colados ?? []).map((c) => [c.id, c]));
  const alvo = NORMAS.filter((n) => !so || so.includes(n.id));
  /** @type {import('playwright-core').Browser} */
  let navegador;
  try {
    navegador = await chromium.launch();
  } catch (excecao) {
    console.error(excecao instanceof Error ? excecao.message : String(excecao));
    console.error('Chromium do Playwright indisponível: rode npx playwright install chromium.');
    process.exit(1);
  }
  const versao = `chromium ${navegador.version()}`;
  let falhas = 0;
  let alteracoes = 0;
  try {
    for (const norma of alvo) {
      try {
        const entrada = paginaPorId.get(norma.id);
        if (!entrada || !(await arquivoConfere(DIRETORIO, entrada))) {
          throw new Error('página ausente ou diferente do manifesto — rode npm run corpus antes');
        }
        const bytes = await readFile(join(DIRETORIO, entrada.arquivo));
        const colado = await capturar(navegador, entrada, bytes);
        const problemas = conferirColado(norma, colado, decodificar(bytes, entrada.charset));
        if (problemas.length > 0) throw new Error(problemas.join('; '));
        const html = Buffer.from(colado.html, 'utf8');
        const texto = Buffer.from(colado.texto, 'utf8');
        const anterior = coladoPorId.get(norma.id);
        const nova = {
          id: norma.id,
          sha256ConteudoOrigem: entrada.sha256Conteudo,
          navegador: versao,
          plataforma: process.platform,
          html: { arquivo: nomeColadoHtml(norma.id), bytes: html.length, sha256: sha256Hex(html) },
          texto: {
            arquivo: nomeColadoTexto(norma.id),
            bytes: texto.length,
            sha256: sha256Hex(texto),
          },
        };
        const atualizada = atualizarColado(anterior, nova, new Date().toISOString());
        const { mudou, entrada: registro } = atualizada;
        // Mesma captura, mas um dos arquivos sumiu ou foi alterado: regrava sem mexer na data.
        const reparo =
          !mudou &&
          !(
            (await arquivoConfere(DIRETORIO, registro.html)) &&
            (await arquivoConfere(DIRETORIO, registro.texto))
          );
        if (mudou || reparo) {
          await writeFile(join(DIRETORIO, registro.html.arquivo), html);
          await writeFile(join(DIRETORIO, registro.texto.arquivo), texto);
          coladoPorId.set(norma.id, registro);
          alteracoes += 1;
        }
        const kb = (/** @type {number} */ n) => `${String(Math.round(n / 1024))} KB`;
        const sinal = mudou ? '↻' : reparo ? '⚒' : '=';
        console.log(`${sinal} ${norma.id}: html ${kb(html.length)}, texto ${kb(texto.length)}`);
      } catch (excecao) {
        falhas += 1;
        console.error(
          `✗ ${norma.id}: ${excecao instanceof Error ? excecao.message : String(excecao)}`,
        );
      }
    }
  } finally {
    await navegador.close();
  }
  if (alteracoes > 0) {
    manifesto.colados = [...coladoPorId.values()];
    await writeFile(join(DIRETORIO, NOME_MANIFESTO), serializarManifesto(manifesto));
  }
  console.log(
    `${String(alteracoes)} captura(s) alterada(s), ${String(falhas)} falha(s) (${versao}).`,
  );
  if (falhas > 0) process.exit(1);
}

await colarCorpus();
