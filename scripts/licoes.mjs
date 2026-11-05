// Antes de mexer num arquivo: o que outras threads já aprenderam sobre ele.
// Procura o nome do arquivo nos registros do projeto (soluções de problemas, desvios, decisões de
// design, entradas novas, regras do .claude e, quando existe, a memória do projeto) e nos últimos
// commits que o tocaram. Imprime só a seção de cada achado, para caber no contexto.
//
// Uso:  npm run licoes -- <arquivo> [<arquivo> ...]   (o nome basta: ajustes.css, Leitor.tsx)
//       npm run licoes                                (sem nome: os arquivos que o branch muda)
//       npm run licoes -- --tudo <arquivo>            (sem o corte de 8 achados por fonte)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FONTES = [
  'docs/solucao-de-problemas.md',
  'docs/design/desvios.md',
  'docs/design/decisoes-design.md',
  'docs/entradas',
  '.claude/rules',
];

// Nomes que se repetem em muitas pastas: procura-se pela pasta junto.
const GENERICOS = /^(index|README|types|utils|estilos|styles)\.[a-z]+$/i;

/** Termos de busca de um caminho: o nome do arquivo (ou pasta/nome, quando o nome é genérico). */
export function termosDe(caminho) {
  const partes = caminho.replaceAll('\\', '/').split('/').filter(Boolean);
  const nome = partes.at(-1) ?? caminho;
  if (GENERICOS.test(nome) && partes.length > 1) return [`${partes.at(-2)}/${nome}`];
  return [nome];
}

const limpar = (s, max = 110) => {
  const t = s
    .replace(/[|*`#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/**
 * Achados de um termo num texto, agrupados pela seção (o título acima) ou pela linha da tabela.
 * Devolve [{ linha, rotulo, mencoes }] na ordem do texto.
 */
export function achados(texto, termo) {
  const linhas = texto.split('\n');
  const grupos = new Map();
  let titulo = { linha: 0, rotulo: '(início do arquivo)' };
  linhas.forEach((l, i) => {
    if (/^#{1,6}\s/.test(l)) titulo = { linha: i + 1, rotulo: limpar(l) };
    if (!l.includes(termo)) return;
    const naTabela = l.trimStart().startsWith('|');
    const chave = naTabela ? `t${i}` : `s${titulo.linha}`;
    const atual = grupos.get(chave);
    if (atual) atual.mencoes++;
    else
      grupos.set(chave, {
        linha: naTabela ? i + 1 : titulo.linha || i + 1,
        rotulo: naTabela ? limpar(l) : titulo.rotulo,
        mencoes: 1,
      });
  });
  return [...grupos.values()];
}

function arquivosDe(raiz, alvo) {
  const abs = path.join(raiz, alvo);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [alvo];
  return readdirSync(abs, { recursive: true })
    .map((f) => path.join(alvo, String(f)).replaceAll('\\', '/'))
    .filter((f) => f.endsWith('.md') && statSync(path.join(raiz, f)).isFile());
}

/** A memória do projeto, quando a sessão a tem (nuvem do claude.ai); senão nada. */
export function pastaDaMemoria(env = process.env) {
  const candidatas = [env.ARRETADO_MEMORIA, '/tmp/claude/memory/team/silo'].filter(Boolean);
  return candidatas.find((p) => existsSync(p)) ?? null;
}

const descricao = (texto) => /^description:\s*(.+)$/m.exec(texto)?.[1] ?? '';

// git sem shell: os argumentos vão como lista, nada do nome do arquivo vira comando.
function git(args, raiz) {
  try {
    return execFileSync('git', args, {
      cwd: raiz,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

export function relatorio(caminho, { raiz, tudo = false, memoria = pastaDaMemoria() }) {
  const corte = tudo ? Infinity : 8;
  const saida = [];
  for (const termo of termosDe(caminho)) {
    saida.push(`\n■ ${termo}`);
    let algum = false;
    for (const arq of FONTES.flatMap((f) => arquivosDe(raiz, f))) {
      const lista = achados(readFileSync(path.join(raiz, arq), 'utf8'), termo);
      if (!lista.length) continue;
      algum = true;
      saida.push(`  ${arq}`);
      for (const a of lista.slice(-corte).reverse())
        saida.push(`    :${a.linha}  ${a.rotulo}${a.mencoes > 1 ? ` (${a.mencoes}×)` : ''}`);
      if (lista.length > corte) saida.push(`    … mais ${lista.length - corte} (use --tudo)`);
    }
    if (memoria) {
      const hits = readdirSync(memoria)
        .filter((f) => f.endsWith('.md') && f !== 'MEMORY.md')
        .map((f) => ({ f, t: readFileSync(path.join(memoria, f), 'utf8') }))
        .filter(({ t }) => t.includes(termo));
      if (hits.length) {
        algum = true;
        saida.push(`  memória (${memoria})`);
        for (const { f, t } of hits.slice(0, corte))
          saida.push(`    ${f}  ${limpar(descricao(t), 90)}`);
        if (hits.length > corte) saida.push(`    … mais ${hits.length - corte} (use --tudo)`);
      }
    }
    const log = git(
      ['log', '--no-merges', '-n', '5', '--format=%h %as %s', '--', `*${termo}`],
      raiz,
    ).trim();
    if (log) {
      algum = true;
      saida.push('  últimos commits');
      for (const l of log.split('\n')) saida.push(`    ${limpar(l, 100)}`);
    }
    if (!algum) saida.push('  nada registrado');
  }
  return saida.join('\n');
}

function principal() {
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const tudo = args.includes('--tudo');
  let alvos = args.filter((a) => a !== '--tudo');
  if (!alvos.length) {
    const base = git(['merge-base', 'HEAD', 'origin/integracao'], raiz).trim() || 'HEAD';
    alvos = [
      ...new Set(
        [
          git(['diff', '--name-only', base], raiz),
          git(['ls-files', '-o', '--exclude-standard'], raiz),
        ]
          .join('\n')
          .split('\n')
          .filter(Boolean),
      ),
    ];
    if (!alvos.length) {
      console.log('Nada mudou neste branch. Passe os arquivos: npm run licoes -- Leitor.tsx');
      return;
    }
  }
  console.log(
    `Lições registradas (${alvos.length} arquivo(s)). Leia as seções que importam antes de editar.`,
  );
  for (const a of alvos) console.log(relatorio(a, { raiz, tudo }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  principal();
