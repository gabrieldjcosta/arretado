// Travas do swarm de agentes (T19): regras puras usadas pelos hooks do Claude Code em
// `.claude/settings.json`. Os hooks são `guarda-bash.mjs` (PreToolUse em Bash) e
// `backup-doc.mjs` (PreToolUse em Edit e Write). Aqui só decisão e caminhos, sem efeito
// colateral além do que `fazerBackup` grava; os testes estão em `agentes.test.ts`.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Ramos que só o Gabriel altera, por merge de PR. */
export const RAMOS_PROTEGIDOS = ['main', 'master'];

/** Cópias guardadas por documento; a mais antiga sai quando passa disso. */
export const RETENCAO_BACKUPS = 30;

export const PASTA_BACKUPS = join('docs', '_backups');

/**
 * Documentos de que se guarda cópia antes da primeira modificação de cada sessão
 * (caminhos relativos à raiz, com `/`).
 * @type {RegExp[]}
 */
const DOCUMENTOS_PROTEGIDOS = [
  /^CLAUDE\.md$/,
  /^README\.md$/,
  /^docs\/[^/]+\.md$/,
  /^docs\/planos\/[^/]+\.md$/,
  /^docs\/portoes\/[^/]+\.md$/,
];

/**
 * @typedef {{ bloquear: false } | { bloquear: true, motivo: string }} Decisao
 */

/** @type {Decisao} */
const LIBERA = { bloquear: false };

/** @param {string} motivo @returns {Decisao} */
const bloqueia = (motivo) => ({ bloquear: true, motivo });

/**
 * Divide uma linha de comando em comandos simples (`&&`, `||`, `;`, `|`, quebra de linha)
 * e cada um em palavras, tirando aspas. Não é um parser de shell: basta para reconhecer
 * `git push`, `gh pr merge` e `rm -rf` mesmo encadeados.
 * @param {string} linha
 * @returns {string[][]}
 */
export function comandosSimples(linha) {
  return linha
    .split(/&&|\|\||[;|\n]/)
    .map((parte) =>
      parte
        .trim()
        .split(/\s+/)
        .map((palavra) => palavra.replace(/^['"]|['"]$/g, ''))
        .filter(Boolean),
    )
    .filter((palavras) => palavras.length > 0);
}

/**
 * Tira prefixos que não mudam o comando (`sudo`, `env X=1`, `command`, atribuições).
 * @param {string[]} palavras
 */
function semPrefixos(palavras) {
  let i = 0;
  while (i < palavras.length) {
    const p = palavras[i];
    if (p === 'sudo' || p === 'command' || p === 'env' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(p)) {
      i += 1;
      continue;
    }
    break;
  }
  return palavras.slice(i);
}

/**
 * Pula as opções globais do git (`-C dir`, `-c chave=valor`, `--no-pager`).
 * @param {string[]} args argumentos depois de `git`
 */
function subcomandoGit(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    i += args[i] === '-C' || args[i] === '-c' ? 2 : 1;
  }
  return { sub: args[i], resto: args.slice(i + 1) };
}

/**
 * O ramo de destino de um refspec (`HEAD:main` → `main`, `+main` → `main`,
 * `refs/heads/main` → `main`, `:main` → `main`).
 * @param {string} refspec
 */
function destinoDoRefspec(refspec) {
  const semMais = refspec.replace(/^\+/, '');
  const destino = semMais.includes(':') ? semMais.slice(semMais.indexOf(':') + 1) : semMais;
  return destino.replace(/^refs\/heads\//, '');
}

/**
 * @param {string[]} resto argumentos depois de `git push`
 * @param {string | undefined} ramoAtual
 * @returns {Decisao}
 */
function avaliarPush(resto, ramoAtual) {
  const opcoes = resto.filter((a) => a.startsWith('-'));
  const posicionais = resto.filter((a) => !a.startsWith('-'));
  if (opcoes.some((o) => o === '--force' || o === '-f' || /^-[a-z]*f[a-z]*$/.test(o))) {
    return bloqueia(
      'push forçado (--force/-f) é proibido; use --force-with-lease só no próprio ramo claude/*.',
    );
  }
  if (opcoes.includes('--mirror') || opcoes.includes('--all')) {
    return bloqueia('push --mirror/--all alcança o main; empurre só o ramo da atividade.');
  }
  const refspecs = posicionais.slice(1);
  if (refspecs.some((r) => r.startsWith('+'))) {
    return bloqueia('refspec com "+" é push forçado; proibido.');
  }
  if (refspecs.some((r) => RAMOS_PROTEGIDOS.includes(destinoDoRefspec(r)))) {
    return bloqueia(
      'push para o main é proibido: abra PR; o merge é do Gabriel (CLAUDE.md › Git).',
    );
  }
  const semRefspecExplicito = refspecs.length === 0 || refspecs.every((r) => r === 'HEAD');
  if (semRefspecExplicito && ramoAtual !== undefined && RAMOS_PROTEGIDOS.includes(ramoAtual)) {
    return bloqueia(
      `push a partir do ramo ${ramoAtual} é proibido: crie um ramo claude/* e abra PR.`,
    );
  }
  return LIBERA;
}

/**
 * Alvos de `rm -r` que apagariam o repositório inteiro, o histórico ou fora dele.
 * @param {string} alvo
 */
function alvoPerigoso(alvo) {
  const limpo = alvo.replace(/\/+$/, '');
  return (
    limpo === '' ||
    limpo === '/' ||
    limpo === '.' ||
    limpo === '*' ||
    limpo === '~' ||
    limpo.startsWith('~/') ||
    limpo.startsWith('$HOME') ||
    limpo === '..' ||
    limpo.startsWith('../') ||
    limpo === '.git' ||
    limpo.endsWith('/.git') ||
    limpo === 'docs' ||
    limpo === 'docs/_backups' ||
    limpo === 'src' ||
    limpo === 'corpus' ||
    (limpo.startsWith('/') && !limpo.startsWith('/tmp/'))
  );
}

/**
 * Decide se um comando Bash pode rodar.
 * @param {string} linha o comando inteiro, como o Claude Code o passa
 * @param {{ ramoAtual?: string }} [contexto]
 * @returns {Decisao}
 */
export function avaliarComando(linha, contexto = {}) {
  for (const bruto of comandosSimples(linha)) {
    const palavras = semPrefixos(bruto);
    const [programa, ...args] = palavras;
    if (programa === 'git') {
      const { sub, resto } = subcomandoGit(args);
      if (sub === 'push') {
        const decisao = avaliarPush(resto, contexto.ramoAtual);
        if (decisao.bloquear) return decisao;
      }
      if (sub === 'branch' && resto.some((a) => a === '-D' || a === '-d' || a === '--delete')) {
        if (resto.some((a) => RAMOS_PROTEGIDOS.includes(a))) {
          return bloqueia('apagar o ramo main é proibido.');
        }
      }
    }
    if (programa === 'gh') {
      const [area, acao] = args;
      if (area === 'pr' && acao === 'merge') {
        return bloqueia('merge de PR é do Gabriel (CLAUDE.md › Git); nenhum agente faz merge.');
      }
      if (area === 'api' && args.some((a) => /\/merges?\b|\/pulls\/\d+\/merge/.test(a))) {
        return bloqueia('merge pela API do GitHub é proibido; o merge é do Gabriel.');
      }
    }
    if (programa === 'supabase' && ['db', 'migration', 'projects'].includes(args[0] ?? '')) {
      return bloqueia(
        'comando do Supabase que altera o projeto remoto: só com o Gabriel (subida de esquema).',
      );
    }
    if (programa === 'rm') {
      const opcoes = args.filter((a) => a.startsWith('-'));
      const recursivo = opcoes.some((o) => o === '--recursive' || /^-[a-zA-Z]*[rR]/.test(o));
      const alvos = args.filter((a) => !a.startsWith('-'));
      if (recursivo && alvos.some(alvoPerigoso)) {
        return bloqueia(
          `rm recursivo em alvo protegido (${alvos.join(' ')}); apague só arquivos de build ou temporários.`,
        );
      }
    }
  }
  return LIBERA;
}

/**
 * Caminho relativo à raiz, com `/`, ou `undefined` se estiver fora dela.
 * @param {string} raiz
 * @param {string} caminho absoluto ou relativo à raiz
 */
export function relativoARaiz(raiz, caminho) {
  const rel = relative(resolve(raiz), resolve(raiz, caminho));
  if (rel.startsWith('..') || rel === '' || isAbsolute(rel)) return undefined;
  return rel.split(sep).join('/');
}

/** @param {string} relativo caminho relativo à raiz, com `/` */
export function documentoProtegido(relativo) {
  return DOCUMENTOS_PROTEGIDOS.some((padrao) => padrao.test(relativo));
}

/** `docs/planos/F2.md` → `docs__planos__F2.md` (uma pasta por documento). */
export function pastaDoBackup(relativo) {
  return join(PASTA_BACKUPS, relativo.split('/').join('__'));
}

/** @param {Date} data → `20261007-054712` em UTC (nome ordenável). */
export function carimbo(data) {
  return data.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

/** @param {string | undefined} sessao */
function rotuloSessao(sessao) {
  const limpo = (sessao ?? 'manual').replace(/[^A-Za-z0-9]/g, '');
  return limpo.slice(-8) || 'manual';
}

/**
 * Guarda cópia comprimida de um documento protegido, uma vez por sessão, antes de ele
 * ser modificado; mantém as `RETENCAO_BACKUPS` mais recentes.
 * @param {{ raiz: string, arquivo: string, sessao?: string, agora?: Date }} opcoes
 * @returns {Promise<{ gravado: string } | { pulado: 'fora' | 'nao-protegido' | 'inexistente' | 'ja-feito' }>}
 */
export async function fazerBackup({ raiz, arquivo, sessao, agora = new Date() }) {
  const relativo = relativoARaiz(raiz, arquivo);
  if (relativo === undefined) return { pulado: 'fora' };
  if (!documentoProtegido(relativo)) return { pulado: 'nao-protegido' };
  let conteudo;
  try {
    conteudo = await readFile(join(raiz, relativo));
  } catch {
    return { pulado: 'inexistente' };
  }
  const pasta = join(raiz, pastaDoBackup(relativo));
  await mkdir(pasta, { recursive: true });
  const rotulo = rotuloSessao(sessao);
  const existentes = (await readdir(pasta)).filter((n) => n.endsWith('.gz')).sort();
  if (existentes.some((n) => n.includes(`--${rotulo}.`))) return { pulado: 'ja-feito' };
  const nome = `${carimbo(agora)}--${rotulo}.${basename(relativo).split('.').pop()}.gz`;
  await writeFile(join(pasta, nome), gzipSync(conteudo, { level: 9 }));
  const todos = [...existentes, nome].sort();
  for (const antigo of todos.slice(0, Math.max(0, todos.length - RETENCAO_BACKUPS))) {
    await rm(join(pasta, antigo));
  }
  return { gravado: join(pastaDoBackup(relativo), nome).split(sep).join('/') };
}
