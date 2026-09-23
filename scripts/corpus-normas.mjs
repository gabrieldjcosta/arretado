// Baixa o corpus de normas para os testes do estruturador (F2, atividade 7.1).
//
//   npm run corpus                  baixa tudo; só regrava o que mudou na fonte, repara arquivo
//                                   danificado e tira do manifesto o que saiu do catálogo
//   npm run corpus -- --so lep,cp   só as normas indicadas (também --so=lep,cp)
//   npm run corpus -- --verificar   sem rede: confere arquivos × manifesto e os derivados (colados
//                                   e gabaritos); o npm test também faz
//
// Página que mudou na fonte deixa o colado e o gabarito desatualizados: depois, rodar
// `npm run corpus:colar` (7.2) e refazer a conferência do gabarito (7.3).
//
// Uma requisição por vez, com pausa entre elas: são poucas páginas, baixadas raramente.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NORMAS,
  NOME_MANIFESTO,
  USER_AGENT,
  arquivoConfere,
  atualizarEntrada,
  lerOpcoes,
  conferirConteudo,
  detectarCharset,
  ehDerivado,
  lerManifesto,
  serializarManifesto,
  sha256Conteudo,
  sha256Hex,
  verificarCorpus,
} from './corpus/normas.mjs';
import { verificarDerivados } from './corpus/derivados.mjs';

const DIRETORIO = fileURLToPath(new URL('../corpus/normas/', import.meta.url));
const TEMPO_MAXIMO_MS = 60_000;
const TAMANHO_MAXIMO = 20_000_000;
const PAUSA_MS = 2_000;
const USO = 'Uso: npm run corpus [-- --so id,id | -- --verificar]';

/** @param {string} mensagem */
function recusar(mensagem) {
  console.error(`${mensagem}\n${USO}`);
  process.exit(2);
}

/** @returns {{ verificar: boolean, so: string[] | null }} */
function argumentos() {
  const { so, chaves, problema } = lerOpcoes(process.argv.slice(2), {
    ids: NORMAS.map((n) => n.id),
    chaves: ['--verificar'],
  });
  if (problema) recusar(problema);
  const verificar = chaves.has('--verificar');
  if (verificar && so) recusar('--verificar confere o corpus inteiro; não combina com --so.');
  return { verificar, so };
}

/** @param {string} url */
async function baixar(url) {
  const resposta = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
  });
  if (resposta.status !== 200) throw new Error(`HTTP ${String(resposta.status)}`);
  if (new URL(resposta.url).host !== new URL(url).host) {
    throw new Error(`redirecionada para outro endereço: ${resposta.url}`);
  }
  const tipo = resposta.headers.get('content-type');
  if (tipo && !/html/i.test(tipo)) throw new Error(`tipo inesperado: ${tipo}`);
  const tamanhoDeclarado = Number(resposta.headers.get('content-length') ?? 0);
  if (tamanhoDeclarado > TAMANHO_MAXIMO) throw new Error(`${String(tamanhoDeclarado)} bytes`);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.length > TAMANHO_MAXIMO) throw new Error(`${String(bytes.length)} bytes`);
  return { bytes, contentType: tipo, urlFinal: resposta.url };
}

async function verificar() {
  const problemas = [
    ...(await verificarCorpus(DIRETORIO)),
    ...(await verificarDerivados(DIRETORIO)),
  ];
  for (const p of problemas) console.error(`✗ ${p}`);
  if (problemas.length > 0) process.exit(1);
  console.log(`✓ corpus íntegro (${String(NORMAS.length)} páginas, colados e gabaritos)`);
}

/** @param {string[] | null} so */
async function baixarCorpus(so) {
  await mkdir(DIRETORIO, { recursive: true });
  const manifesto = await lerManifesto(DIRETORIO);
  const porId = new Map(manifesto.normas.map((e) => [e.id, e]));
  const alvo = NORMAS.filter((n) => !so || so.includes(n.id));
  let falhas = 0;
  let alteracoes = 0;
  let paginasMudaram = false;
  for (const [i, norma] of alvo.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_MS));
    try {
      const { bytes, contentType, urlFinal } = await baixar(norma.url);
      const { charset, origem } = detectarCharset(bytes, contentType);
      const problemas = conferirConteudo(norma, bytes, charset);
      if (problemas.length > 0) throw new Error(problemas.join('; '));
      const anterior = porId.get(norma.id);
      const nova = {
        id: norma.id,
        titulo: norma.titulo,
        papel: norma.papel,
        variante: norma.variante,
        url: norma.url,
        urlFinal,
        arquivo: `${norma.id}.html`,
        charset,
        origemCharset: origem,
        bytes: bytes.length,
        sha256: sha256Hex(bytes),
        sha256Conteudo: sha256Conteudo(bytes),
      };
      const atualizada = atualizarEntrada(anterior, nova, new Date().toISOString());
      const { mudou } = atualizada;
      let { entrada } = atualizada;
      // Fonte igual, mas o arquivo local sumiu ou foi alterado: regrava com a data original.
      const reparo = !mudou && !(await arquivoConfere(DIRETORIO, entrada));
      if (reparo) entrada = { ...nova, obtidoEm: entrada.obtidoEm };
      if (mudou || reparo) {
        await writeFile(join(DIRETORIO, entrada.arquivo), bytes);
        porId.set(norma.id, entrada);
        alteracoes += 1;
        paginasMudaram ||= mudou;
      }
      const kb = Math.round(bytes.length / 1024);
      const sinal = mudou ? '↻' : reparo ? '⚒' : '=';
      console.log(`${sinal} ${norma.id}: ${String(kb)} KB, ${charset} (${origem})`);
    } catch (excecao) {
      falhas += 1;
      console.error(
        `✗ ${norma.id}: ${excecao instanceof Error ? excecao.message : String(excecao)}`,
      );
    }
  }
  // Execução completa: o manifesto e a pasta passam a ter só o que está no catálogo.
  if (!so) {
    const conhecidos = new Set(NORMAS.map((n) => n.id));
    for (const id of [...porId.keys()]) {
      if (!conhecidos.has(id)) {
        porId.delete(id);
        alteracoes += 1;
        console.log(`− ${id}: saiu do catálogo`);
      }
    }
    const referenciados = new Set([...porId.values()].map((e) => e.arquivo));
    for (const nome of await readdir(DIRETORIO)) {
      if (nome.endsWith('.html') && !ehDerivado(nome) && !referenciados.has(nome)) {
        await rm(join(DIRETORIO, nome));
        console.log(`− ${nome}: arquivo sem entrada no manifesto, apagado`);
      }
    }
  }
  if (alteracoes > 0) {
    manifesto.normas = [...porId.values()];
    await writeFile(join(DIRETORIO, NOME_MANIFESTO), serializarManifesto(manifesto));
  }
  console.log(`${String(alteracoes)} alteração(ões) no manifesto, ${String(falhas)} falha(s).`);
  if (paginasMudaram) {
    console.log('Páginas mudaram: rode npm run corpus:colar e refaça o gabarito das normas com ↻.');
  }
  if (falhas > 0) process.exit(1);
}

const opcoes = argumentos();
await (opcoes.verificar ? verificar() : baixarCorpus(opcoes.so));
