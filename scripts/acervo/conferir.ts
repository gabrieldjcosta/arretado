// Conferência semanal das fontes oficiais do acervo (sem LLM, sem dependência): baixa a página do
// Planalto de cada norma, tira scripts, menus e marcas, e compara o hash do texto com o da última
// conferência. O Planalto marca cada alteração no próprio texto ("Redação dada pela Lei…"), então
// texto novo = a lei foi emendada. Não atualiza o acervo: só aponta quais normas pedem a regeração
// (`npm run acervo:gerar <id>`, com versão maior na curadoria) e deixa a revisão a um humano.
//
// Uso: `node scripts/acervo/conferir.ts` (Node 22.18+). Variáveis: CONFERIR_SO=id1,id2 (só estes),
// CONFERIR_ATRASO_MS (entre requisições, padrão 1000), CONFERIR_SECO=1 (não grava arquivo).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

export interface BaseDeConferencia {
  /** id do acervo → última conferência. */
  [id: string]: { hash: string; conferidoEm: string };
}

export interface EntradaConferida {
  id: string;
  titulo: string;
  urlOficial: string;
}

export type Veredito =
  | { id: string; estado: 'igual' }
  | { id: string; estado: 'base_nova'; hash: string }
  | { id: string; estado: 'mudou'; hash: string; anterior: string }
  | { id: string; estado: 'instavel' }
  | { id: string; estado: 'falhou'; motivo: string };

const ENTIDADES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/** Texto comparável da página: sem scripts, estilos, comentários nem marcação; espaços colapsados. */
export function normalizarPagina(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, nome: string) => ENTIDADES[nome.toLowerCase()] ?? m)
    .replace(/[\s ]+/g, ' ')
    .trim();
}

export function hashDoTexto(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** UTF-8 quando válido; senão Windows-1252, a codificação das páginas antigas do Planalto. */
export function decodificar(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Compara a leitura atual com a base. `segunda` é uma segunda leitura, feita só quando a primeira
 * difere da base: se as duas leituras diferem entre si, a página é instável (contador, relógio) e
 * não se acusa mudança.
 */
export function julgar(
  id: string,
  base: BaseDeConferencia,
  hash: string,
  segunda?: () => Promise<string>,
): Promise<Veredito> {
  const antes = base[id]?.hash;
  if (antes === undefined) return Promise.resolve({ id, estado: 'base_nova', hash });
  if (antes === hash) return Promise.resolve({ id, estado: 'igual' });
  return (async (): Promise<Veredito> => {
    if (segunda && (await segunda()) !== hash) return { id, estado: 'instavel' };
    return { id, estado: 'mudou', hash, anterior: antes };
  })();
}

/** Só https no Planalto: o endereço vem do índice do acervo, mas a conferência não confia nele. */
export function enderecoPermitido(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.host === 'www.planalto.gov.br';
  } catch {
    return false;
  }
}

async function ler(url: string): Promise<string> {
  if (!enderecoPermitido(url)) throw new Error('endereço fora do Planalto');
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'arretado-conferencia/1 (+https://github.com/gabrieldjcosta/arretado)',
    },
    signal: AbortSignal.timeout(15_000),
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`HTTP ${String(r.status)}`);
  return hashDoTexto(normalizarPagina(decodificar(new Uint8Array(await r.arrayBuffer()))));
}

const dormir = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

async function lerComTentativas(url: string): Promise<string> {
  let ultima: unknown;
  for (let t = 1; t <= 2; t++) {
    try {
      return await ler(url);
    } catch (e) {
      ultima = e;
      await dormir(2000 * t);
    }
  }
  throw ultima instanceof Error ? ultima : new Error('falha');
}

/** Normas do índice cuja fonte é o Planalto (as de outros sites não têm página estável). */
export function entradasDoPlanalto(indiceJson: string): EntradaConferida[] {
  const indice = JSON.parse(indiceJson) as {
    itens: { id: string; tipo: string; titulo: string; urlOficial?: string }[];
  };
  return indice.itens.flatMap((i) => {
    if (i.tipo !== 'norma' || !i.urlOficial) return [];
    try {
      return new URL(i.urlOficial).host === 'www.planalto.gov.br'
        ? [{ id: i.id, titulo: i.titulo, urlOficial: i.urlOficial }]
        : [];
    } catch {
      return [];
    }
  });
}

export function relatorio(
  veredictos: readonly Veredito[],
  entradas: readonly EntradaConferida[],
  hoje: string,
): string {
  const titulo = new Map(entradas.map((e) => [e.id, e]));
  const linha = (v: Veredito) => {
    const e = titulo.get(v.id);
    return `- \`${v.id}\`: ${e?.titulo ?? v.id} (${e?.urlOficial ?? ''})`;
  };
  const de = (estado: Veredito['estado']) => veredictos.filter((v) => v.estado === estado);
  const mudou = de('mudou');
  const novas = de('base_nova');
  const instaveis = de('instavel');
  const falhas = veredictos.flatMap((v) =>
    v.estado === 'falhou' ? [`${linha(v)} — ${v.motivo}`] : [],
  );
  const partes = [`# Conferência das fontes oficiais — ${hoje}`, ''];
  partes.push(
    mudou.length
      ? `## Texto novo no Planalto (${String(mudou.length)})\n\nCada uma pede regeração do item (\`npm run acervo:gerar <id>\`, \`versao\` maior na curadoria) e revisão antes do merge. Nada foi alterado no acervo.\n\n${mudou.map(linha).join('\n')}`
      : '## Nenhuma norma com texto novo',
  );
  if (novas.length)
    partes.push(
      `\n## Entraram na base nesta conferência (${String(novas.length)})\n\n${novas.map(linha).join('\n')}`,
    );
  if (instaveis.length)
    partes.push(
      `\n## Páginas instáveis, sem acusar mudança (${String(instaveis.length)})\n\n${instaveis.map(linha).join('\n')}`,
    );
  if (falhas.length)
    partes.push(`\n## Não consegui ler (${String(falhas.length)})\n\n${falhas.join('\n')}`);
  return partes.join('\n') + '\n';
}

async function principal(): Promise<void> {
  const raiz = process.env['ACERVO_RAIZ'] ?? process.cwd();
  const caminhoBase = `${raiz}/acervo/fontes-hash.json`;
  let base: BaseDeConferencia = {};
  try {
    base = JSON.parse(readFileSync(caminhoBase, 'utf8')) as BaseDeConferencia;
  } catch {
    /* primeira conferência: sem base */
  }
  const so = process.env['CONFERIR_SO']?.split(',').filter(Boolean);
  const todas = entradasDoPlanalto(readFileSync(`${raiz}/public/acervo/indice.json`, 'utf8'));
  const entradas = so ? todas.filter((e) => so.includes(e.id)) : todas;
  const atraso = Number(process.env['CONFERIR_ATRASO_MS'] ?? 1000);
  const hoje = new Date().toISOString().slice(0, 10);
  const veredictos: Veredito[] = [];
  const novaBase: BaseDeConferencia = { ...base };
  const prazo = Date.now() + Number(process.env['CONFERIR_PRAZO_MIN'] ?? 18) * 60_000;
  let seguidas = 0;
  let interrompida = '';
  for (const e of entradas) {
    if (Date.now() > prazo) {
      interrompida = 'prazo de 18 minutos esgotado';
      break;
    }
    if (seguidas >= 8) {
      interrompida = '8 páginas seguidas sem abrir (bloqueio do Planalto?)';
      break;
    }
    try {
      const hash = await lerComTentativas(e.urlOficial);
      const v = await julgar(e.id, base, hash, () => lerComTentativas(e.urlOficial));
      veredictos.push(v);
      seguidas = 0;
      console.log(`${e.id}: ${v.estado}`);
      if (v.estado === 'base_nova' || v.estado === 'mudou')
        novaBase[e.id] = { hash, conferidoEm: hoje };
    } catch (erro) {
      seguidas++;
      console.log(
        `${e.id}: falhou (${erro instanceof Error ? erro.message.replace(/[^\w .:/-]/g, '').slice(0, 60) : 'falha'})`,
      );
      veredictos.push({
        id: e.id,
        estado: 'falhou',
        motivo:
          erro instanceof Error ? erro.message.replace(/[^\w .:/-]/g, '').slice(0, 120) : 'falha',
      });
    }
    await dormir(atraso);
  }
  if (interrompida) console.error(`Conferência interrompida: ${interrompida}.`);
  const falhou = veredictos.filter((v) => v.estado === 'falhou').length;
  const texto = relatorio(veredictos, entradas, hoje);
  console.log(texto);
  if (process.env['CONFERIR_SECO'] !== '1') {
    const ordenada = Object.fromEntries(
      Object.entries(novaBase).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(caminhoBase, JSON.stringify(ordenada, null, 2) + '\n');
    writeFileSync(`${raiz}/acervo/conferencia.md`, texto);
  }
  // Mais da metade falhou: provável bloqueio do Planalto ao servidor; que o job fique vermelho.
  if (interrompida || (entradas.length > 0 && falhou * 2 > entradas.length)) {
    console.error('Mais da metade das páginas não abriu (bloqueio do Planalto?).');
    process.exitCode = 1;
  }
}

if (process.argv[1] && /conferir\.ts$/.test(process.argv[1])) {
  void principal();
}
