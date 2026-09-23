// Captura o "colar da página" de cada norma do corpus (F2, atividade 7.2): o `text/html` que o
// Chromium põe na área de transferência quando se seleciona a página inteira e se copia. É a
// entrada real do fluxo "colar" (Parte 2 §10.6) e vira caso de teste do estruturador.
//
//   npm run corpus:colar                  captura todas; só regrava o colado que mudou
//   npm run corpus:colar -- --so lep,cp   só as indicadas (também --so=lep,cp)
//
// Sem rede e reproduzível: a página sai dos bytes do corpus (`page.route`) no endereço original,
// com o charset do manifesto no Content-Type (o Planalto não declara charset; sem o cabeçalho o
// Chromium adivinharia); toda outra requisição (imagens, CSS e JS relativos) é bloqueada e os
// scripts da página não rodam. O Chromium é o do Playwright fixado no package.json, sem janela,
// com área de transferência própria (não mexe na do Aparelho).
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NORMAS,
  NOME_COLADOS,
  SUFIXO_COLADO,
  atualizarColado,
  conferirColado,
  contarTachados,
  decodificar,
  lerColados,
  lerManifesto,
  podarDerivados,
  serializarColados,
  sha256Hex,
} from './corpus/normas.mjs';

const DIRETORIO = fileURLToPath(new URL('../corpus/normas/', import.meta.url));
const USO = 'Uso: npm run corpus:colar [-- --so id,id]';

/** Página onde se cola: guarda o `text/html` do evento `paste`, como o app fará (9.5). */
const URL_COLAR = 'https://colar.invalid/';
const PAGINA_COLAR =
  '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>colar</title>' +
  '<textarea aria-label="colar"></textarea><script>' +
  'document.addEventListener("paste", (e) => {' +
  ' globalThis.colado = e.clipboardData.getData("text/html"); e.preventDefault(); });' +
  '</script></html>';

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
 * Abre a página a partir dos bytes, seleciona tudo, copia e cola numa página em branco.
 * @param {import('@playwright/test').Browser} navegador
 * @param {{ urlFinal: string, charset: string }} pagina
 * @param {Uint8Array} bytes
 * @returns {Promise<{ html: string, bloqueadas: number }>}
 */
async function capturar(navegador, pagina, bytes) {
  // `offline`: nada sai para a rede; só as respostas do `route` chegam à página.
  const contextoLei = await navegador.newContext({
    javaScriptEnabled: false,
    offline: true,
    serviceWorkers: 'block',
  });
  const contextoColar = await navegador.newContext({ offline: true, serviceWorkers: 'block' });
  try {
    let bloqueadas = 0;
    await contextoLei.route('**/*', (rota) => {
      if (rota.request().url() === pagina.urlFinal) {
        return rota.fulfill({
          status: 200,
          headers: { 'Content-Type': `text/html; charset=${pagina.charset}` },
          body: Buffer.from(bytes),
        });
      }
      bloqueadas += 1;
      return rota.abort('blockedbyclient');
    });
    const lei = await contextoLei.newPage();
    await lei.goto(pagina.urlFinal, { waitUntil: 'load' });
    await lei.keyboard.press('ControlOrMeta+A');
    await lei.keyboard.press('ControlOrMeta+C');

    await contextoColar.route('**/*', (rota) =>
      rota.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: PAGINA_COLAR,
      }),
    );
    const colar = await contextoColar.newPage();
    await colar.goto(URL_COLAR);
    await colar.focus('textarea');
    await colar.keyboard.press('ControlOrMeta+V');
    const html = await colar.evaluate(
      () => /** @type {{ colado?: string }} */ (/** @type {unknown} */ (globalThis)).colado ?? '',
    );
    return { html, bloqueadas };
  } finally {
    await contextoLei.close();
    await contextoColar.close();
  }
}

/** @param {string[] | null} so */
async function colarCorpus(so) {
  const manifesto = await lerManifesto(DIRETORIO);
  const paginas = new Map(manifesto.normas.map((e) => [e.id, e]));
  const registro = await lerColados(DIRETORIO);
  const porId = new Map(registro.colados.map((e) => [e.id, e]));
  const navegador = await chromium.launch();
  const versao = `Chromium ${navegador.version()}`;
  let falhas = 0;
  let alteracoes = 0;
  try {
    for (const norma of NORMAS.filter((n) => !so || so.includes(n.id))) {
      try {
        const pagina = paginas.get(norma.id);
        if (!pagina) throw new Error('ausente do manifesto — rode npm run corpus');
        const bytes = await readFile(join(DIRETORIO, pagina.arquivo));
        if (sha256Hex(bytes) !== pagina.sha256) {
          throw new Error(`${pagina.arquivo} difere do manifesto — rode npm run corpus`);
        }
        const { html, bloqueadas } = await capturar(navegador, pagina, bytes);
        const colado = Buffer.from(html, 'utf8');
        const arquivo = `${norma.id}${SUFIXO_COLADO}`;
        const tachados = contarTachados(decodificar(bytes, pagina.charset));
        const problemas = conferirColado(norma, colado, tachados);
        if (problemas.length > 0) throw new Error(problemas.join('; '));
        const { entrada, mudou } = atualizarColado(
          porId.get(norma.id),
          {
            id: norma.id,
            arquivo,
            origemSha256Conteudo: pagina.sha256Conteudo,
            navegador: versao,
            bytes: colado.length,
            sha256: sha256Hex(colado),
          },
          new Date().toISOString(),
        );
        if (mudou) {
          await writeFile(join(DIRETORIO, arquivo), colado);
          porId.set(norma.id, entrada);
          alteracoes += 1;
        }
        const kb = Math.round(colado.length / 1024);
        const sinal = mudou ? '↻' : '=';
        console.log(
          `${sinal} ${arquivo}: ${String(kb)} KB (${String(bloqueadas)} requisição(ões) bloqueada(s))`,
        );
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
    registro.colados = [...porId.values()];
    await writeFile(join(DIRETORIO, NOME_COLADOS), serializarColados(registro));
  }
  // Execução completa: some o que for de norma que saiu do catálogo.
  if (!so) {
    for (const nome of await podarDerivados(DIRETORIO)) {
      console.log(`− ${nome}: derivado de norma fora do catálogo, apagado`);
    }
  }
  console.log(
    `${String(alteracoes)} colado(s) alterado(s) (${versao}), ${String(falhas)} falha(s).`,
  );
  if (falhas > 0) process.exit(1);
}

await colarCorpus(argumentos());
