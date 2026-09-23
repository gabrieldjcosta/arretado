// Gera o gabarito de cada norma do corpus (F2, atividade 7.3) e a folha de conferência.
//
//   npm run corpus:gabarito                  gera todos (corpus/normas/<id>.gabarito.json e
//                                            docs/conferencias/gabarito-<id>.md)
//   npm run corpus:gabarito -- --so lep      só as normas indicadas (também --so=lep,cp)
//
// Sem rede: lê o colado (7.2), o texto puro, a página bruta (âncoras) e a compilada. Mantém a
// "conferencia" do gabarito anterior se nada mais mudou; se mudou, ela volta a "pendente" e o
// Gabriel confere de novo. Pendência (divergência sem explicação) impede a gravação.
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NORMAS, decodificar, lerManifesto } from './corpus/normas.mjs';
import { SUFIXO_GABARITO } from './corpus/derivados.mjs';
import {
  GABARITOS,
  folhaDeConferencia,
  montarGabarito,
  preservarConferencia,
  serializarGabarito,
} from './corpus/gabarito.mjs';

const DIRETORIO = fileURLToPath(new URL('../corpus/normas/', import.meta.url));
const CONFERENCIAS = fileURLToPath(new URL('../docs/conferencias/', import.meta.url));
const USO = 'Uso: npm run corpus:gabarito [-- --so id,id]';

/**
 * @param {string[]} args
 * @returns {string[] | null} ids pedidos, ou null = todos
 */
function lerArgumentos(args) {
  const i = args.findIndex((a) => a === '--so' || a.startsWith('--so='));
  if (i === -1) {
    if (args.length > 0) throw new Error(USO);
    return null;
  }
  const valor = args[i].startsWith('--so=') ? args[i].slice(5) : args[i + 1];
  if (!valor) throw new Error(USO);
  return valor.split(',').map((s) => s.trim());
}

/**
 * Lê as entradas de uma norma e monta o gabarito (usado também pelo teste).
 * @param {string} diretorio
 * @param {(typeof GABARITOS)[number]} alvo
 */
export async function gerarGabarito(diretorio, alvo) {
  const manifesto = await lerManifesto(diretorio);
  const pagina = manifesto.normas.find((n) => n.id === alvo.id);
  if (!pagina) throw new Error(`${alvo.id}: fora do manifesto`);
  const ler = (/** @type {string} */ nome) => readFile(join(diretorio, nome), 'utf8');
  return montarGabarito(alvo, pagina, {
    paginaBruta: decodificar(await readFile(join(diretorio, pagina.arquivo)), pagina.charset),
    coladoHtml: await ler(`${alvo.id}.colado.html`),
    coladoTexto: await ler(`${alvo.id}.colado.txt`),
    compiladoHtml: await ler(`${alvo.compilado}.colado.html`),
    compilado: alvo.compilado,
  });
}

/** @param {string} caminho */
async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

async function principal() {
  const pedidos = lerArgumentos(process.argv.slice(2));
  const alvos = GABARITOS.filter((g) => !pedidos || pedidos.includes(g.id));
  if (pedidos && alvos.length !== pedidos.length)
    throw new Error(`Sem gabarito: ${pedidos.join(', ')}`);
  await mkdir(CONFERENCIAS, { recursive: true });
  let falhou = false;
  for (const alvo of alvos) {
    const novo = await gerarGabarito(DIRETORIO, alvo);
    if (novo.pendencias.length > 0) {
      falhou = true;
      console.error(
        `✗ ${alvo.id}: ${String(novo.pendencias.length)} pendência(s) — explicar em DECISOES:`,
      );
      for (const p of novo.pendencias)
        console.error(`   ${p.tipo} ${p.chave}${p.detalhe ? ` — ${p.detalhe}` : ''}`);
      continue;
    }
    const arquivo = join(DIRETORIO, `${alvo.id}${SUFIXO_GABARITO}`);
    /** @type {{ conferencia?: import('./corpus/gabarito.mjs').Conferencia } | null} */
    let anterior;
    try {
      anterior = JSON.parse(await readFile(arquivo, 'utf8'));
    } catch (excecao) {
      // Só a ausência é normal; JSON quebrado não pode apagar a conferência em silêncio.
      if (/** @type {NodeJS.ErrnoException} */ (excecao).code !== 'ENOENT') throw excecao;
      anterior = null;
    }
    const { gabarito, mudou } = preservarConferencia(anterior, novo);
    await writeFile(arquivo, serializarGabarito(gabarito));
    const titulo = NORMAS.find((n) => n.id === alvo.id)?.titulo ?? alvo.id;
    const folha = join(CONFERENCIAS, `gabarito-${alvo.id}.md`);
    // A folha pode ter as marcas do Gabriel: só é regravada quando o gabarito muda.
    if (mudou || !(await existe(folha)))
      await writeFile(folha, folhaDeConferencia(gabarito, titulo));
    const c = gabarito.contagens;
    const aviso =
      mudou && anterior?.conferencia?.estado === 'conferida' ? ' — mudou: conferir de novo' : '';
    console.log(
      `${mudou ? '✓' : '='} ${alvo.id}: ${String(c.dispositivos)} dispositivos, ` +
        `${String(c.redacoesAnteriores)} redações anteriores, ${String(c.notasVigencia)} notas, ` +
        `amostra ${String(gabarito.amostra.length)}${aviso}`,
    );
  }
  if (falhou) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((/** @type {unknown} */ e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
