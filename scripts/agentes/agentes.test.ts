// @vitest-environment node
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import {
  RETENCAO_BACKUPS,
  avaliarComando,
  carimbo,
  documentoProtegido,
  fazerBackup,
  pastaDoBackup,
  relativoARaiz,
} from './guarda.mjs';

const bloqueado = (linha: string, ramoAtual = 'claude/atividade') =>
  avaliarComando(linha, { ramoAtual }).bloquear;

describe('avaliarComando: o que bloqueia', () => {
  it.each([
    'git push origin main',
    'git push -u origin main',
    'git push origin HEAD:main',
    'git push origin claude/x:refs/heads/main',
    'git push origin :main',
    'git push origin +claude/x',
    'git push --force origin claude/x',
    'git push -f origin claude/x',
    'git push -uf origin claude/x',
    'git push --mirror origin',
    'git -C /home/user/arretado push origin main',
    'npm run check && git push origin main',
    'echo ok; git push "origin" "main"',
    'sudo git push origin master',
    'gh pr merge 36 --merge',
    'gh api repos/gabrieldjcosta/arretado/pulls/36/merge -X PUT',
    'git branch -D main',
    'supabase db push',
    'supabase migration up',
    'rm -rf /',
    'rm -rf .git',
    'rm -rf ~',
    'rm -fr ..',
    'rm -r docs',
    'rm -rf docs/_backups/',
    'rm -rf /home/user',
  ])('%s', (linha) => {
    expect(bloqueado(linha)).toBe(true);
  });

  it('push sem refspec a partir do main', () => {
    expect(bloqueado('git push', 'main')).toBe(true);
    expect(bloqueado('git push origin HEAD', 'main')).toBe(true);
    expect(bloqueado('git push -u origin', 'master')).toBe(true);
  });

  it('o motivo diz o que fazer', () => {
    const decisao = avaliarComando('git push origin main');
    expect(decisao.bloquear && decisao.motivo).toMatch(/PR/);
  });
});

describe('avaliarComando: o que libera', () => {
  it.each([
    'git push -u origin claude/bold-euler-ecjm1r',
    'git push --force-with-lease origin claude/x',
    'git push',
    'git status',
    'git merge origin/main',
    'git fetch origin main',
    'git log --oneline main',
    'npm run check > saida.txt',
    'gh pr view 36',
    'gh pr create --base main',
    'rm -rf dist test-results',
    'rm -rf node_modules/.vite',
    'rm -rf /tmp/claude-0/rascunho',
    'rm saida.txt',
    'echo "git push origin main"',
    'git branch -D claude/velho',
  ])('%s', (linha) => {
    expect(bloqueado(linha)).toBe(false);
  });
});

describe('documentos protegidos', () => {
  it.each([
    ['CLAUDE.md', true],
    ['docs/proxima-sessao.md', true],
    ['docs/solucao-de-problemas.md', true],
    ['docs/planos/F2.md', true],
    ['docs/portoes/F1.md', true],
    ['docs/conferencias/lep.md', false],
    ['src/main.tsx', false],
    ['docs/_backups/x.md.gz', false],
  ])('%s → %s', (relativo, esperado) => {
    expect(documentoProtegido(relativo)).toBe(esperado);
  });

  it('relativoARaiz aceita absoluto e relativo e recusa o que está fora', () => {
    const raiz = path.resolve('/repo');
    expect(relativoARaiz(raiz, path.join(raiz, 'docs', 'glossario.md'))).toBe('docs/glossario.md');
    expect(relativoARaiz(raiz, 'docs/glossario.md')).toBe('docs/glossario.md');
    expect(relativoARaiz(raiz, path.resolve('/outro/CLAUDE.md'))).toBeUndefined();
    expect(relativoARaiz(raiz, raiz)).toBeUndefined();
  });

  it('pasta e carimbo ordenáveis', () => {
    expect(pastaDoBackup('docs/planos/F2.md')).toBe(
      path.join('docs', '_backups', 'docs__planos__F2.md'),
    );
    expect(carimbo(new Date('2026-10-07T05:47:12.345Z'))).toBe('20261007-054712');
  });
});

describe('fazerBackup', () => {
  let raiz: string;
  beforeEach(async () => {
    raiz = await mkdtemp(path.join(tmpdir(), 'arretado-backup-'));
    await mkdir(path.join(raiz, 'docs'), { recursive: true });
    await writeFile(path.join(raiz, 'docs', 'proxima-sessao.md'), '# Estado\n');
  });
  afterEach(async () => {
    await rm(raiz, { recursive: true, force: true });
  });

  const pasta = () => path.join(raiz, pastaDoBackup('docs/proxima-sessao.md'));

  it('grava gzip legível uma vez por sessão', async () => {
    const arquivo = path.join(raiz, 'docs', 'proxima-sessao.md');
    const primeiro = await fazerBackup({ raiz, arquivo, sessao: 'session_01AbCdEfGh12345678' });
    expect(primeiro).toHaveProperty('gravado');
    expect(await fazerBackup({ raiz, arquivo, sessao: 'session_01AbCdEfGh12345678' })).toEqual({
      pulado: 'ja-feito',
    });
    const [nome] = await readdir(pasta());
    expect(nome).toMatch(/^\d{8}-\d{6}--12345678\.md\.gz$/);
    expect(gunzipSync(await readFile(path.join(pasta(), nome!))).toString()).toBe('# Estado\n');
  });

  it('pula o que não é protegido, o que não existe e o que está fora', async () => {
    expect(await fazerBackup({ raiz, arquivo: 'src/a.ts' })).toEqual({ pulado: 'nao-protegido' });
    expect(await fazerBackup({ raiz, arquivo: 'docs/novo.md' })).toEqual({ pulado: 'inexistente' });
    expect(await fazerBackup({ raiz, arquivo: path.resolve(raiz, '..', 'CLAUDE.md') })).toEqual({
      pulado: 'fora',
    });
  });

  it(`mantém só os ${RETENCAO_BACKUPS} mais recentes`, async () => {
    const inicio = Date.UTC(2026, 9, 1);
    for (let i = 0; i < RETENCAO_BACKUPS + 3; i++) {
      await fazerBackup({
        raiz,
        arquivo: 'docs/proxima-sessao.md',
        sessao: `s${String(i).padStart(3, '0')}`,
        agora: new Date(inicio + i * 60_000),
      });
    }
    const nomes = (await readdir(pasta())).sort();
    expect(nomes).toHaveLength(RETENCAO_BACKUPS);
    expect(nomes[0]).toContain('--s003.');
  });
});

describe('hooks pela linha de comando (como o Claude Code os chama)', () => {
  const dir = import.meta.dirname;
  const rodar = (script: string, entrada: unknown, env: Record<string, string> = {}) =>
    spawnSync(process.execPath, [path.join(dir, script)], {
      input: JSON.stringify(entrada),
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });

  it('guarda-bash: código 2 e motivo no stderr para push no main; 0 para o resto', () => {
    const negado = rodar('guarda-bash.mjs', { tool_input: { command: 'git push origin main' } });
    expect(negado.status).toBe(2);
    expect(negado.stderr).toMatch(/Bloqueado pela trava do Arretado/);
    expect(rodar('guarda-bash.mjs', { tool_input: { command: 'npm run check' } }).status).toBe(0);
    expect(rodar('guarda-bash.mjs', 'não é chamada').status).toBe(0);
  });

  it('backup-doc: grava a cópia e nunca bloqueia', async () => {
    const raiz = await mkdtemp(path.join(tmpdir(), 'arretado-hook-'));
    try {
      await writeFile(path.join(raiz, 'CLAUDE.md'), 'x');
      const r = rodar(
        'backup-doc.mjs',
        { session_id: 'abc', tool_input: { file_path: path.join(raiz, 'CLAUDE.md') } },
        { CLAUDE_PROJECT_DIR: raiz },
      );
      expect(r.status).toBe(0);
      expect(r.stderr).toMatch(/Backup: docs\/_backups\/CLAUDE\.md\//);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('settings.json aponta para os scripts que existem', async () => {
    const raiz = path.join(dir, '..', '..');
    const settings = JSON.parse(
      await readFile(path.join(raiz, '.claude', 'settings.json'), 'utf8'),
    ) as {
      hooks: Record<string, { hooks: { command: string }[] }[]>;
    };
    const scripts = Object.values(settings.hooks)
      .flat()
      .flatMap((grupo) =>
        grupo.hooks.map((h) => /scripts\/agentes\/[\w-]+\.mjs/.exec(h.command)?.[0]),
      );
    expect(scripts).toHaveLength(3);
    for (const script of scripts) {
      expect(script).toBeDefined();
      execFileSync(process.execPath, ['--check', path.join(raiz, script!)]);
    }
  });
});
