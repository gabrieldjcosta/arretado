#!/usr/bin/env node
// Despacha um contrato para um worker do Orca contornando as duas falhas vistas
// em 15 e 16/10/2026: o cliente demora a abrir e o texto se perde
// (terminal_handle_stale), ou o texto fica parado no campo sem o Enter
// (turn_start_unobserved). Também cobre o dsh-tui, que não é agente cadastrado
// no Orca (agent_unconfigured).
//
// Uso:
//   node scripts/orca-despachar.mjs --agent antigravity --contrato docs/planos/tarefas/X.md \
//     --branch claude/x --nome x --titulo "X" [--run run_...] [--base origin/integracao]
//   node scripts/orca-despachar.mjs --agent antigravity --task task_... --nome x   (tarefa já criada)
// Agentes: antigravity, claude, codex, opencode (cadastrados) e dsh-tui (via terminal).
import { spawnSync } from 'node:child_process';
import { setTimeout as esperar } from 'node:timers/promises';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
}
// Sem estes, o Orca abre um worker com tarefa vazia numa worktree "undefined" (aconteceu em 17/10/2026).
if (!args.agent || !args.nome || !(args.task || (args.contrato && args.branch && args.titulo))) {
  console.error(
    'uso: --agent <id> --nome <worktree> e (--task <id> | --contrato <arq> --branch <b> --titulo <t>)',
  );
  process.exit(2);
}
const run = args.run ?? 'run_02de16405a67';
const base = args.base ?? 'origin/integracao';

function orca(...a) {
  const r = spawnSync('orca', a, { encoding: 'utf8', windowsHide: true });
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    json = null;
  }
  return { ok: r.status === 0, saida, json };
}

function acharTodos(no, teste, achados = []) {
  if (no && typeof no === 'object') {
    if (teste(no)) achados.push(no);
    for (const v of Object.values(no)) acharTodos(v, teste, achados);
  }
  return achados;
}

const terminalDoAgente = (json, saida) =>
  acharTodos(json, (o) => o.kind === 'terminal' && o.role === 'agent')[0]?.id ??
  /"role":"agent","action":"created","id":"(term_[\w-]+)"/.exec(saida)?.[1];
const despachoDe = (saida) => /ctx_[0-9a-f]+/.exec(saida)?.[0];
const tarefaDe = (saida) => /task_[0-9a-f]+/.exec(saida)?.[0];

const OCUPADO =
  /esc to interrupt|esc to cancel|Running|Thinking|Analyzing|Reading|Working|[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣾⣽⣻⢿⡿⣟⣯⣷]/;

// O `tui-idle` do Orca dispara quando a tela desenha, mas o dsh-tui ainda carrega
// ("Starting DSH…", "Checking…") por até ~2 min e descarta o que chega nesse meio-tempo.
async function esperarPronto(term) {
  orca('terminal', 'wait', '--terminal', term, '--for', 'tui-idle', '--timeout-ms', '120000');
  for (let i = 0; i < 60; i++) {
    const tela = orca('terminal', 'read', '--terminal', term, '--screen').saida.slice(-1500);
    if (!/Starting|Checking…|Loading|Connecting/.test(tela) && /❯|>\s*$/m.test(tela)) return;
    await esperar(3000);
  }
}

// Confere que o agente começou a trabalhar; se o texto ficou no campo, manda o Enter (uma vez).
async function garantirEnvio(term, despacho) {
  if (!term.startsWith('term_')) {
    // Sessão estruturada (Claude, Codex): não há tela; o sinal é uma fala do agente na transcrição.
    for (let i = 0; i < 12; i++) {
      await esperar(5000);
      const t = orca(
        'orchestration',
        'worker-read',
        '--dispatch',
        despacho,
        '--source',
        'transcript',
      ).saida;
      if (/\[assistant\]/.test(t)) return `trabalhando (sessão estruturada ${term})`;
    }
    return `SEM SINAL em 60 s; orca orchestration worker-read --dispatch ${despacho}`;
  }
  let enterMandado = false;
  for (let i = 0; i < 12; i++) {
    await esperar(5000);
    const tela = orca('terminal', 'read', '--terminal', term, '--screen').saida.slice(-1500);
    if (OCUPADO.test(tela)) return `trabalhando (${term})`;
    if (!enterMandado && i >= 1) {
      orca('terminal', 'send', '--terminal', term, '--enter');
      enterMandado = true;
    }
  }
  return `SEM SINAL de trabalho em 60 s; olhar a aba ${term}`;
}

function textoDoDespacho() {
  if (!args.contrato) return null;
  return [
    `Contrato: ${args.contrato}. Siga-o por inteiro, com AGENTS.md.`,
    `Branch: ${args.branch} a partir de ${base} (git branch -m ${args.branch} antes do primeiro commit).`,
    'Maquina de 6 GB: so os testes dos arquivos tocados (npx vitest run --project unidade --maxWorkers=2 <arquivos>),',
    'npm run lint, npm run typecheck, npm run format:check e E2E com --workers=1; nada de npm run check inteiro; commits wip:.',
    'Ao fim: push, PR para integracao (gh pr create --base integracao), sem auto-merge e sem mesclar;',
    'relatorio no worker_done com arquivos, comandos e saida, SHA e link do PR.',
  ].join(' ');
}

async function viaWorkerStart() {
  const alvo = args.task
    ? ['--task', args.task]
    : ['--spec', textoDoDespacho(), '--task-title', args.titulo];
  const extra = args.model ? ['--model', args.model, '--effort', args.effort ?? 'medium'] : [];
  let r = orca(
    'orchestration',
    'worker-start',
    ...alvo,
    '--agent',
    args.agent,
    '--worktree',
    'new-top-level',
    '--name',
    args.nome,
    '--base-branch',
    base,
    '--run',
    run,
    ...extra,
    '--json',
  );
  const tarefa = args.task ?? tarefaDe(r.saida);
  const despacho = despachoDe(r.saida);
  const term = terminalDoAgente(r.json, r.saida);
  if (r.ok && !term) return `pronto (sessão estruturada) ${tarefa} ${despacho}`;
  if (r.ok) return `${tarefa} ${despacho}: ${await garantirEnvio(term, despacho)}`;
  if (/turn_start_unobserved|outcome_unknown|turn_unobserved/.test(r.saida) && term) {
    return `${tarefa} ${despacho}: ${await garantirEnvio(term, despacho)}`;
  }
  if (/terminal_handle_stale/.test(r.saida) && term) {
    // O cliente abriu depois do prazo: espera ficar pronto e reaproveita o terminal.
    await esperarPronto(term);
    r = orca(
      'orchestration',
      'worker-start',
      '--task',
      tarefa,
      '--retry-of',
      despacho,
      '--terminal',
      term,
      '--worktree',
      `name:${args.nome}`,
      '--run',
      run,
      '--json',
    );
    return `${tarefa} ${despachoDe(r.saida)} (2ª tentativa): ${await garantirEnvio(term, despachoDe(r.saida))}`;
  }
  return `FALHOU: ${r.saida.slice(0, 800)}`;
}

async function viaTerminal() {
  // dsh-tui: worktree + terminal à mão, espera o cliente ficar pronto e injeta com o preâmbulo do Orca.
  let tarefa = args.task;
  if (!tarefa) {
    tarefa = tarefaDe(
      orca(
        'orchestration',
        'task-create',
        '--spec',
        textoDoDespacho(),
        '--task-title',
        args.titulo,
        '--run',
        run,
      ).saida,
    );
  }
  const wt = orca(
    'worktree',
    'create',
    '--name',
    args.nome,
    '--base-branch',
    base,
    '--setup',
    'run',
    '--no-parent',
    '--json',
  );
  if (!wt.ok && !/already exists/i.test(wt.saida))
    return `FALHOU worktree: ${wt.saida.slice(0, 500)}`;
  const t = orca(
    'terminal',
    'create',
    '--worktree',
    `name:${args.nome}`,
    '--command',
    args.agent,
    '--json',
  );
  const term = /term_[\w-]+/.exec(t.saida)?.[0];
  if (!term) return `FALHOU terminal: ${t.saida.slice(0, 500)}`;
  await esperarPronto(term);
  const d = orca(
    'orchestration',
    'dispatch',
    '--task',
    tarefa,
    '--to',
    term,
    '--inject',
    '--run',
    run,
    '--json',
  );
  return `${tarefa} ${despachoDe(d.saida)} (sem supervisão): ${await garantirEnvio(term, despachoDe(d.saida))}`;
}

const registrados = new Set([
  'antigravity',
  'claude',
  'codex',
  'opencode',
  'opencode2',
  'hermes',
  'cursor',
]);
console.log(registrados.has(args.agent) ? await viaWorkerStart() : await viaTerminal());
