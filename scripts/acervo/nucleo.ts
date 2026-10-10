// Núcleo do pipeline do acervo (Node): coleta com cache, adaptadores, geração e verificação em
// disco. O CLI (`cli.ts`) só interpreta os argumentos. Fora do app: usa fs e rede.
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sanitizarHtml, type Bloco } from '../../src/core/seguranca/sanitizador';
import { Curadoria, type ItemDaCuradoria } from './curadoria';
import { markdownParaBlocos } from './markdown';
import {
  construirItemArticulado,
  construirItemSemArtigos,
  entradaDoIndice,
  type ResultadoDaConstrucao,
} from './construir';
import { verificarAcervo, type ProblemaDoAcervo } from './verificar';
import type { EntradaDoIndice, IndiceDoAcervo } from '../../src/dominios/acervo/esquemas';

export const USER_AGENT =
  'ArretadoAcervo/1.0 (curadoria pessoal; contato: gabrieldjcosta@gmail.com)';
const INTERVALO_MS = 1_000;

export interface Pastas {
  curadoria: string;
  fontes: string;
  cache: string;
  saida: string;
  relatorio: string;
}

/** Pasta onde o Planalto fica no cache: o nome sai do id (único por item). */
const arquivoDoCache = (pastas: Pastas, id: string) => join(pastas.cache, `${id}.bruto`);

/** Planalto serve windows-1252; o UTF-8 estrito é tentado primeiro (páginas novas). */
export function decodificarPagina(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function blocosDoPlanalto(bytes: Uint8Array, base: string): Bloco[] {
  return sanitizarHtml(decodificarPagina(bytes), { base }).blocos;
}

const ultimaRequisicao = new Map<string, number>();

/** Uma requisição por segundo por servidor, com User-Agent identificado. */
export async function baixar(url: string): Promise<Uint8Array> {
  const host = new URL(url).host;
  const espera = (ultimaRequisicao.get(host) ?? 0) + INTERVALO_MS - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimaRequisicao.set(host, Date.now());
  const resposta = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!resposta.ok) throw new Error(`${url}: HTTP ${String(resposta.status)}`);
  return new Uint8Array(await resposta.arrayBuffer());
}

interface Bruto {
  bytes: Uint8Array;
  /** Data (AAAA-MM-DD) em que o arquivo foi coletado: a do cache, para a geração ser reprodutível. */
  coletadoEm: string;
  urlOficial: string | undefined;
}

const dataCivil = (d: Date) => d.toISOString().slice(0, 10);

async function lerBruto(pastas: Pastas, cur: ItemDaCuradoria): Promise<Bruto> {
  if (cur.fonte.adaptador === 'markdown') {
    const caminho = join(pastas.fontes, cur.fonte.arquivo);
    return {
      bytes: await readFile(caminho),
      coletadoEm: dataCivil((await stat(caminho)).mtime),
      urlOficial: cur.fonte.urlOficial,
    };
  }
  const cache = arquivoDoCache(pastas, cur.id);
  try {
    const bytes = await readFile(cache);
    return { bytes, coletadoEm: dataCivil((await stat(cache)).mtime), urlOficial: cur.fonte.url };
  } catch {
    const bytes = await baixar(cur.fonte.url);
    await mkdir(pastas.cache, { recursive: true });
    await writeFile(cache, bytes);
    return { bytes, coletadoEm: dataCivil(new Date()), urlOficial: cur.fonte.url };
  }
}

export interface ItemGerado {
  construcao: ResultadoDaConstrucao;
  entrada?: EntradaDoIndice;
  corpo?: string;
  erro?: string;
}

export async function gerarItem(pastas: Pastas, cur: ItemDaCuradoria): Promise<ItemGerado> {
  let bruto: Bruto;
  try {
    bruto = await lerBruto(pastas, cur);
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    return {
      construcao: {
        id: cur.id,
        bloqueios: [`coleta falhou: ${erro}`],
        anomalias: {},
        nos: 0,
        aConfirmar: 0,
      },
      erro,
    };
  }
  const texto = decodificarPagina(bruto.bytes);
  const construcao = cur.semArtigos
    ? construirItemSemArtigos(cur, texto, bruto.coletadoEm, bruto.urlOficial)
    : construirItemArticulado(
        cur,
        cur.fonte.adaptador === 'planalto'
          ? blocosDoPlanalto(bruto.bytes, cur.fonte.url)
          : markdownParaBlocos(texto),
        bruto.coletadoEm,
        bruto.urlOficial,
      );
  if (!construcao.item) return { construcao };
  const corpo = JSON.stringify(construcao.item);
  const entrada = await entradaDoIndice(
    cur,
    construcao.item,
    corpo,
    bruto.coletadoEm,
    bruto.urlOficial,
  );
  return { construcao, entrada, corpo };
}

export async function lerCuradoria(pastas: Pastas): Promise<Curadoria> {
  return Curadoria.parse(JSON.parse(await readFile(pastas.curadoria, 'utf-8')));
}

async function lerIndiceAtual(pastas: Pastas): Promise<IndiceDoAcervo | undefined> {
  try {
    return JSON.parse(await readFile(join(pastas.saida, 'indice.json'), 'utf-8')) as IndiceDoAcervo;
  } catch {
    return undefined;
  }
}

export function relatorioEmMarkdown(
  linhas: readonly { cur: ItemDaCuradoria; gerado: ItemGerado }[],
): string {
  const saida = [
    '# Relatório do acervo',
    '',
    '| Item | Estado | Nós | A confirmar | Anomalias |',
    '|---|---|---|---|---|',
  ];
  for (const { cur, gerado } of linhas) {
    const c = gerado.construcao;
    const estado = gerado.entrada ? 'publicado' : 'bloqueado';
    const anomalias =
      Object.entries(c.anomalias)
        .map(([t, n]) => `${t}: ${String(n)}`)
        .join('; ') || '—';
    saida.push(
      `| ${cur.id} | ${estado} | ${String(c.nos)} | ${String(c.aConfirmar)} | ${anomalias} |`,
    );
  }
  const bloqueados = linhas.filter((l) => !l.gerado.entrada);
  if (bloqueados.length > 0) {
    saida.push('', '## Itens bloqueados (não vão para o site)', '');
    for (const { cur, gerado } of bloqueados) {
      saida.push(
        `### ${cur.id}`,
        '',
        ...gerado.construcao.bloqueios.slice(0, 20).map((b) => `- ${b}`),
        '',
      );
    }
  }
  return `${saida.join('\n')}\n`;
}

/**
 * Gera o acervo. Com `soId`, refaz só esse item e mantém os demais do índice atual. Item com
 * anomalia fica fora do índice (e o arquivo antigo dele sai).
 */
export async function gerarAcervo(
  pastas: Pastas,
  soId?: string,
): Promise<{ publicados: number; bloqueados: number }> {
  const curadoria = await lerCuradoria(pastas);
  const alvo = soId === undefined ? curadoria.itens : curadoria.itens.filter((i) => i.id === soId);
  if (soId !== undefined && alvo.length === 0) throw new Error(`id fora da curadoria: ${soId}`);
  const atual = await lerIndiceAtual(pastas);
  const porId = new Map<string, EntradaDoIndice>(
    soId === undefined ? [] : (atual?.itens ?? []).map((e) => [e.id, e]),
  );
  await mkdir(pastas.saida, { recursive: true });
  const linhas: { cur: ItemDaCuradoria; gerado: ItemGerado }[] = [];
  for (const cur of alvo) {
    const gerado = await gerarItem(pastas, cur);
    linhas.push({ cur, gerado });
    if (gerado.entrada && gerado.corpo !== undefined) {
      await writeFile(join(pastas.saida, `${cur.id}.json`), gerado.corpo);
      porId.set(cur.id, gerado.entrada);
    } else {
      porId.delete(cur.id);
    }
  }
  const ordem = new Map(curadoria.itens.map((i, k) => [i.id, k]));
  const itens = [...porId.values()]
    .filter((e) => ordem.has(e.id))
    .sort((a, b) => (ordem.get(a.id) as number) - (ordem.get(b.id) as number));
  const indice: IndiceDoAcervo = {
    formato: 'arretado-acervo',
    versaoIndice: 1,
    geradoEm:
      itens
        .map((e) => e.coletadoEm)
        .sort()
        .pop() ?? '2026-01-01',
    itens,
  };
  await writeFile(join(pastas.saida, 'indice.json'), JSON.stringify(indice));
  const relatorio = relatorioEmMarkdown(linhas);
  await writeFile(pastas.relatorio, relatorio);
  return {
    publicados: linhas.filter((l) => l.gerado.entrada).length,
    bloqueados: linhas.filter((l) => !l.gerado.entrada).length,
  };
}

/** Lê a pasta do acervo e confere (índice ausente = acervo ainda não gerado: sem problemas). */
export async function verificarPasta(saida: string): Promise<ProblemaDoAcervo[]> {
  let indiceJson: string;
  try {
    indiceJson = await readFile(join(saida, 'indice.json'), 'utf-8');
  } catch {
    return [];
  }
  const arquivos = new Map<string, Uint8Array>();
  for (const nome of await readdir(saida)) {
    if (nome !== 'indice.json' && nome.endsWith('.json'))
      arquivos.set(nome, await readFile(join(saida, nome)));
  }
  return verificarAcervo(indiceJson, arquivos);
}
